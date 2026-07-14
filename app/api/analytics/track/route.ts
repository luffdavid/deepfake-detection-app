/**
 * API Route for tracking analytics events
 * Server-only endpoint - stores events in PostgreSQL
 * 
 * This endpoint is called from the client to persist analytics events
 * alongside Vercel Analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { trackAnalyticsEvent } from '@/lib/db'

export const runtime = 'nodejs'

interface TrackEventRequest {
  eventName: string
  properties?: Record<string, string | number | boolean>
  sessionId?: string
}

export async function POST(request: NextRequest) {
  try {
    // CORS check - only allow same-origin requests
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')

    // Allow same-origin requests
    if (origin && !origin.includes(host || '')) {
      return NextResponse.json(
        { error: 'CORS not allowed' },
        { status: 403 }
      )
    }

    const body: TrackEventRequest = await request.json()
    const { eventName, properties, sessionId } = body

    // Validate required fields
    if (!eventName || typeof eventName !== 'string') {
      return NextResponse.json(
        { error: 'eventName is required and must be a string' },
        { status: 400 }
      )
    }

    // Store event in database
    const result = await trackAnalyticsEvent(eventName, properties, sessionId)

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to track event' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, eventId: result.id },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error in analytics tracking endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json(
    { status: 'Analytics tracking endpoint is active' },
    { status: 200 }
  )
}
