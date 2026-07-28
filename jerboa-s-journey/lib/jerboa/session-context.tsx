'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { OnboardingValues } from './schema'
import type { ParticipantRecord } from './types'
import { CONSENT_VERSION } from './constants'
import { ensureAnonymousSession, startFreshAnonymousSession } from './auth'
import { recordConsent, saveParticipant } from './data-access'

export type Step = 'welcome' | 'information' | 'consent' | 'title' | 'map' | 'declined'

/** The linear flow. 'declined' is a terminal state and sits outside it. */
export const STEP_ORDER: Step[] = ['welcome', 'information', 'consent', 'title', 'map']

/**
 * Whether the anonymous Supabase session exists yet. Every write depends on it,
 * so screens disable their submit controls until it is 'ready' rather than
 * letting a participant fill in answers that cannot be stored.
 */
export type AuthStatus = 'pending' | 'ready' | 'error'

interface SessionContextValue {
  step: Step
  participant: ParticipantRecord | null
  /** Draft answers preserved across navigation so the form pre-fills on Back. */
  draft: Partial<OnboardingValues> | null
  consentGiven: boolean
  /** Set when a write fails, so a screen can explain it instead of stalling. */
  error: string | null
  authStatus: AuthStatus
  goTo: (step: Step) => void
  /** Persist onboarding answers (insert first time, update afterwards). */
  submitOnboarding: (values: OnboardingValues) => Promise<void>
  /** Record an explicit consent decision (spec §3 / §4.3). */
  submitConsent: (agreed: boolean) => Promise<void>
  /** Discard the ended session and start a fresh one from screen 1. */
  resetSession: () => void
}

function messageFor(cause: unknown): string {
  return cause instanceof Error && cause.message
    ? cause.message
    : 'Something went wrong. Please try again.'
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<Step>('welcome')
  const [participant, setParticipant] = useState<ParticipantRecord | null>(null)
  const [draft, setDraft] = useState<Partial<OnboardingValues> | null>(null)
  const [consentGiven, setConsentGiven] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('pending')

  // Sign in as soon as the instrument loads, so the session is usually ready
  // before the participant finishes reading screen 1.
  useEffect(() => {
    let cancelled = false
    ensureAnonymousSession()
      .then(() => {
        if (!cancelled) setAuthStatus('ready')
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setAuthStatus('error')
        setError(messageFor(cause))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const goTo = useCallback((next: Step) => {
    setStep(next)
    setError(null)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
  }, [])

  const submitOnboarding = useCallback(
    async (values: OnboardingValues) => {
      setDraft(values)
      setError(null)
      try {
        const saved = await saveParticipant(values, participant?.id)
        setParticipant(saved)
        goTo('information')
      } catch (cause) {
        // Keep the participant on the form with their answers intact.
        setError(messageFor(cause))
      }
    },
    [participant?.id, goTo],
  )

  // Declining ends the session: the decision is still recorded for the audit
  // trail (spec §4.3), but the participant reference is dropped so nothing
  // further can be written against it (spec §3, Screen 3).
  const submitConsent = useCallback(
    async (agreed: boolean) => {
      setError(null)
      if (participant) {
        try {
          await recordConsent(participant.id, CONSENT_VERSION, agreed)
        } catch (cause) {
          // Do not advance on failure: an unrecorded consent decision would
          // leave the study without the audit trail ethics review requires.
          setError(messageFor(cause))
          return
        }
      }
      setConsentGiven(agreed)
      if (!agreed) {
        setParticipant(null)
        setDraft(null)
      }
      goTo(agreed ? 'title' : 'declined')
    },
    [participant, goTo],
  )

  // Starting again takes a new anonymous identity, so the fresh run becomes its
  // own participant record instead of overwriting the one that was abandoned —
  // save_participant upserts on auth.uid(), so reusing the uid would edit it.
  const resetSession = useCallback(() => {
    setParticipant(null)
    setDraft(null)
    setConsentGiven(false)
    setAuthStatus('pending')
    goTo('welcome')
    startFreshAnonymousSession()
      .then(() => setAuthStatus('ready'))
      .catch((cause: unknown) => {
        setAuthStatus('error')
        setError(messageFor(cause))
      })
  }, [goTo])

  const value = useMemo<SessionContextValue>(
    () => ({
      step,
      participant,
      draft,
      consentGiven,
      error,
      authStatus,
      goTo,
      submitOnboarding,
      submitConsent,
      resetSession,
    }),
    [
      step,
      participant,
      draft,
      consentGiven,
      error,
      authStatus,
      goTo,
      submitOnboarding,
      submitConsent,
      resetSession,
    ],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within a SessionProvider')
  return ctx
}
