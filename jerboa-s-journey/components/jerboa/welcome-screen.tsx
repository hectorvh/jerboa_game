'use client'

import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  Globe,
  Languages,
  User,
  Users,
} from 'lucide-react'
import { onboardingSchema, type OnboardingValues } from '@/lib/jerboa/schema'
import {
  AGE_RANGES,
  COUNTRY_OPTIONS,
  GENDER_OPTIONS,
  UI_LANGUAGES,
} from '@/lib/jerboa/constants'
import { useSession } from '@/lib/jerboa/session-context'
import { Panel } from './scene'
import { FieldError, FieldLabel, NativeSelect, TextInput } from './form-fields'
import { LanguagePicker } from './language-picker'

export function WelcomeScreen() {
  const { draft, error, authStatus, submitOnboarding } = useSession()
  const [subStep, setSubStep] = useState<'language' | 'details'>(
    draft ? 'details' : 'language',
  )

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onSubmit',
    defaultValues: {
      name: draft?.name ?? '',
      ageRange: draft?.ageRange ?? undefined,
      gender: draft?.gender ?? undefined,
      genderOther: draft?.genderOther ?? '',
      country: draft?.country ?? '',
      uiLanguage: draft?.uiLanguage ?? 'en',
      // Left empty on purpose: pre-filling a native language would bias the
      // self-reported language profile this study measures.
      languages: draft?.languages ?? [],
    },
  })

  const gender = watch('gender')

  async function onSubmit(values: OnboardingValues) {
    await submitOnboarding(values)
  }

  if (subStep === 'language') {
    return (
      <Panel className="max-w-lg text-center">
        <p className="mb-2 text-sm font-bold tracking-widest text-primary uppercase">
          Welcome
        </p>
        <h1 className="mb-3 font-display text-4xl font-bold text-purple text-balance sm:text-5xl">
          {"Jerboa's Journey"}
        </h1>
        <p className="mx-auto mb-8 max-w-sm text-lg text-muted-foreground text-pretty">
          Choose your language to begin. More languages are coming soon.
        </p>

        <div className="mx-auto mb-8 max-w-sm text-left">
          <FieldLabel htmlFor="ui-language" icon={<Languages />}>
            Language
          </FieldLabel>
          {/* Both sub-steps share one form instance, so react-hook-form keeps
              this value while the field is unmounted and Back restores it. */}
          <NativeSelect id="ui-language" {...register('uiLanguage')}>
            {UI_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value} disabled={!lang.enabled}>
                {lang.label}
                {lang.enabled ? '' : ' — coming soon'}
              </option>
            ))}
          </NativeSelect>
        </div>

        <button
          type="button"
          onClick={() => setSubStep('details')}
          className="mx-auto flex h-14 w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-xl font-bold text-primary-foreground shadow-storybook transition-transform hover:bg-teal-dark active:translate-y-px"
        >
          Continue
          <ArrowRight className="size-6" />
        </button>
      </Panel>
    )
  }

  return (
    <Panel className="max-w-2xl">
      <div className="mb-6 text-center">
        <p className="mb-1 text-sm font-bold tracking-widest text-primary uppercase">
          {"Let's get started!"}
        </p>
        <h1 className="font-display text-3xl font-bold text-purple text-balance sm:text-4xl">
          Tell us a bit about yourself
        </h1>
        <p className="mt-2 text-lg text-muted-foreground text-pretty">
          This helps us understand who takes part in the study.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        {/* Name */}
        <div>
          <FieldLabel htmlFor="name" icon={<User />} hint="Name">
            Your name or nickname
          </FieldLabel>
          <TextInput
            id="name"
            placeholder="e.g. Alex Explorer"
            autoComplete="off"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
            {...register('name')}
          />
          <FieldError id="name-error" message={errors.name?.message} />
        </div>

        {/* Age */}
        <div>
          <FieldLabel htmlFor="ageRange" icon={<CalendarRange />}>
            Age range
          </FieldLabel>
          <NativeSelect
            id="ageRange"
            defaultValue=""
            aria-invalid={!!errors.ageRange}
            aria-describedby={errors.ageRange ? 'age-error' : undefined}
            {...register('ageRange')}
          >
            <option value="" disabled>
              Select your range…
            </option>
            {AGE_RANGES.map((range) => (
              <option key={range} value={range}>
                {range === '80+' ? '80 or older' : `${range} years`}
              </option>
            ))}
          </NativeSelect>
          <FieldError id="age-error" message={errors.ageRange?.message} />
        </div>

        {/* Gender */}
        <div>
          <FieldLabel htmlFor="gender" icon={<Users />}>
            Gender
          </FieldLabel>
          <NativeSelect
            id="gender"
            defaultValue=""
            aria-invalid={!!errors.gender}
            aria-describedby={errors.gender ? 'gender-error' : undefined}
            {...register('gender')}
          >
            <option value="" disabled>
              Select an option…
            </option>
            {GENDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </NativeSelect>
          <FieldError id="gender-error" message={errors.gender?.message} />

          {gender === 'other' ? (
            <div className="mt-3">
              <TextInput
                aria-label="Please specify your gender"
                placeholder="Please specify…"
                aria-invalid={!!errors.genderOther}
                aria-describedby={errors.genderOther ? 'gender-other-error' : undefined}
                {...register('genderOther')}
              />
              <FieldError id="gender-other-error" message={errors.genderOther?.message} />
            </div>
          ) : null}
        </div>

        {/* Country */}
        <div>
          <FieldLabel htmlFor="country" icon={<Globe />}>
            Country
          </FieldLabel>
          <NativeSelect
            id="country"
            defaultValue=""
            aria-invalid={!!errors.country}
            aria-describedby={errors.country ? 'country-error' : undefined}
            {...register('country')}
          >
            <option value="" disabled>
              Select your country…
            </option>
            {COUNTRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </NativeSelect>
          <FieldError id="country-error" message={errors.country?.message} />
        </div>

        {/* Languages spoken */}
        <div>
          <FieldLabel icon={<Languages />}>Languages you speak</FieldLabel>
          <Controller
            control={control}
            name="languages"
            render={({ field }) => (
              <LanguagePicker
                value={field.value}
                onChange={field.onChange}
                invalid={!!errors.languages}
              />
            )}
          />
          <FieldError
            message={
              errors.languages?.message ??
              errors.languages?.root?.message ??
              (Array.isArray(errors.languages)
                ? errors.languages.find(Boolean)?.language?.message
                : undefined)
            }
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-2xl border-2 border-destructive/40 bg-destructive/8 p-4 text-base font-semibold text-destructive"
          >
            {error}
          </p>
        ) : null}

        {/* Explains the disabled Continue button while sign-in is in flight. */}
        {authStatus === 'pending' ? (
          <p role="status" className="text-base font-semibold text-muted-foreground">
            Preparing your session…
          </p>
        ) : null}

        {/* Actions */}
        <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setSubStep('language')}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-input bg-background px-6 text-lg font-bold text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="size-5" />
            Back
          </button>
          <button
            type="submit"
            // Answers are written on submit, so there must be a session first.
            disabled={isSubmitting || authStatus !== 'ready'}
            aria-disabled={isSubmitting || authStatus !== 'ready'}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-xl font-bold text-primary-foreground shadow-storybook transition-transform hover:bg-teal-dark active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:flex-none sm:px-10"
          >
            Continue
            <ArrowRight className="size-6" />
          </button>
        </div>
      </form>
    </Panel>
  )
}
