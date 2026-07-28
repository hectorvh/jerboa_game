import type { ConsentRecord, ParticipantRecord } from './types'
import type { OnboardingValues } from './schema'

// Prototype backend: keeps records in memory and logs writes, so every screen
// and navigation rule can be exercised without a database. Deliberately has no
// persistence — a reload starts a clean session.

const store = {
  participants: new Map<string, ParticipantRecord>(),
  consents: [] as ConsentRecord[],
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'p_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** INSERT on first save, UPDATE on subsequent saves (spec §3, 1.2.C). */
export async function saveParticipant(
  values: OnboardingValues,
  existingId?: string,
): Promise<ParticipantRecord> {
  const now = new Date().toISOString()

  if (existingId && store.participants.has(existingId)) {
    const prev = store.participants.get(existingId)!
    const updated: ParticipantRecord = { ...prev, ...values, updatedAt: now }
    store.participants.set(existingId, updated)
    console.log('[jerboa] participant UPDATE', updated)
    return updated
  }

  const record: ParticipantRecord = {
    id: uuid(),
    ...values,
    createdAt: now,
    updatedAt: now,
  }
  store.participants.set(record.id, record)
  console.log('[jerboa] participant INSERT', record)
  return record
}

/** Records consent as an auditable row, not just a UI gate (spec §4.3). */
export async function recordConsent(
  userId: string,
  consentVersion: string,
  agreed: boolean,
): Promise<ConsentRecord> {
  const record: ConsentRecord = {
    userId,
    consentVersion,
    agreed,
    timestamp: new Date().toISOString(),
  }
  store.consents.push(record)
  console.log('[jerboa] consent recorded', record)
  return record
}
