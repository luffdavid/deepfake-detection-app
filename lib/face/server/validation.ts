/**
 * Server-only strict request schemas (zod) for the face API.
 * Enforces descriptor length bounds, numeric ranges, and payload shape.
 */

import { z } from "zod"

const descriptorSchema = z.array(z.number().finite()).min(64).max(4096)

export const recognizeSchema = z.object({
  descriptor: descriptorSchema,
  modelVersion: z.string().min(1).max(64),
  descriptorVersion: z.string().min(1).max(32),
})

export const enrollSchema = z.object({
  descriptor: descriptorSchema,
  modelVersion: z.string().min(1).max(64),
  descriptorVersion: z.string().min(1).max(32),
  enrollmentQuality: z.number().min(0).max(1),
  enrollmentConfidence: z.number().min(0).max(1).nullable().optional(),
})

const attemptDetailSchema = z.object({
  scenarioId: z.string().max(128),
  userTrust: z.string().max(32),
  isCorrect: z.boolean(),
})

export const attemptSchema = z.object({
  participantId: z.string().uuid(),
  sessionId: z.string().max(255).nullable().optional(),
  correctCount: z.number().int().min(0).max(1000),
  totalCount: z.number().int().min(0).max(1000),
  score: z.number().min(0).max(1),
  details: z.array(attemptDetailSchema).max(100).optional().default([]),
})

export type RecognizeInput = z.infer<typeof recognizeSchema>
export type EnrollInput = z.infer<typeof enrollSchema>
export type AttemptInput = z.infer<typeof attemptSchema>
