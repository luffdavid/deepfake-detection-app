/**
 * Human library loader / initializer.
 *
 * Configures @vladmandic/human for ONLY the capabilities this feature needs:
 *   - face detection            (blazeface)
 *   - facial landmarks / mesh   (facemesh, for quality + frontal checks)
 *   - face descriptor           (faceres embedding)
 *
 * Everything else is explicitly disabled: age, gender, emotion, race, iris,
 * attention, antispoof, liveness, body, hand, object, gesture, segmentation.
 *
 * NOTE ON AGE/GENDER: Human has no descriptor-only model. The face embedding is
 * produced by the "description" (faceres) model, which internally also computes
 * age/gender. Those byproduct values are NEVER read, used, stored, or
 * transmitted anywhere in this codebase — only `embedding` is consumed.
 *
 * PRIVACY: `modelBasePath` points at our own domain (/models/human). The `webgl`
 * backend is used so no external WASM files are ever fetched. The bundled TFJS
 * engine ships inside the npm package, so no scripts are loaded from a CDN.
 */

import type { Config, Human } from "@vladmandic/human"
import { FACE_CONFIG } from "./config"

let humanInstance: Human | null = null
let loadPromise: Promise<Human> | null = null

/** Build the locked-down Human configuration. */
export function buildHumanConfig(): Partial<Config> {
  return {
    backend: FACE_CONFIG.backend,
    // Local, same-origin models only. Never a CDN.
    modelBasePath: FACE_CONFIG.models.basePath,
    debug: false,
    async: true,
    // We warm up manually after load to avoid a long blocking startup.
    warmup: "none",
    cacheModels: true,
    cacheSensitivity: 0.7,
    // GPU image pre-processing only; nothing is returned or uploaded.
    filter: { enabled: true, equalization: false, flip: false, return: false },

    face: {
      enabled: true,
      detector: {
        modelPath: FACE_CONFIG.models.detector,
        rotation: false,
        maxDetected: FACE_CONFIG.detection.maxDetected,
        minConfidence: FACE_CONFIG.detection.minConfidence,
        // Relative size gating is done locally against the frame size.
        minSize: 0,
        return: false,
      },
      // Landmarks/mesh: needed for quality + frontal (rotation) checks.
      mesh: { enabled: true, modelPath: FACE_CONFIG.models.mesh },
      // Descriptor/embedding: needed for local recognition.
      description: {
        enabled: true,
        modelPath: FACE_CONFIG.models.description,
        minConfidence: FACE_CONFIG.detection.minConfidence,
      },

      // ---- Explicitly disabled facial analyses ----
      iris: { enabled: false },
      attention: { enabled: false },
      emotion: { enabled: false }, // no emotion analysis
      antispoof: { enabled: false },
      liveness: { enabled: false },
      gear: { enabled: false }, // no age/gender/race "gear" enrichment
    },

    // ---- Explicitly disabled non-face modules ----
    body: { enabled: false }, // no body tracking
    hand: { enabled: false }, // no hand tracking
    object: { enabled: false }, // no object detection
    gesture: { enabled: false },
    segmentation: { enabled: false }, // no segmentation
  }
}

/**
 * Load (or reuse) the singleton Human instance with models resolved and warmed.
 * Browser-only: must not be called during SSR.
 */
export async function getHuman(): Promise<Human> {
  if (humanInstance) return humanInstance
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    // Import the package's browser build. Next resolves this to the "browser"
    // field (dist/human.esm.js) in the client bundle; the Node entry (which
    // requires @tensorflow/tfjs-node) is avoided by loading this controller
    // browser-only (next/dynamic ssr:false). The ESM bundle ships TFJS inside
    // it — no CDN and no external scripts.
    const mod = await import("@vladmandic/human")
    const HumanCtor = mod.Human ?? (mod as unknown as { default: typeof Human }).default
    if (!HumanCtor) throw new Error("Failed to load Human ESM bundle.")
    const human = new HumanCtor(buildHumanConfig())

    // Load model weights from our own domain.
    await human.load()

    // Light warmup so the first real frame is not janky. Failure is non-fatal.
    try {
      await human.warmup({ warmup: "face" })
    } catch {
      /* warmup is best-effort */
    }

    humanInstance = human
    return human
  })()

  return loadPromise
}

/** Returns the loaded instance without triggering a load, if present. */
export function peekHuman(): Human | null {
  return humanInstance
}

/** List of enabled / disabled Human features, for reporting & the debug overlay. */
export function getHumanFeatureSummary() {
  return {
    enabled: ["face.detector (blazeface)", "face.mesh (facemesh)", "face.description (faceres embedding)"],
    disabled: [
      "age",
      "gender",
      "race",
      "emotion",
      "iris",
      "attention",
      "antispoof",
      "liveness",
      "body",
      "hand",
      "object",
      "gesture",
      "segmentation",
    ],
    note: "faceres computes age/gender internally as a byproduct of the embedding; those values are never read, stored, or transmitted.",
  }
}
