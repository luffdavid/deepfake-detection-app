# Vendors all eye-tracking model assets into public/ so they are served from our
# OWN domain (no external CDN). Re-run after changing @mediapipe/tasks-vision.
#
#   pnpm exec pwsh ./scripts/vendor-eyetracking-assets.ps1
#   (or run directly in PowerShell)
#
# Assets:
#   - MediaPipe wasm runtime (copied from the installed npm package)
#   - MediaPipe FaceLandmarker model (used internally by WebEyeTrack)
#   - MediaPipe FaceDetector model  (blaze_face, used by the gatekeeper)
#   - WebEyeTrack BlazeGaze TF.js model (model.json + weights)

$ErrorActionPreference = 'Stop'

$wasmDir = 'public/models/mediapipe/wasm'
$modelDir = 'public/models/mediapipe'
$webDir = 'public/web'

New-Item -ItemType Directory -Force -Path $wasmDir | Out-Null
New-Item -ItemType Directory -Force -Path $webDir | Out-Null

Copy-Item 'node_modules/@mediapipe/tasks-vision/wasm/*' -Destination $wasmDir -Force

$downloads = @{
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task' = "$modelDir/face_landmarker.task"
    'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite' = "$modelDir/blaze_face_short_range.tflite"
    'https://raw.githubusercontent.com/RedForestAI/WebEyeTrack/main/js/examples/minimal-example/public/web/model.json' = "$webDir/model.json"
    'https://raw.githubusercontent.com/RedForestAI/WebEyeTrack/main/js/examples/minimal-example/public/web/group1-shard1of1.bin' = "$webDir/group1-shard1of1.bin"
}

foreach ($url in $downloads.Keys) {
    Invoke-WebRequest -Uri $url -OutFile $downloads[$url]
    Write-Host "downloaded $($downloads[$url])"
}

Write-Host 'Done. All eye-tracking assets vendored locally.'
