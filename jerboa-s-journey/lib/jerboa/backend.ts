// Which storage backend the instrument is talking to.
//
// The frontend is still being defined, so the default path needs to be "clone
// the repo and run it" with no Supabase project and no Netlify deploy. That is
// what 'memory' is for: records live in a JavaScript Map for the lifetime of
// the tab, which is enough to exercise every screen and navigation rule.

export type BackendMode = 'supabase' | 'memory'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

/** Forces in-memory storage even in a production build. */
const FORCED_MEMORY = process.env.NEXT_PUBLIC_JERBOA_BACKEND === 'memory'

let warned = false

export function getBackendMode(): BackendMode {
  if (FORCED_MEMORY) return 'memory'

  if (SUPABASE_URL && SUPABASE_KEY) return 'supabase'

  // Falling back silently in a real deployment would accept participant
  // answers and drop them on page close, and the study would only discover it
  // when the data was analysed. A misconfigured deploy must fail loudly; opt in
  // with NEXT_PUBLIC_JERBOA_BACKEND=memory if a public prototype is intended.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or set ' +
        'NEXT_PUBLIC_JERBOA_BACKEND=memory to run without a database.',
    )
  }

  if (!warned) {
    warned = true
    console.warn(
      '[jerboa] No Supabase configuration found — running in prototype mode. ' +
        'Answers are kept in memory and lost on reload.',
    )
  }
  return 'memory'
}
