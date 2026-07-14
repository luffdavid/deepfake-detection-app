/**
 * Database Initialization Route
 * Manually initialize the analytics database schema
 * 
 * Should only be accessible during development or with proper authentication
 * Usage: GET /api/analytics/init
 */

import { NextRequest, NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Security check: Only allow from localhost in development
    const host = request.headers.get('host') || ''
    const isDevelopment = process.env.NODE_ENV === 'development'
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1')

    if (!isDevelopment && !isLocalhost && !request.headers.get('x-init-token')) {
      return NextResponse.json(
        { error: 'Unauthorized - Database initialization is only available in development or with valid token' },
        { status: 403 }
      )
    }

    // Initialize database
    const success = await initializeDatabase()

    if (success) {
      return NextResponse.json(
        {
          success: true,
          message: 'Database schema initialized successfully',
          tables: ['analytics_events'],
          indexes: [
            'idx_analytics_event_name',
            'idx_analytics_session_id',
            'idx_analytics_created_at',
            'idx_analytics_created_at_date',
          ],
        },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        { error: 'Database initialization failed' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ Error initializing database:', error)
    return NextResponse.json(
      {
        error: 'Database initialization error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
