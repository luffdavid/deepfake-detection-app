/**
 * Server-only PostgreSQL data layer for face participants.
 *
 * Stores ONLY:
 *   - random participant id
 *   - encrypted biometric template (ciphertext + iv + auth tag)
 *   - encryption metadata (algorithm, key version)
 *   - model & descriptor version + dimension
 *   - enrollment quality metadata
 *   - progress / attempt results
 *   - created / last-seen / scheduled-deletion timestamps
 *
 * Never stores raw descriptors, frames, crops, names, or other PII. Biometric
 * templates are encrypted by lib/face/server/crypto before they ever reach the
 * database, so even DB query logs / backups only contain ciphertext.
 */

import { sql } from "@vercel/postgres"
import type { EncryptedTemplate } from "./crypto"

export interface ParticipantMeta {
  modelVersion: string
  descriptorVersion: string
  descriptorDim: number
  enrollmentQuality: number
  enrollmentConfidence: number | null
}

export interface EncryptedRow {
  id: string
  ciphertext: string
  iv: string
  authTag: string
}

/** Create tables + indexes if they do not exist. Idempotent. */
export async function initFaceSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS face_participants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_ciphertext TEXT NOT NULL,
      template_iv TEXT NOT NULL,
      template_auth_tag TEXT NOT NULL,
      enc_algorithm VARCHAR(32) NOT NULL,
      enc_key_version INT NOT NULL,
      model_version VARCHAR(64) NOT NULL,
      descriptor_version VARCHAR(32) NOT NULL,
      descriptor_dim INT NOT NULL,
      enrollment_quality REAL NOT NULL,
      enrollment_confidence REAL,
      observations INT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      scheduled_deletion_at TIMESTAMPTZ
    );
  `
  await sql`
    CREATE TABLE IF NOT EXISTS face_attempts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      participant_id UUID NOT NULL REFERENCES face_participants(id) ON DELETE CASCADE,
      session_id VARCHAR(255),
      correct_count INT NOT NULL,
      total_count INT NOT NULL,
      score REAL NOT NULL,
      details JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `
  await sql`
    CREATE TABLE IF NOT EXISTS face_recognition_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      participant_id UUID NOT NULL REFERENCES face_participants(id) ON DELETE CASCADE,
      outcome VARCHAR(16) NOT NULL,
      similarity REAL,
      model_version VARCHAR(64),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_face_attempts_participant ON face_attempts(participant_id);`
  await sql`CREATE INDEX IF NOT EXISTS idx_face_recog_participant ON face_recognition_events(participant_id);`
  await sql`CREATE INDEX IF NOT EXISTS idx_face_participants_last_seen ON face_participants(last_seen_at);`
}

/** Insert a new encrypted participant template. Returns the new id. */
export async function insertParticipant(
  enc: EncryptedTemplate,
  meta: ParticipantMeta,
): Promise<string> {
  const result = await sql<{ id: string }>`
    INSERT INTO face_participants (
      template_ciphertext, template_iv, template_auth_tag,
      enc_algorithm, enc_key_version,
      model_version, descriptor_version, descriptor_dim,
      enrollment_quality, enrollment_confidence
    ) VALUES (
      ${enc.ciphertext}, ${enc.iv}, ${enc.authTag},
      ${enc.algorithm}, ${enc.keyVersion},
      ${meta.modelVersion}, ${meta.descriptorVersion}, ${meta.descriptorDim},
      ${meta.enrollmentQuality}, ${meta.enrollmentConfidence}
    )
    RETURNING id;
  `
  return result.rows[0].id
}

/** Return encrypted templates for server-side matching (never sent to browser). */
export async function listEncryptedTemplates(): Promise<EncryptedRow[]> {
  const result = await sql<{
    id: string
    template_ciphertext: string
    template_iv: string
    template_auth_tag: string
  }>`
    SELECT id, template_ciphertext, template_iv, template_auth_tag
    FROM face_participants;
  `
  return result.rows.map((r) => ({
    id: r.id,
    ciphertext: r.template_ciphertext,
    iv: r.template_iv,
    authTag: r.template_auth_tag,
  }))
}

/** Update last-seen and increment observation count for a matched participant. */
export async function touchParticipant(id: string): Promise<void> {
  await sql`
    UPDATE face_participants
    SET last_seen_at = now(), observations = observations + 1
    WHERE id = ${id};
  `
}

export async function insertRecognitionEvent(params: {
  participantId: string
  outcome: string
  similarity: number | null
  modelVersion: string
}): Promise<void> {
  await sql`
    INSERT INTO face_recognition_events (participant_id, outcome, similarity, model_version)
    VALUES (${params.participantId}, ${params.outcome}, ${params.similarity}, ${params.modelVersion});
  `
}

export async function insertAttempt(params: {
  participantId: string
  sessionId: string | null
  correctCount: number
  totalCount: number
  score: number
  details: unknown
}): Promise<string> {
  const result = await sql<{ id: string }>`
    INSERT INTO face_attempts (participant_id, session_id, correct_count, total_count, score, details)
    VALUES (
      ${params.participantId}, ${params.sessionId}, ${params.correctCount},
      ${params.totalCount}, ${params.score}, ${JSON.stringify(params.details)}::jsonb
    )
    RETURNING id;
  `
  return result.rows[0].id
}

/** Does a participant row exist? (used to validate attempt writes) */
export async function participantExists(id: string): Promise<boolean> {
  const result = await sql`SELECT 1 FROM face_participants WHERE id = ${id} LIMIT 1;`
  return result.rows.length > 0
}

// ---------- Deletion ----------

/** Delete one participant and cascade to attempts + recognition events. */
export async function deleteParticipant(id: string): Promise<number> {
  const result = await sql`DELETE FROM face_participants WHERE id = ${id};`
  return result.rowCount ?? 0
}

/**
 * Full-project deletion: remove ALL participant records and everything that
 * cascades from them. Children are removed explicitly too for defense in depth.
 */
export async function deleteAllFaceData(): Promise<void> {
  await sql`DELETE FROM face_recognition_events;`
  await sql`DELETE FROM face_attempts;`
  await sql`DELETE FROM face_participants;`
}

// ---------- Status / verification ----------

export interface FaceDataCounts {
  participants: number
  attempts: number
  recognitionEvents: number
}

/** Row counts across all face tables (used by the deletion verification tool). */
export async function getFaceDataCounts(): Promise<FaceDataCounts> {
  const p = await sql`SELECT COUNT(*)::int AS c FROM face_participants;`
  const a = await sql`SELECT COUNT(*)::int AS c FROM face_attempts;`
  const r = await sql`SELECT COUNT(*)::int AS c FROM face_recognition_events;`
  return {
    participants: p.rows[0].c as number,
    attempts: a.rows[0].c as number,
    recognitionEvents: r.rows[0].c as number,
  }
}

export interface ParticipantProgressRow {
  id: string
  observations: number
  attempts: number
  firstScore: number | null
  lastScore: number | null
  bestScore: number | null
  createdAt: string
  lastSeenAt: string
}

/**
 * Progress overview for the dashboard. Returns ONLY non-biometric aggregates —
 * never templates/ciphertext.
 */
export async function getParticipantsWithProgress(): Promise<ParticipantProgressRow[]> {
  const result = await sql<{
    id: string
    observations: number
    attempts: number
    first_score: number | null
    last_score: number | null
    best_score: number | null
    created_at: string
    last_seen_at: string
  }>`
    SELECT
      p.id,
      p.observations,
      COUNT(a.id)::int AS attempts,
      (ARRAY_AGG(a.score ORDER BY a.created_at ASC))[1] AS first_score,
      (ARRAY_AGG(a.score ORDER BY a.created_at DESC))[1] AS last_score,
      MAX(a.score) AS best_score,
      p.created_at,
      p.last_seen_at
    FROM face_participants p
    LEFT JOIN face_attempts a ON a.participant_id = p.id
    GROUP BY p.id
    ORDER BY p.last_seen_at DESC;
  `
  return result.rows.map((r) => ({
    id: r.id,
    observations: r.observations,
    attempts: r.attempts,
    firstScore: r.first_score,
    lastScore: r.last_score,
    bestScore: r.best_score,
    createdAt: r.created_at,
    lastSeenAt: r.last_seen_at,
  }))
}

export interface AttemptRow {
  id: string
  score: number
  correctCount: number
  totalCount: number
  sessionId: string | null
  createdAt: string
}

/** All attempts for one participant, oldest first (no biometric data). */
export async function getAttemptsByParticipant(participantId: string): Promise<AttemptRow[]> {
  const result = await sql<{
    id: string
    score: number
    correct_count: number
    total_count: number
    session_id: string | null
    created_at: string
  }>`
    SELECT id, score, correct_count, total_count, session_id, created_at
    FROM face_attempts
    WHERE participant_id = ${participantId}
    ORDER BY created_at ASC;
  `
  return result.rows.map((r) => ({
    id: r.id,
    score: r.score,
    correctCount: r.correct_count,
    totalCount: r.total_count,
    sessionId: r.session_id,
    createdAt: r.created_at,
  }))
}
