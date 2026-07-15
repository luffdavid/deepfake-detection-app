/**
 * Server-only application-level encryption for biometric templates.
 *
 * Uses AES-256-GCM (authenticated encryption). The key lives ONLY in the
 * server environment secret FACE_TEMPLATE_ENC_KEY (32 bytes, base64) and is
 * never exposed to the browser. Every encryption uses a fresh random 12-byte
 * IV/nonce; the IV and GCM auth tag are stored alongside the ciphertext.
 *
 * This module must never be imported into client code.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_BYTES = 12

function getKey(): Buffer {
  const b64 = process.env.FACE_TEMPLATE_ENC_KEY
  if (!b64) {
    throw new Error("FACE_TEMPLATE_ENC_KEY is not configured (server secret).")
  }
  const key = Buffer.from(b64, "base64")
  if (key.length !== 32) {
    throw new Error("FACE_TEMPLATE_ENC_KEY must decode to exactly 32 bytes (AES-256).")
  }
  return key
}

export function getKeyVersion(): number {
  const v = Number(process.env.FACE_TEMPLATE_ENC_KEY_VERSION ?? "1")
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 1
}

/** True when a valid encryption key is configured (used by health checks). */
export function encryptionAvailable(): boolean {
  try {
    getKey()
    return true
  } catch {
    return false
  }
}

export interface EncryptedTemplate {
  /** base64 ciphertext */
  ciphertext: string
  /** base64 random IV/nonce (unique per operation) */
  iv: string
  /** base64 GCM authentication tag */
  authTag: string
  /** algorithm identifier stored as metadata */
  algorithm: string
  /** key version stored as metadata (supports rotation) */
  keyVersion: number
}

/** Pack a float descriptor into a compact Float32 byte buffer. */
function descriptorToBuffer(descriptor: number[]): Buffer {
  const f32 = Float32Array.from(descriptor)
  return Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength)
}

/** Unpack a Float32 byte buffer back into a number[] (aligned copy). */
function bufferToDescriptor(buf: Buffer): number[] {
  const aligned = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  return Array.from(new Float32Array(aligned))
}

/** Encrypt a descriptor into an authenticated ciphertext + metadata. */
export function encryptTemplate(descriptor: number[]): EncryptedTemplate {
  const key = getKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const plaintext = descriptorToBuffer(descriptor)
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const authTag = cipher.getAuthTag()
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    algorithm: ALGORITHM,
    keyVersion: getKeyVersion(),
  }
}

/** Decrypt a stored template back into a descriptor. Throws on tamper/wrong key. */
export function decryptTemplate(enc: {
  ciphertext: string
  iv: string
  authTag: string
}): number[] {
  const key = getKey()
  const iv = Buffer.from(enc.iv, "base64")
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(Buffer.from(enc.authTag, "base64"))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(enc.ciphertext, "base64")),
    decipher.final(),
  ])
  return bufferToDescriptor(plaintext)
}
