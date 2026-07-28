import { z } from 'zod'
import { AGE_RANGES } from './constants'

// Single source of truth for onboarding validation AND types (spec §2).

export const fluencySchema = z.enum(['native', 'fluent', 'intermediate', 'beginner'])

export const spokenLanguageSchema = z.object({
  language: z.string().min(1, 'Please choose a language.'),
  fluency: fluencySchema,
})

export const onboardingSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Please enter a name or nickname.')
      .max(80, 'That name is a little too long.'),
    ageRange: z.enum(AGE_RANGES, {
      message: 'Please choose your age range.',
    }),
    gender: z.enum(['male', 'female', 'other'], {
      message: 'Please choose an option.',
    }),
    genderOther: z.string().trim().max(60).optional(),
    country: z.string().min(1, 'Please choose your country.'),
    uiLanguage: z.string().min(1),
    languages: z
      .array(spokenLanguageSchema)
      .min(1, 'Please add at least one language you speak.')
      .refine(
        (list) => new Set(list.map((l) => l.language)).size === list.length,
        { message: 'Each language can only be added once.' },
      ),
  })
  .refine(
    (data) => data.gender !== 'other' || (data.genderOther?.trim().length ?? 0) > 0,
    {
      message: 'Please tell us how you identify.',
      path: ['genderOther'],
    },
  )

export type OnboardingValues = z.infer<typeof onboardingSchema>
