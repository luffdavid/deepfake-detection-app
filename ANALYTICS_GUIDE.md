# Analytics Implementation Guide

## Overview

This project now includes a **dual analytics system**:

1. **Vercel Analytics** (Client-side, real-time)
2. **Internal PostgreSQL Database** (Server-side, custom dashboard)

Both systems track the **same events** with the **same properties**, ensuring consistency and no data loss.

## Events Being Tracked

### 1. `session_completed`
- **Triggered**: When user completes all 5 video scenarios and reaches the summary screen
- **Properties**: `{ sessionId: string }`
- **File**: `app/page.tsx` (line ~120)

### 2. `video_replay`
- **Triggered**: When user clicks to replay a video
- **Properties**: `{ sessionId: string, videoId: string }`
- **File**: `components/video-experience.tsx` (line ~246)

### 3. `slider_submitted`
- **Triggered**: When user submits their trust assessment for a video
- **Properties**: `{ sessionId: string, videoId: string, sliderValue: string, isCorrect: boolean }`
- **File**: `components/video-experience.tsx` (line ~214)

## Database Schema

### Table: `analytics_events`

```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name VARCHAR(255) NOT NULL,
  properties JSONB,
  session_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at_date DATE DEFAULT CURRENT_DATE
);
```

**Indexes for performance:**
- `idx_analytics_event_name` - for filtering by event type
- `idx_analytics_session_id` - for session-based queries
- `idx_analytics_created_at` - for time-based queries
- `idx_analytics_created_at_date` - for daily statistics

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

This installs `@vercel/postgres@^0.8.0` which is required for database connections.

### 2. Set Environment Variables

Copy or create `.env.local` with your Vercel Postgres credentials:

```bash
# Option 1: Use Vercel's pooling connection
DATABASE_URL=postgres://user:password@host:port/database

# Option 2: Use Vercel's non-pooling connection (for serverless functions)
DATABASE_URL_UNPOOLED=postgres://user:password@host:port/database
```

You can get these from:
- Vercel Dashboard → Your Project → Storage → Postgres → Connection String
- Or from the `.env.example` file if already configured

### 3. Initialize Database Schema

**Option A: Automatic (First dashboard load)**
When you first visit `/dashboard/analytics`, the schema is automatically created.

**Option B: Manual (For testing)**
```bash
curl http://localhost:3000/api/analytics/init
```

### 4. Test the Implementation

#### Test Event Tracking

In browser console, enable debug mode:
```javascript
localStorage.setItem('DEBUG_ANALYTICS', 'true')
```

Then interact with the app - you should see console logs like:
```
📊 Analytics Event: slider_submitted { sessionId: "...", videoId: "...", sliderValue: "42", isCorrect: true }
```

#### Verify Events in Database

Visit the analytics dashboard:
```
http://localhost:3000/dashboard/analytics
```

You should see:
- **Total Events** - count of all tracked events
- **Total Sessions** - count of unique sessions
- **Charts** - visualization of event distribution and trends
- **Recent Events** - table with latest 50 events

## How It Works

### Client-Side Event Tracking

```typescript
// In any component using useAnalytics()
const { trackEvent, trackSessionCompleted, trackVideoReplay, trackSliderSubmitted } = useAnalytics()

// This automatically:
// 1. Tracks in Vercel Analytics (immediate)
// 2. Sends to /api/analytics/track (async, fire-and-forget)
trackSessionCompleted(sessionId)
```

### Server-Side Event Storage

1. **API Route** (`app/api/analytics/track/route.ts`)
   - Receives events from client
   - Validates data
   - Stores in PostgreSQL via `@vercel/postgres`

2. **Database Utility** (`lib/db.ts`)
   - `trackAnalyticsEvent()` - store single event
   - `getAnalyticsEvents()` - query events with filters
   - `getEventStats()` - get statistics
   - `getEventTimeSeries()` - get time-based data

3. **Dashboard** (`app/dashboard/analytics/page.tsx`)
   - Server-rendered React component
   - Queries analytics data on each load
   - Displays charts using Recharts
   - Shows recent events table

## Architecture Diagram

```
User Interaction (e.g., slider submit)
    ↓
useAnalytics() hook
    ├─→ Vercel Analytics (track)  [Immediate]
    └─→ fetch(/api/analytics/track)  [Async, fire-and-forget]
        ↓
        API Route validates request
        ↓
        PostgreSQL: INSERT into analytics_events
        ↓
    Dashboard queries: SELECT from analytics_events
        ↓
    Visualize with Recharts charts
```

## Deployment to Vercel

1. **Set up Postgres Database**
   - Vercel Dashboard → Your Project → Storage → Create Postgres
   - Copy connection strings to project environment variables

2. **Deploy**
   ```bash
   vercel deploy
   ```

3. **Initialize Database** (if not auto-initialized)
   ```bash
   curl https://your-project.vercel.app/api/analytics/init
   ```

4. **Access Dashboard**
   ```
   https://your-project.vercel.app/dashboard/analytics
   ```

## Data Privacy & Security

⚠️ **Important Considerations:**

1. **Session IDs** are stored in the database - ensure GDPR compliance
2. **Dashboard is public** - implement authentication before going to production:
   ```typescript
   // In app/dashboard/analytics/page.tsx
   import { auth } from '@/auth' // your auth library
   
   export default async function Page() {
     const session = await auth()
     if (!session?.user?.isAdmin) {
       return redirect('/')
     }
     // ...
   }
   ```

3. **API Endpoint** accepts all same-origin POST requests - add rate limiting if needed

## Troubleshooting

### "Database initialization error" on dashboard

**Problem**: DATABASE_URL not set or database not accessible

**Solution**:
1. Check `.env.local` has correct DATABASE_URL
2. Verify Vercel Postgres database is active
3. Check network connectivity to database
4. View detailed error in browser dev tools

### Events not appearing in database

**Problem**: Events are tracked in console but not in database table

**Solution**:
1. Open browser DevTools → Network tab
2. Check if POST to `/api/analytics/track` succeeds (status 200)
3. Look for error response if status is not 200
4. Enable debug mode: `localStorage.setItem('DEBUG_ANALYTICS', 'true')`
5. Check server logs for API errors

### "Unauthorized - Database initialization" error

**Problem**: Getting 403 when calling `/api/analytics/init`

**Solution**: This is expected in production. The route is only accessible:
- In development mode (NODE_ENV=development), OR
- From localhost, OR
- With valid `x-init-token` header

For production, initialize manually via Vercel CLI or remove this route.

### Vercel Analytics not showing up

**Problem**: Events tracked in database but not in Vercel Analytics

**Solution**:
1. Vercel Analytics only works in production (`NODE_ENV=production`)
2. In development, events silently fail to track (expected)
3. Deploy to Vercel or set `NODE_ENV=production` locally to test
4. Check Vercel project settings → Analytics is enabled

## File Structure

```
app/
  ├── api/
  │   └── analytics/
  │       ├── init/route.ts      ← Database initialization
  │       └── track/route.ts     ← Event tracking endpoint
  ├── dashboard/
  │   ├── layout.tsx             ← Dashboard layout
  │   └── analytics/
  │       └── page.tsx           ← Analytics dashboard
  └── page.tsx                   ← Main app (unchanged)
lib/
  ├── db.ts                      ← Database utilities (NEW)
  └── scenarios.ts               ← Existing
hooks/
  └── use-analytics.ts           ← Updated with DB tracking
components/
  └── video-experience.tsx       ← Unchanged, uses updated hook
```

## Performance Notes

- **Database queries** on dashboard are fast due to indexes
- **Event storage** is async (fire-and-forget) - doesn't block user interaction
- **Time series data** limited to last 7 days by default (can be configured)
- **Dashboard table** shows last 50 events (can be paginated)

## Next Steps

1. ✅ Add authentication to `/dashboard/analytics`
2. 📊 Add more detailed analytics (user flows, funnel analysis)
3. 📧 Set up alerts for anomalies
4. 📈 Export analytics data (CSV, JSON)
5. 🔍 Search/filter interface for events
6. 📱 Mobile-optimized dashboard

## Questions or Issues?

See the troubleshooting section above, or check:
- Server logs: `vercel logs` or Vercel Dashboard
- Browser console: Enable debug mode with localStorage flag
- Database: Connect via Vercel CLI: `vercel postgres connect`

---

**Implementation Date**: 2024  
**Vercel Analytics Version**: 1.6.1  
**Postgres Driver**: @vercel/postgres 0.8.0+  
**Database**: PostgreSQL (Vercel Postgres)
