# TrustCheck - Deepfake Detection Experience

Interactive kiosk-style web app for deepfake awareness research in the LMU Usable Security practical. Participants rate short social-style videos, get immediate feedback, and finish with practical media-literacy guidance.


## What The App Does

- Presents 5 scenarios (manipulated and authentic) in a social feed-like interface
- Collects trust ratings via slider and shows per-scenario feedback
- Shows end-of-run review with score and checklist
- Tracks kiosk sessions with inactivity warning and auto-reset
- Associates repeated attempts with locally recognized participants

## Current Route Flow

Participant journey:

1. / (intro)
2. /experiment/[scenario] (video phase -> feedback phase, repeated per scenario)
3. /complete (summary)
4. restart -> /

Internal routes:

- /dashboard/analytics
- /dashboard/participants
- /dashboard/settings

## Architecture Overview

### 1. Experiment Routing And Tracking Metadata

- lib/experiment-config.ts is the single source of truth for:
  - page ids
  - route mapping
  - next-route flow
  - track-id sets (AOI-ready metadata)
- hooks/use-page-tracking.ts writes page metadata to html data attributes (no data transmission)
- lib/track-ids.ts defines stable technical ids for tracking-relevant UI areas

### 2. Session And Experiment State

- components/experiment-provider.tsx owns session id + scenario results
- hooks/use-session-tracking.ts handles inactivity warning and timeout reset
- Results persist in sessionStorage for the active browser tab session

### 3. Analytics Pipeline

Client side:

- hooks/use-analytics.ts
- Tracks to Vercel Analytics and POST /api/analytics/track in parallel

Server side:

- app/api/analytics/track/route.ts
- lib/db.ts
- app/dashboard/analytics/page.tsx

### 4. Face Recognition Pipeline

Client side local processing:

- hooks/use-face-recognition.ts
- components/face/face-recognition-controller.tsx
- Uses @vladmandic/human in browser

Server side matching and storage:

- app/api/face/recognize/route.ts
- app/api/face/enroll/route.ts
- app/api/face/attempt/route.ts
- lib/face/server/*.ts

Security model highlights:

- Templates are encrypted server-side with AES-256-GCM
- No raw frames or descriptors are persisted in browser storage
- Only pseudonymous participant ids are used in analytics views

## Events Currently Tracked

Core experiment events:

- session_completed
- video_replay
- slider_submitted
- skip_to_results

Additional UX event:

- checklist_viewed

## Environment Variables

Required for analytics and dashboard data:

- DATABASE_URL

Recommended / optional from Vercel Postgres templates:

- DATABASE_URL_UNPOOLED
- POSTGRES_URL
- POSTGRES_URL_NON_POOLING

Required for face template encryption:

- FACE_TEMPLATE_ENC_KEY
  - Base64-encoded 32-byte key (AES-256)

Optional key metadata:

- FACE_TEMPLATE_ENC_KEY_VERSION (default: 1)

Required for dashboard settings admin actions:

- ADMIN_API_TOKEN

Optional cross-origin allowlist for face APIs:

- FACE_API_ALLOWED_ORIGINS

## Local Development

1. Install dependencies

```bash
pnpm install
```

2. Create local environment file

```bash
cp .env.example .env.local
```

3. Add required variables to .env.local

- DATABASE_URL
- FACE_TEMPLATE_ENC_KEY (if you use face recognition endpoints)
- ADMIN_API_TOKEN (if you use dashboard settings destructive actions)

4. Start dev server

```bash
pnpm dev
```

5. Open app

- http://localhost:3000

6. Open dashboard

- http://localhost:3000/dashboard/analytics
- http://localhost:3000/dashboard/participants
- http://localhost:3000/dashboard/settings

## Debug Flags

In browser devtools console:

```javascript
localStorage.setItem('DEBUG_ANALYTICS', 'true')
localStorage.setItem('DEBUG_SESSION', 'true')
localStorage.setItem('FACE_DEBUG', 'true')
location.reload()
```

## Scripts

- pnpm dev - run local development server
- pnpm build - production build
- pnpm start - run production build
- pnpm lint - eslint .

## Operational Notes

- app/layout.tsx mounts Vercel Analytics only in production
- app/api/analytics/init/route.ts exists for manual analytics schema initialization
- Dashboard routes are internal tools and should be protected before public deployment
- Face API origin checks and in-memory rate limiting are implemented server-side

## Quick Start Doc

See QUICK_START.md for an operator-focused setup and test checklist.

## License

MIT