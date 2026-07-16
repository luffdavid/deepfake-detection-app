# Analytics Guide (Current)

This document describes the current analytics and participant-progress data model in TrustCheck.

It covers:

- Event tracking (client + server)
- Dashboard data sources
- Face-recognition progress analytics
- Security and operations

## 1. System Overview

TrustCheck uses a combined analytics architecture:

1. Vercel Analytics via @vercel/analytics
2. Internal PostgreSQL analytics_events table
3. Face-recognition participant progress tables (encrypted template storage + non-biometric progress analytics)

High-level data flow:

1. Client calls useAnalytics() on user interaction.
2. useAnalytics() sends events to:
    - track() (Vercel)
    - POST /api/analytics/track (PostgreSQL)
3. Dashboard pages query aggregated metrics server-side.
4. Face-recognition pipeline stores participant attempts and recognition metadata for repeated-attempt analysis.

## 2. Event Catalog

Current tracked event names in useAnalytics:

- session_completed
   - properties: { sessionId }
- video_replay
   - properties: { sessionId, videoId }
- slider_submitted
   - properties: { sessionId, videoId, sliderValue, isCorrect }
- skip_to_results
   - properties: { sessionId, videoCount }
- checklist_viewed
   - properties: { source }

Notes:

- checklist_viewed is emitted through trackEvent in the summary checklist dialog.
- Event writes are fire-and-forget for database persistence, so analytics never blocks UX.

## 3. Analytics Database Model

Table: analytics_events

```sql
CREATE TABLE IF NOT EXISTS analytics_events (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   event_name VARCHAR(255) NOT NULL,
   properties JSONB,
   session_id VARCHAR(255),
   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
   created_at_date DATE DEFAULT CURRENT_DATE
);
```

Indexes:

- idx_analytics_event_name
- idx_analytics_session_id
- idx_analytics_created_at
- idx_analytics_created_at_date

Query helpers in lib/db.ts include:

- trackAnalyticsEvent
- getAnalyticsEvents
- getEventStats
- getEventTimeSeries
- getVideoStats
- getVideoReplayStats
- getSessionStats
- getAverageVideosPerSession

## 4. API Endpoints

Analytics endpoints:

- POST /api/analytics/track
   - validates eventName
   - same-origin check
   - stores event via lib/db.ts
- GET /api/analytics/track
   - health/status check

- GET /api/analytics/init
   - manual analytics schema init route
   - guarded for development/localhost/token scenarios

Face endpoints related to participant analytics:

- POST /api/face/enroll
   - stores encrypted template + metadata
- POST /api/face/recognize
   - server-side matching against encrypted templates
- POST /api/face/attempt
   - stores score/progress attempt for a participant

## 5. Dashboard Structure

Route map:

- /dashboard/analytics
   - event and session metrics
   - video performance + replay behavior
   - completion vs skip insights
   - face repeated-attempt overview

- /dashboard/participants
   - anonymous directory (Person 1, Person 2, ...)
   - per-person attempt timeline and improvement stats

- /dashboard/settings
   - verify data counts
   - delete one participant (cascade)
   - delete all participant data
   - requires ADMIN_API_TOKEN validation via server actions

## 6. Face Participant Analytics Model

Face data is stored in dedicated tables (server-only):

- face_participants
- face_attempts
- face_recognition_events

Important privacy/security properties:

- Biometric templates are encrypted server-side (AES-256-GCM).
- No raw descriptors/frames are stored in browser persistence.
- Dashboard participant views expose anonymous labels and aggregate progress metrics only.

Aggregations provided by lib/face/server/analytics.ts:

- total recognized participants
- returning participants (multi-attempt)
- recognized-again count
- improved/regressed counts
- average first vs last attempt score

## 7. Environment Variables

Required for analytics data storage:

- DATABASE_URL

Optional Postgres vars from Vercel templates:

- DATABASE_URL_UNPOOLED
- POSTGRES_URL
- POSTGRES_URL_NON_POOLING

Required for face template encryption:

- FACE_TEMPLATE_ENC_KEY
   - base64 key that decodes to exactly 32 bytes

Optional encryption metadata:

- FACE_TEMPLATE_ENC_KEY_VERSION (default: 1)

Required for settings admin actions:

- ADMIN_API_TOKEN

Optional origin allowlist for face APIs:

- FACE_API_ALLOWED_ORIGINS

## 8. Local Validation Checklist

1. Set DATABASE_URL in .env.local.
2. Start app with pnpm dev.
3. Perform a full run from / to /complete.
4. Trigger at least one replay and one slider submission.
5. Open /dashboard/analytics and confirm metrics update.
6. If face pipeline is enabled, verify participants/attempts appear in /dashboard/participants.

Optional debug flags:

```javascript
localStorage.setItem('DEBUG_ANALYTICS', 'true')
localStorage.setItem('DEBUG_SESSION', 'true')
localStorage.setItem('FACE_DEBUG', 'true')
location.reload()
```

## 9. Security Notes

Before production rollout:

1. Protect all /dashboard/* routes with authz.
2. Keep admin and encryption secrets in secure env management.
3. Review analytics init endpoint policy for your deployment model.
4. Consider stronger/shared rate limiting if serverless scaling requires cross-instance guarantees.

Current guards in code:

- Same-origin checks on analytics/face endpoints
- Payload-size limits for face endpoints
- In-memory rate limiting for face endpoints
- Constant-time admin token verification

## 10. Troubleshooting

### Dashboard load error

- Verify DATABASE_URL exists and DB is reachable.
- Check server logs for DB connectivity errors.

### No events in dashboard

- Confirm POST /api/analytics/track returns 200.
- Enable DEBUG_ANALYTICS and reproduce.

### Face endpoint returns encryption_unavailable

- FACE_TEMPLATE_ENC_KEY missing/invalid.
- Ensure base64 decodes to 32 bytes.

### Settings actions return unauthorized

- ADMIN_API_TOKEN missing or does not match server secret.

### /api/analytics/init returns unauthorized

- Expected outside allowed development/localhost/token conditions.

## 11. Reference Files

- hooks/use-analytics.ts
- lib/db.ts
- app/api/analytics/track/route.ts
- app/api/analytics/init/route.ts
- app/dashboard/analytics/page.tsx
- app/dashboard/participants/page.tsx
- app/dashboard/settings/page.tsx
- app/dashboard/settings/actions.ts
- hooks/use-face-recognition.ts
- lib/face/server/analytics.ts
- lib/face/server/participants-db.ts
- lib/face/server/crypto.ts
