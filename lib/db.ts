/**
 * Database utilities for Vercel Postgres
 * All database operations must be server-only
 */

import { sql } from '@vercel/postgres'

export type AnalyticsEventRecord = {
  id: string
  event_name: string
  properties: Record<string, string | number | boolean | null>
  session_id?: string
  created_at: string
}

/**
 * Initialize database schema (creates tables if they don't exist)
 * Run this once on deployment or manually
 */
export async function initializeDatabase() {
  try {
    // Create analytics_events table
    await sql`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_name VARCHAR(255) NOT NULL,
        properties JSONB,
        session_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at_date DATE DEFAULT CURRENT_DATE
      );
    `

    // Create indexes for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_analytics_event_name 
      ON analytics_events(event_name);
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_analytics_session_id 
      ON analytics_events(session_id);
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_analytics_created_at 
      ON analytics_events(created_at);
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_analytics_created_at_date 
      ON analytics_events(created_at_date);
    `

    console.log('✅ Database schema initialized successfully')
    return true
  } catch (error) {
    console.error('❌ Database initialization error:', error)
    throw error
  }
}

/**
 * Track an analytics event in the database
 * Server-only function - must not be called from client
 */
export async function trackAnalyticsEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean>,
  sessionId?: string
): Promise<AnalyticsEventRecord | null> {
  try {
    const result = await sql<AnalyticsEventRecord>`
      INSERT INTO analytics_events (event_name, properties, session_id)
      VALUES (
        ${eventName},
        ${properties ? JSON.stringify(properties) : null}::jsonb,
        ${sessionId || null}
      )
      RETURNING *;
    `

    return result.rows[0] || null
  } catch (error) {
    console.error('❌ Error tracking analytics event:', error)
    // Don't throw - analytics should not break the app
    return null
  }
}

/**
 * Get all analytics events with optional filters
 */
export async function getAnalyticsEvents(options?: {
  eventName?: string
  sessionId?: string
  limit?: number
  offset?: number
  startDate?: Date
  endDate?: Date
}) {
  try {
    const limit = options?.limit || 50
    const offset = options?.offset || 0

    // Build query based on filters
    if (options?.eventName && options?.sessionId) {
      const result = await sql<AnalyticsEventRecord>`
        SELECT * FROM analytics_events 
        WHERE event_name = ${options.eventName} AND session_id = ${options.sessionId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return result.rows
    }

    if (options?.eventName) {
      const result = await sql<AnalyticsEventRecord>`
        SELECT * FROM analytics_events 
        WHERE event_name = ${options.eventName}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return result.rows
    }

    if (options?.sessionId) {
      const result = await sql<AnalyticsEventRecord>`
        SELECT * FROM analytics_events 
        WHERE session_id = ${options.sessionId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return result.rows
    }

    if (options?.startDate && options?.endDate) {
      const result = await sql<AnalyticsEventRecord>`
        SELECT * FROM analytics_events 
        WHERE created_at >= ${options.startDate} AND created_at <= ${options.endDate}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return result.rows
    }

    if (options?.startDate) {
      const result = await sql<AnalyticsEventRecord>`
        SELECT * FROM analytics_events 
        WHERE created_at >= ${options.startDate}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return result.rows
    }

    if (options?.endDate) {
      const result = await sql<AnalyticsEventRecord>`
        SELECT * FROM analytics_events 
        WHERE created_at <= ${options.endDate}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return result.rows
    }

    // Default: return all events
    const result = await sql<AnalyticsEventRecord>`
      SELECT * FROM analytics_events 
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    return result.rows
  } catch (error) {
    console.error('❌ Error fetching analytics events:', error)
    return []
  }
}

/**
 * Get event count statistics
 */
export async function getEventStats() {
  try {
    const totalResult = await sql`
      SELECT COUNT(*) as total FROM analytics_events;
    `

    const byTypeResult = await sql`
      SELECT event_name, COUNT(*) as count 
      FROM analytics_events 
      GROUP BY event_name 
      ORDER BY count DESC;
    `

    const sessionsResult = await sql`
      SELECT COUNT(DISTINCT session_id) as total 
      FROM analytics_events 
      WHERE session_id IS NOT NULL;
    `

    return {
      totalEvents: parseInt(totalResult.rows[0]?.total || '0'),
      eventsByType: byTypeResult.rows,
      totalSessions: parseInt(sessionsResult.rows[0]?.total || '0'),
    }
  } catch (error) {
    console.error('❌ Error fetching event stats:', error)
    return {
      totalEvents: 0,
      eventsByType: [],
      totalSessions: 0,
    }
  }
}

/**
 * Get time series data for events (grouped by date)
 */
export async function getEventTimeSeries(days: number = 7) {
  try {
    // Calculate the date from N days ago
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const result = await sql`
      SELECT 
        created_at_date as date,
        event_name,
        COUNT(*) as count
      FROM analytics_events
      WHERE created_at_date >= ${startDate.toISOString().split('T')[0]}
      GROUP BY created_at_date, event_name
      ORDER BY created_at_date DESC, event_name
    `
    return result.rows
  } catch (error) {
    console.error('❌ Error fetching time series:', error)
    return []
  }
}

/**
 * Get detailed video statistics
 */
export async function getVideoStats() {
  try {
    const result = await sql`
      SELECT 
        properties->>'videoId' as video_id,
        COUNT(*) as total_submissions,
        AVG(CAST(properties->>'sliderValue' AS FLOAT)) as avg_slider_value,
        SUM(CASE WHEN properties->>'isCorrect' = 'true' THEN 1 ELSE 0 END) as correct_count
      FROM analytics_events
      WHERE event_name = 'slider_submitted'
      GROUP BY video_id
      ORDER BY total_submissions DESC
    `
    return result.rows
  } catch (error) {
    console.error('❌ Error fetching video stats:', error)
    return []
  }
}

/**
 * Get video replay statistics
 */
export async function getVideoReplayStats() {
  try {
    const result = await sql`
      SELECT 
        properties->>'videoId' as video_id,
        COUNT(*) as replay_count,
        COUNT(DISTINCT properties->>'sessionId') as unique_sessions
      FROM analytics_events
      WHERE event_name = 'video_replay'
      GROUP BY video_id
      ORDER BY replay_count DESC
    `
    return result.rows
  } catch (error) {
    console.error('❌ Error fetching replay stats:', error)
    return []
  }
}

/**
 * Get session completion statistics
 */
export async function getSessionStats() {
  try {
    const result = await sql`
      SELECT 
        COUNT(DISTINCT CASE WHEN event_name = 'session_completed' THEN properties->>'sessionId' END) as completed_sessions,
        COUNT(DISTINCT CASE WHEN event_name = 'skip_to_results' THEN properties->>'sessionId' END) as skipped_sessions,
        AVG(CAST(properties->>'videoCount' AS FLOAT)) as avg_videos_per_skip
      FROM analytics_events
      WHERE event_name IN ('session_completed', 'skip_to_results')
    `
    const row = result.rows[0]
    return {
      completedSessions: parseInt(row?.completed_sessions || '0'),
      skippedSessions: parseInt(row?.skipped_sessions || '0'),
      avgVideosPerSkip: parseFloat(row?.avg_videos_per_skip || '0').toFixed(2),
    }
  } catch (error) {
    console.error('❌ Error fetching session stats:', error)
    return {
      completedSessions: 0,
      skippedSessions: 0,
      avgVideosPerSkip: '0',
    }
  }
}

/**
 * Get average videos per session (completed only)
 */
export async function getAverageVideosPerSession() {
  try {
    const result = await sql`
      SELECT 
        COUNT(DISTINCT session_id) as total_sessions,
        AVG(slider_count) as avg_sliders
      FROM (
        SELECT 
          properties->>'sessionId' as session_id,
          COUNT(*) as slider_count
        FROM analytics_events
        WHERE event_name = 'slider_submitted'
        GROUP BY properties->>'sessionId'
      ) as session_stats
    `
    const row = result.rows[0]
    return {
      totalSessions: parseInt(row?.total_sessions || '0'),
      avgVideosPerSession: parseFloat(row?.avg_sliders || '0').toFixed(2),
    }
  } catch (error) {
    console.error('❌ Error fetching average videos per session:', error)
    return {
      totalSessions: 0,
      avgVideosPerSession: '0',
    }
  }
}
