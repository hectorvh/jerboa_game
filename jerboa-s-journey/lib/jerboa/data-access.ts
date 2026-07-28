import type { ConsentRecord, ParticipantRecord } from './types'
import type { OnboardingValues } from './schema'
import { getBackendMode } from './backend'
import * as memory from './data-access-memory'
import * as supabase from './data-access-supabase'

// Thin data-access layer (spec §4.4). This file is the only thing the UI
// imports, so the backend can change without touching a component: it picks
// between the in-memory prototype store and Supabase based on configuration.

function backend() {
  return getBackendMode() === 'supabase' ? supabase : memory
}

/** INSERT on first save, UPDATE on subsequent saves (spec §3, 1.2.C). */
export async function saveParticipant(
  values: OnboardingValues,
  existingId?: string,
): Promise<ParticipantRecord> {
  return backend().saveParticipant(values, existingId)
}

/** Records consent as an auditable row, not just a UI gate (spec §4.3). */
export async function recordConsent(
  userId: string,
  consentVersion: string,
  agreed: boolean,
): Promise<ConsentRecord> {
  return backend().recordConsent(userId, consentVersion, agreed)
}
