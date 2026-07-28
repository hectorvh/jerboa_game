'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { OnboardingValues } from './schema'
import type { ParticipantRecord } from './types'
import { CONSENT_VERSION } from './constants'
import { recordConsent, saveParticipant } from './data-access'

export type Step = 'welcome' | 'information' | 'consent' | 'title' | 'map' | 'declined'

/** The linear flow. 'declined' is a terminal state and sits outside it. */
export const STEP_ORDER: Step[] = ['welcome', 'information', 'consent', 'title', 'map']

interface SessionContextValue {
  step: Step
  participant: ParticipantRecord | null
  /** Draft answers preserved across navigation so the form pre-fills on Back. */
  draft: Partial<OnboardingValues> | null
  consentGiven: boolean
  goTo: (step: Step) => void
  /** Persist onboarding answers (insert first time, update afterwards). */
  submitOnboarding: (values: OnboardingValues) => Promise<void>
  /** Record an explicit consent decision (spec §3 / §4.3). */
  submitConsent: (agreed: boolean) => Promise<void>
  /** Discard the ended session and start a fresh one from screen 1. */
  resetSession: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<Step>('welcome')
  const [participant, setParticipant] = useState<ParticipantRecord | null>(null)
  const [draft, setDraft] = useState<Partial<OnboardingValues> | null>(null)
  const [consentGiven, setConsentGiven] = useState(false)

  const goTo = useCallback((next: Step) => {
    setStep(next)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
  }, [])

  const submitOnboarding = useCallback(
    async (values: OnboardingValues) => {
      setDraft(values)
      const saved = await saveParticipant(values, participant?.id)
      setParticipant(saved)
      goTo('information')
    },
    [participant?.id, goTo],
  )

  // Declining ends the session: the decision is still recorded for the audit
  // trail (spec §4.3), but the participant reference is dropped so nothing
  // further can be written against it (spec §3, Screen 3).
  const submitConsent = useCallback(
    async (agreed: boolean) => {
      if (participant) {
        await recordConsent(participant.id, CONSENT_VERSION, agreed)
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

  const resetSession = useCallback(() => {
    setParticipant(null)
    setDraft(null)
    setConsentGiven(false)
    goTo('welcome')
  }, [goTo])

  const value = useMemo<SessionContextValue>(
    () => ({
      step,
      participant,
      draft,
      consentGiven,
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
