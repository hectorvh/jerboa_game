# Jerboa's Journey — Technical Specification (v0.1, mock prototype)

**Project:** Jerboa's Journey — a gamified spatial-language data-collection instrument
**Context:** SCALA (Spatial Communication and Ageing across Languages), Marie Skłodowska-Curie Doctoral Network — University of Münster (ifgi), PI Dr. Christian Kray
**Purpose of this document:** hand-off spec for the developer building the first mock version. It defines screens, data model, tech stack, and visual style, and flags decisions still open.

> **Framing that drives everything below:** this is a *research instrument dressed as a game*, not a game. Every gameplay choice must be checked for whether it introduces a confound in participant response behaviour. Where a "fun game" decision and a "clean data" decision conflict, this spec favours clean data and flags the tension.

---

## 1. Scope of the mock version

The mock delivers the full participant flow end-to-end with **one language (English) live**, the onboarding/consent screens functional, and the game home screen presented as a static-but-navigable scene. Mini-games (the actual spatial-relation trials) are **out of scope for this mock** but the data model and architecture are built to accept them without rework.

Deliver a **working vertical slice** — every screen reachable, data persisting to the database, consent gating enforced — before any visual polish beyond what the mockups already show.

---

## 2. Technology stack

Chosen for: cross-device responsiveness, scalability, and a clean path to a later native mobile app.

| Layer | Choice | Reason |
|---|---|---|
| Framework | **React** + **TypeScript** | Component model fits the screen-by-screen flow; TS catches schema mismatches early; largest ecosystem for the mobile path below. |
| Build tool | **Vite** | Fast dev server, simple production builds. |
| Styling | **Tailwind CSS** + CSS variables for the design tokens (§7) | Utility classes for speed; tokens keep colour/typography consistent and themeable per environment (desert now, arctic/forest later). |
| Routing | **React Router** | Screen navigation, back/forward, and guarded routes (consent gate). |
| Forms & validation | **React Hook Form** + **Zod** | Zod schema doubles as the single source of truth for validation *and* TypeScript types. |
| State | React Context (or Zustand if it grows) for the in-progress participant session | Onboarding answers must survive navigation between screens 1→4 and be editable on "Back" without creating a new record (requirement 1.2.C). |
| i18n | **react-i18next** | Required from the start — SCALA is explicitly multi-language. All UI strings externalised to locale files even though only `en` is populated now. See §6. |
| Backend / DB | **Supabase** (PostgreSQL, accessed via SQL) | Per your requirement. Abstracted behind a thin data-access layer (§4.4) so it can be swapped later. |
| Localisation of options | `i18n-iso-countries` for the country list; a maintained language list (e.g. from CLDR / `@cospired/i18n-iso-languages`) | Avoids hand-maintaining 190+ countries and hundreds of languages. |

**Mobile path:** building in React now means a later mobile app can reuse most logic via **React Native** (or wrap the web app in **Capacitor** for a faster, lower-effort route). Keep all business logic and the data-access layer free of DOM/browser-only APIs so it ports cleanly. **Decide the mobile strategy before writing much UI** — Capacitor lets you reuse the web UI almost verbatim; React Native gives a truer native feel but means rebuilding the UI layer.

---

## 3. Screen-by-screen specification

Navigation model: a linear flow `1 → 2 → 3 → 4`, with **Back** allowed at every step and all previously entered data preserved and editable (no new DB record on re-entry). The consent gate on screen 3 blocks forward navigation until satisfied.

### Screen 1 — Welcome & participant onboarding

Two sub-states within a single screen (per your sketch 1.1 → 1.2):

**1.1 Language selection**
- A single-select **Language** dropdown listing a wide range of languages.
- **English is the only selectable option** in the mock. All other languages are rendered but **disabled** (visible, greyed, non-selectable) — signalling future support.
- Selecting the language reveals (or advances to) the participant-details form below.

**1.2 Participant details form**

| Field | Control | Values / rules |
|---|---|---|
| Name | Text input | Free string. **See §5 privacy flag — reconsider collecting a real name.** |
| Age | Single-select dropdown | Ranges: `18–30, 30–40, 40–50, 50–60, 60–70, 70–80, 80+`. **Fix the boundary overlap — see below.** |
| Gender | Single-select dropdown | `Male`, `Female`, `Other` → selecting *Other* reveals a free-text "please specify" field. |
| Country | Single-select dropdown | All UN member states (use the ISO library, don't hand-type). Searchable/type-ahead recommended given the length. |
| Languages spoken | **Multi-select**, each with a fluency level | User adds one or more languages; for each, a fluency dropdown: `Native, Fluent, Intermediate, Beginner`. Stored as a list of `{language, fluency}` pairs. |

- **1.2.A** — On submit, persist to the `users` table (§4.1).
- **1.2.B** — **Continue** → Screen 2; **Back** → Screen 1.1.
- **1.2.C** — On return from Screen 2, the form is **pre-filled** with saved answers and editable **in place** — editing updates the existing `user` record, it does **not** create a new one. (Implementation: keep the `user_id` in session state after first insert; subsequent saves are `UPDATE`s.)

> **Age-range boundary bug:** the ranges as written overlap at every edge — someone who is 30 fits both `18–30` and `30–40`. Redefine as non-overlapping buckets, e.g. `18–29, 30–39, 40–49, 50–59, 60–69, 70–79, 80+`. Given SCALA's **ageing** focus, the exact age banding is scientifically meaningful and should be agreed with the research team, not chosen arbitrarily. Also note the floor is 18 — confirm whether under-18s are excluded by design (this has ethics/consent implications).

### Screen 2 — Information page

- Displays a temporary description of the game/study (placeholder text now; final copy comes from the research team).
- **Continue** → Screen 3; **Back** → Screen 1.2 (with saved data shown).
- This screen is a natural home for the **participant information sheet** that ethics boards require. Treat the placeholder as a stand-in for that formal document.

### Screen 3 — Ethical approval / consent

- A temporary set of consent statements, each with a **checkbox**. Your prototype PNG shows the intended content: participation is voluntary, data is confidential/anonymised, right to withdraw at any time, results used for research only.
- **Forward navigation is blocked until the required checkbox(es) are ticked.** The prototype shows a single combined "I have read and understood… I agree to participate" checkbox plus **I Agree** / **Decline** buttons.
- **Continue / I Agree** → Screen 4; **Back / Decline** → Screen 2.
- **Critical: consent must be recorded, not just gated.** Store a consent record (who, which consent version, timestamp) — see §4.3 discussion. "Decline" must have a defined behaviour (e.g. end the session, do not collect further data). Agree the exact consent wording and the granularity (one checkbox vs. several) with the research team and the relevant ethics committee(s) — SCALA spans Germany, UK, Italy, Denmark and Norway, so requirements may differ by jurisdiction.

### Screen 4 — Game home ("Jerboa's Journey")

- Visually rich desert scene (style in §7): a curved path from a **start point** (the burrow/cactus) to a **goal** (the oasis), with **landmark nodes** along the path. Each landmark is a mini-game the participant enters when the Jerboa character reaches it.
- The prototype shows a **5-node world map** and a separate **title/menu screen** (Start Playing / Settings / About the Experiment / Exit). Decide whether the title menu is a *separate* screen before the map or the same screen — recommend a distinct **title screen** → **map screen** to match the prototype.
- **4.2 Config button** — a small settings icon linking back to Screen 1.2 (edit participant details, no new record).
- **4.3 Data capture** — every interaction the game collects writes to the `data` table (§4.2), each row linked to `user_id`, with a `timestamp` and the participant's `ip` (see §5 for the IP/GDPR caveat).
- **"Simple 3D" effect:** interpret as *2.5D* — a flat illustration with layered depth (parallax, soft drop shadows, isometric-style map tiles as in the prototype), **not** a real 3D engine. Real WebGL 3D is out of scope and risks performance problems on the older-adult participants' devices. See §7.4.

---

## 4. Data model (PostgreSQL / Supabase, SQL)

Two tables now (`users`, `data`), plus a recommended `consents` table (see §4.3). IDs use `uuid` (safer than sequential integers for a public web app — non-guessable, no enumeration).

### 4.1 `users`

```sql
create table users (
  id             uuid primary key default gen_random_uuid(),
  name           text,                     -- see privacy flag §5
  age_range      text not null,            -- e.g. '30-39'
  gender         text not null,            -- 'male' | 'female' | 'other'
  gender_other   text,                     -- free text, only when gender = 'other'
  country        text not null,            -- ISO 3166-1 alpha-2 code, e.g. 'DE'
  ui_language     text not null,            -- language the UI was shown in, e.g. 'en'
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Languages the participant speaks, with fluency (one row per language).
-- A separate table because it is a one-to-many relation — do NOT stuff it
-- into a single column.
create table user_languages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  language   text not null,                -- ISO 639 code, e.g. 'es'
  fluency    text not null                 -- 'native'|'fluent'|'intermediate'|'beginner'
);
```

> **Design note:** your requirement described "languages spoken" as data *inside* the users table. Because it is a variable-length list with a fluency level each, model it as the separate `user_languages` table above (one row per language). This keeps the data queryable ("how many participants speak Korean natively?") — a flat comma-string would not.
>
> **Store codes, not display names.** Country `'DE'`, language `'es'` — not "Germany"/"Spanish". This makes the data language-independent and lets the UI render the label in whatever locale is active. Age is stored as a range string because that is what you collect; if the research team later wants finer analysis, collecting exact age (an integer) is more flexible, but that is their call.

### 4.2 `data` — in-game spatial-relation responses

```sql
create table data (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  -- what was asked
  minigame          text,                  -- which landmark/mini-game
  spatial_category  text,                  -- 'topological'|'motion'|'projective'|'distance'
  stimulus_id       text,                  -- which specific trial/stimulus
  -- the response
  response          jsonb,                 -- flexible: forced-choice value, coordinates, etc.
  is_correct        boolean,               -- nullable (some trials have no "correct" answer)
  response_time_ms  integer,               -- measured client-side; see accuracy caveat §5
  -- provenance
  timestamp         timestamptz not null default now(),
  ip                text                   -- see GDPR caveat §5
);
```

> **Why `jsonb` for `response` and a `spatial_category` column:** the SCALA framing targets **four spatial-relation categories — topological, motion, projective, distance**. Different mini-games will collect different response shapes (a forced-choice label, a chosen region, a path). A typed `response` jsonb plus a `spatial_category` tag lets one table serve all mini-games and makes analysis-by-category trivial. This is the single most important schema decision for the research goal, and it is worth agreeing the exact `response` structure per category **with the research team before building mini-games** — a declarative JSON trial format (see §8) should define both the stimulus and the expected response shape.

### 4.3 `consents` (recommended addition — not in your sketch)

Gating navigation is not the same as *recording* consent, which ethics compliance requires.

```sql
create table consents (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users(id) on delete cascade,
  consent_version  text not null,          -- which wording they agreed to
  agreed           boolean not null,
  timestamp        timestamptz not null default now()
);
```

### 4.4 Database access & portability

- Access Supabase through a **single thin data-access module** (all queries live there). If the DB is swapped later, only this module changes.
- You want SQL as the working language — good; keep the schema in **versioned SQL migration files** (plain `.sql`), not defined ad-hoc in the Supabase dashboard, so the schema is reproducible and reviewable by the team.
- Turn on **Row Level Security** in Supabase before any real participant data is collected (by default the anon key can otherwise read/write freely). This is a real data-governance requirement given the multi-jurisdiction context, not an optional hardening step.

---

## 5. Data-protection & research-validity flags (read before building)

These are the points most likely to cause problems later. Raise them with Dr. Kray / the research team early.

1. **Real name + IP + demographics = personal data under GDPR.** SCALA is EU-based and its own materials state data is "confidential and anonymised." Collecting a participant's **name** and **IP address** contradicts "anonymised." Recommendations: (a) **don't collect a real name** — use a self-chosen nickname or an auto-generated participant code; (b) treat the **IP** as optional and justify it — if it's only for rough geolocation or fraud/duplicate detection, consider storing a coarser signal or hashing it, and disclose it in the consent text. Whatever is collected must match what the consent screen promises. **This needs ethics sign-off, and sign-off should be an early milestone, not a formality at the end.**

2. **Browser reaction-time measurement is noisy.** If `response_time_ms` is a research measure, be aware the browser adds variable latency (event-loop timing, rendering, input lag) that differs across devices — a known constraint for the older-adult, cross-device population. Measure as tightly as possible (timestamp at stimulus paint vs. at input event), record the method, and treat absolute values with caution. Confirm with the team whether reaction time is even a target measure for this instrument.

3. **No visible timer in trials.** (Consistent with prior design decisions.) A visible countdown changes response behaviour — keep timing invisible to the participant even if it's recorded server-side.

4. **Rewards decoupled from correct answers.** If the narrative gives rewards, place them *between* mini-games, not contingent on answering correctly — reward-for-correctness skews the very responses you're measuring.

5. **Under-18 floor.** The age dropdown starts at 18. Confirm this is intentional exclusion; if minors are ever in scope, consent handling changes substantially.

---

## 6. Internationalisation (build now, populate later)

- Externalise **every** user-facing string to locale files (`en.json` populated; others stubbed) via react-i18next. Retro-fitting i18n after the UI is built is expensive — this is why it's a day-one requirement even with only English live.
- Country and language **labels** come from the ISO libraries and localise automatically; the DB stores codes (§4.1).
- Plan for **text expansion** (German/Danish strings can be much longer than English) and eventually **RTL** if any target language needs it — don't hard-code widths around English text.

---

## 7. Visual style specification

Derived from the prototype (`JerboasJourneyPrototypedesign.png`). The aesthetic is a **warm, hand-illustrated storybook desert** — soft watercolour textures, friendly and low-stress, appropriate for a wide age range.

### 7.1 Character
- **The Jerboa** — the sole character so far. A small desert rodent with **very long hind legs, oversized rounded ears, large friendly eyes, a long tufted tail**, sandy/tan fur. Rendered in a warm, rounded, approachable children's-book style (the prototype shows it mid-hop and standing). Keep a consistent model sheet so future poses/animations match.
- Future characters ("friends and foes" from the narrative — e.g. the prototype's watchful bird) should share the same illustration language.

### 7.2 Environment
- **Desert** — the Jerboa's natural habitat: warm sand dunes, **weathered rock formations / mesas**, **cacti and desert scrub**, **crystal/gem clusters** (a distinctive motif in the prototype), a **blue oasis** as the goal, soft clouds, a low warm sun. Scattered decorative geometric glyphs (small triangles, diamonds, squiggles) frame the UI panels.
- Because the game is designed to be re-skinnable to other biomes (arctic, forest, meadow), keep environment art **modular and token-driven** so a theme swap doesn't require re-coding.

### 7.3 Colour palette (sampled from the prototype)

| Role | Colour | Approx. hex |
|---|---|---|
| Background sand / cream | warm off-white | `#F3E9D2` / `#EAD9B8` |
| Primary teal (titles, primary buttons) | desert teal | `#2E8B8B` / `#1F7A7A` |
| Deep purple (headings, accents) | dusty purple | `#6B4E9E` / `#5A3E8B` |
| Warm gold / amber (secondary buttons, sun) | amber | `#E0A43B` / `#D99A2B` |
| Terracotta / rock | clay red-brown | `#B5654A` / `#A0522D` |
| Crystal accent | soft blue-violet | `#8FA8D8` |
| Alert / exit | muted coral-red | `#D9534F` |

Define these as **CSS variables / Tailwind theme tokens** so a later biome theme (arctic = cool blues/whites) is a token swap, not a rewrite.

### 7.4 "Simple 3D" — interpret as 2.5D
Achieve depth **without** a 3D engine:
- **Layered parallax** — background dunes, midground rocks, foreground plants on separate layers that shift slightly, giving perceived depth.
- **Soft drop shadows** and gentle gradients on illustrations and buttons for a raised, tactile feel.
- **Isometric-style map tiles** for the world map (the prototype's map already reads as gently isometric).
- Optional subtle idle animation (the Jerboa breathing/blinking, a bobbing path marker) via lightweight CSS/SVG or a small library (e.g. Framer Motion / Lottie) — keep it minimal for performance on modest devices.
- **Avoid** WebGL/three.js for the mock: heavier, slower on the target population's hardware, and unnecessary for the intended look.

### 7.5 Typography
- **Display / title:** a rounded, playful hand-drawn display face (the prototype's "Jerboa's Journey" logo is a bubbly rounded serif-ish display) — e.g. *Fredoka*, *Baloo 2*, or *Chewy*. **Exact logo font: to be confirmed** (identify from source art or pick a licensed lookalike).
- **Headings / UI:** a friendly geometric sans with rounded terminals — e.g. *Nunito*, *Quicksand*, or *Poppins*.
- **Body:** the same sans at a **large, high-contrast, readable size** — non-negotiable given the older-adult audience and the accessibility priorities below.
- Confirm **font licensing** for web + any future app (Google Fonts are safe; a bespoke logo font may not be).

### 7.6 Accessibility (first-class requirement, not an afterthought)
Given the ageing-focused population and cross-device use:
- **Large touch targets**, generous spacing, large legible type.
- **High contrast** flat visuals; check text/background pairs against WCAG AA (some pastel-on-cream combinations in the prototype may fail — verify).
- Keep cognitive load **outside the trial itself** low — clear one-thing-per-screen flow, obvious primary actions.
- Full keyboard navigation and sensible focus order; alt text on meaningful images; respect `prefers-reduced-motion` for the parallax/animation.

---

## 8. Architecture recommendations (for the mini-games to come)

Not required for the mock, but decide these before mini-game work so the mock doesn't need rework:

1. **Separate the "stimulus engine" from the "game shell."** The shell = onboarding, map, navigation, theming. The engine = presents a trial, records a response. Mini-games plug into the engine. This keeps research logic testable independently of game art.
2. **Declarative JSON trial format.** Define each trial as data (stimulus, spatial category, response options, expected-response shape) rather than hard-coded screens. One renderer interprets the JSON. This lets researchers add/edit trials without a developer, and makes the `data.response` shape (§4.2) predictable.
3. **Forced-choice response format** for trials (an established prior design decision) — the JSON format should express this cleanly.
4. **Fixed side-on camera perspective** for trial scenes (prior design decision) — avoids perspective becoming an uncontrolled variable in projective-relation trials.

---

## 9. Open questions to resolve with the team

1. Exact **age banding** (scientifically meaningful for an ageing study) and whether to collect exact age instead of ranges.
2. Whether to collect a **real name at all** (privacy/anonymisation).
3. Whether **IP** is needed, and if so its justification and storage form (GDPR).
4. Final **consent wording**, its **granularity** (one checkbox vs. several), **"Decline" behaviour**, and **per-jurisdiction** ethics requirements (DE/UK/IT/DK/NO).
5. Whether **reaction time** is a target measure (given browser-noise caveat).
6. The **`response` JSON structure per spatial category** (drives the declarative trial format).
7. **Mobile strategy** (Capacitor reuse vs. React Native rebuild) — affects UI decisions now.
8. **Title screen vs. map screen** split on screen 4, and final home-screen interaction details.
9. **Logo/display font** identification and **font licensing**.
