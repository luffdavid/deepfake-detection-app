/**
 * Public entry points for the local face-recognition feature.
 *
 * Face detection + descriptor computation happen in the browser. Storage,
 * matching and progress live on our server (PostgreSQL). NO participant data is
 * persisted in the browser.
 */

export { FACE_CONFIG, isFaceDebugEnabled } from "./config"
export type { FaceConfig } from "./config"
export { getHumanFeatureSummary } from "./human-loader"
export {
  getCurrentParticipantId,
  getCurrentParticipantState,
  subscribeParticipant,
  recordAttemptForCurrentParticipant,
} from "./participant-session"
export { recognizeDescriptor, enrollDescriptor, recordAttemptRemote } from "./remote"
export type { AttemptInput } from "./remote"
export type {
  ParticipantState,
  FacePipelineSnapshot,
  MatchResult,
  RecognitionOutcome,
} from "./types"
