# Quick Start - TrustCheck (Current Version)

This quick start reflects the current project state, including:

- Route-based experiment flow
- PostgreSQL analytics
- Local face recognition with encrypted server-side templates
- Internal dashboard (analytics, participants, settings)

## 1) Prerequisites

- Node.js LTS
- pnpm
- PostgreSQL via Vercel Postgres (or compatible DATABASE_URL)

## 2) Install

```bash
pnpm install
```

## 3) Configure Environment

Create local env file:

```bash
cp .env.example .env.local
```

Add at least:

```bash
DATABASE_URL=postgres://...
```

If you want face recognition endpoints (/api/face/*), also add:

```bash
# Base64-encoded 32-byte key (AES-256)
FACE_TEMPLATE_ENC_KEY=...

# Optional, defaults to 1
FACE_TEMPLATE_ENC_KEY_VERSION=1
```

If you want to use dashboard settings deletion tools, also add:

```bash
ADMIN_API_TOKEN=your-strong-admin-token
```

Optional hardening:

```bash
FACE_API_ALLOWED_ORIGINS=https://your-domain.com,https://your-admin-domain.com
```

## 4) Run

```bash
pnpm dev
```

Open:

- Participant app: http://localhost:3000
- Analytics dashboard: http://localhost:3000/dashboard/analytics
- Participants dashboard: http://localhost:3000/dashboard/participants
- Settings dashboard: http://localhost:3000/dashboard/settings

## 5) Verify Core Flow

1. Start at / and click start.
2. Go through scenario pages under /experiment/[scenario].
3. Submit at least one trust rating.
4. Reach /complete.
5. Check /dashboard/analytics for recorded events.

Expected key events:

- slider_submitted
- video_replay
- skip_to_results
- session_completed
- checklist_viewed

## 6) Optional Debug Flags

In browser devtools console:

```javascript
localStorage.setItem('DEBUG_ANALYTICS', 'true')
localStorage.setItem('DEBUG_SESSION', 'true')
localStorage.setItem('FACE_DEBUG', 'true')
location.reload()
```

## 7) Database Initialization Notes

- Analytics schema is initialized from server code paths (for example when loading dashboard analytics).
- Manual init route is available at GET /api/analytics/init.

## 8) Security Checklist Before Production

1. Protect all /dashboard/* routes with authentication/authorization.
2. Keep .env.local out of git.
3. Rotate FACE_TEMPLATE_ENC_KEY and ADMIN_API_TOKEN using your secrets workflow.
4. Restrict face API origins via FACE_API_ALLOWED_ORIGINS where possible.
5. Review the analytics init route policy for your deployment model.

## 9) Troubleshooting

### Dashboard shows loading error

- Confirm DATABASE_URL is set correctly.
- Confirm database is reachable from runtime.

### Face endpoints return encryption_unavailable

- FACE_TEMPLATE_ENC_KEY is missing or invalid.
- It must decode from base64 to exactly 32 bytes.

### No analytics events appear

- Check browser network calls to /api/analytics/track.
- Enable DEBUG_ANALYTICS and retry.

### pnpm lint fails with eslint not found

- Install eslint in the project dev dependencies or adapt the lint script.

## 10) File Map

- Main flow and routing: app/page.tsx, app/experiment/[scenario]/page.tsx, app/complete/page.tsx
- Experiment state/session: components/experiment-provider.tsx, hooks/use-session-tracking.ts
- Analytics: hooks/use-analytics.ts, app/api/analytics/track/route.ts, lib/db.ts
- Face recognition: hooks/use-face-recognition.ts, app/api/face/*, lib/face/server/*
- Dashboard: app/dashboard/analytics/page.tsx, app/dashboard/participants/page.tsx, app/dashboard/settings/*
