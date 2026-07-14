/**
 * Analytics Dashboard - Server Component
 * Displays analytics data from PostgreSQL database
 * Internal use only - should be protected with authentication
 */

import { 
  getEventStats, 
  getAnalyticsEvents, 
  getEventTimeSeries, 
  initializeDatabase,
  getVideoStats,
  getVideoReplayStats,
  getSessionStats,
  getAverageVideosPerSession,
} from '@/lib/db'
import { scenarios } from '@/lib/scenarios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function formatPercent(value: number, total: number) {
  if (total <= 0) return '0.0'
  return ((value / total) * 100).toFixed(1)
}

function clampToSliderRange(value: number) {
  return Math.min(100, Math.max(0, value))
}

function getSliderMeaning(value: number) {
  const normalized = clampToSliderRange(value)

  if (normalized < 35) {
    return {
      label: 'Very trustworthy side',
      badgeClass: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
      explanation: 'Users tended to rate this video as trustworthy.',
    }
  }

  if (normalized > 65) {
    return {
      label: 'Not trustworthy side',
      badgeClass: 'text-red-400 border-red-500/40 bg-red-500/10',
      explanation: 'Users tended to rate this video as not trustworthy.',
    }
  }

  return {
    label: 'Not sure range',
    badgeClass: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
    explanation: 'Users were uncertain overall.',
  }
}

function getCompletionInsight(rate: number) {
  if (rate >= 80) return 'Most users complete the full experience.'
  if (rate >= 60) return 'Most users stay engaged to the end.'
  if (rate >= 40) return 'Many users still exit before completion.'
  return 'Risk zone: more users are dropping out than completing.'
}

function getSkipInsight(rate: number) {
  if (rate <= 20) return 'Skip behavior is currently low.'
  if (rate <= 40) return 'Moderate skip behavior: Room for smoother progression.'
  if (rate <= 60) return 'High skip pressure: users frequently jump to results.'
  return 'Critical skip level: most users are bypassing core content.'
}

function getCoverageInsight(rate: number) {
  if (rate >= 90) return 'Near-complete exposure: users are rating almost all videos.'
  if (rate >= 70) return 'Good exposure: most videos are being evaluated.'
  if (rate >= 50) return 'Partial exposure: many sessions miss later videos.'
  return 'Low exposure: users interact with only a small part of the sequence.'
}

function getReplayInsight(rate: number) {
  if (rate >= 60) return 'Users often rewatch this clip, suggesting high ambiguity or curiosity.'
  if (rate >= 30) return 'Rewatch behavior is noticeable and supports careful evaluation.'
  return 'Low rewatch behavior indicates quick first-impression decisions.'
}

export default async function AnalyticsDashboardPage() {
  try {
    // Initialize database on first load
    await initializeDatabase()

    // Fetch analytics data in parallel
    const [
      stats,
      events,
      timeSeries,
      videoStats,
      replayStats,
      sessionStats,
      avgVideosPerSession,
    ] = await Promise.all([
      getEventStats(),
      getAnalyticsEvents({ limit: 50 }),
      getEventTimeSeries(7),
      getVideoStats(),
      getVideoReplayStats(),
      getSessionStats(),
      getAverageVideosPerSession(),
    ])

    const totalSessionCount = stats.totalSessions
    const completedSessionCount = sessionStats.completedSessions
    const skippedSessionCount = sessionStats.skippedSessions
    const sessionOutcomeCount = completedSessionCount + skippedSessionCount
    const completionRate = formatPercent(completedSessionCount, sessionOutcomeCount)
    const completionRateValue = parseFloat(completionRate)
    const skipRate = formatPercent(skippedSessionCount, sessionOutcomeCount)
    const skipRateValue = parseFloat(skipRate)
    const avgVideosPerSessionValue = parseFloat(avgVideosPerSession.avgVideosPerSession)
    const avgVideosCoverageRate = ((avgVideosPerSessionValue / 5) * 100).toFixed(1)
    const avgVideosCoverageRateValue = parseFloat(avgVideosCoverageRate)
    const avgVideosPerSkipValue = parseFloat(sessionStats.avgVideosPerSkip)
    const avgCoverageBeforeSkip = ((avgVideosPerSkipValue / 5) * 100).toFixed(1)
    const scenarioById = new Map(scenarios.map((scenario) => [scenario.id, scenario]))

    return (
      <div className="relative min-h-screen overflow-hidden bg-background px-6 py-8 md:px-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl space-y-8">
          <section className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-2xl backdrop-blur-xl md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">TrustCheck Internal</p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
                  Analytics <span className="bg-linear-to-r from-emerald-300 via-cyan-300 to-amber-300 bg-clip-text text-transparent">Dashboard</span>
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
                  Real-time insight into participant behavior, trust decisions, and session outcomes.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs md:text-sm">
                <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3">
                  <p className="text-muted-foreground">Events tracked</p>
                  <p className="mt-1 text-xl font-semibold">{stats.totalEvents.toLocaleString('en-US')}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3">
                  <p className="text-muted-foreground">Event types</p>
                  <p className="mt-1 text-xl font-semibold">{stats.eventsByType.length}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-emerald-500/25 bg-card/80 shadow-xl backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-emerald-400">{completionRate}%</div>
                <p className="mt-1 text-xs text-muted-foreground">Across all completed or skipped sessions</p>
                <p className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                  {getCompletionInsight(completionRateValue)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-amber-500/25 bg-card/80 shadow-xl backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Skip Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-amber-400">{skipRate}%</div>
                <p className="mt-1 text-xs text-muted-foreground">Across all completed or skipped sessions</p>
                <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  {getSkipInsight(skipRateValue)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-cyan-500/25 bg-card/80 shadow-xl backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sessions Count (Overall)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-cyan-300">{totalSessionCount.toLocaleString('en-US')}</div>
                <p className="mt-1 text-xs text-muted-foreground">Unique sessions tracked in total</p>
                <p className="mt-3 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
                  {totalSessionCount >= 100
                    ? 'Solid sample size: directional insights are becoming more reliable.'
                    : 'Early sample phase: treat patterns as indicative, not final.'}
                </p>
              </CardContent>
            </Card>

          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Current Readout</p>
              <p className="mt-2 text-sm text-foreground/90">
                {completionRateValue >= skipRateValue
                  ? 'Users currently complete the flow more often than they skip it.'
                  : 'Users currently skip the flow more often than they complete it.'}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Engagement Quality</p>
              <p className="mt-2 text-sm text-foreground/90">{getCoverageInsight(avgVideosCoverageRateValue)}</p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="border-border/70 bg-card/85 shadow-xl backdrop-blur">
              <CardHeader>
                <CardTitle className="text-2xl">Video Performance</CardTitle>
                <CardDescription>Per-video submission statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-xl border border-border/70 bg-background/50 p-4">
                    <p className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">Slider reference scale</p>
                    <div className="relative">
                      <div className="h-3 w-full rounded-full bg-linear-to-r from-emerald-500 via-amber-400 to-red-500" />
                      <div className="mt-2 grid grid-cols-3 text-[11px] font-medium text-muted-foreground">
                        <span className="text-left">0</span>
                        <span className="text-center">50</span>
                        <span className="text-right">100</span>
                      </div>
                    </div>
                  </div>

                  {videoStats.length === 0 ? (
                    <p className="text-muted-foreground">No video data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {videoStats.map((video: any, idx: number) => {
                        const scenario = scenarioById.get(String(video.video_id))
                        const isManipulated = scenario?.isFake
                        const statusLabel = isManipulated === true ? 'Manipulated' : isManipulated === false ? 'Real' : 'Unknown'
                        const avgSliderValue = clampToSliderRange(parseFloat(video.avg_slider_value) || 0)
                        const sliderMeaning = getSliderMeaning(avgSliderValue)

                        return (
                          <div key={video.video_id} className="rounded-xl border border-border/60 bg-background/40 p-4">
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <span className="text-sm font-semibold">{scenario?.title || `Video ${idx + 1}`}</span>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-xs ${
                                  isManipulated === true
                                    ? 'text-red-400 border-red-500/40 bg-red-500/10'
                                    : isManipulated === false
                                      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                                      : 'text-muted-foreground border-border bg-muted/40'
                                }`}
                              >
                                {statusLabel}
                              </span>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="text-muted-foreground">Average slider position</span>
                                <span className="font-semibold">{avgSliderValue.toFixed(1)}/100</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className={`rounded-full border px-2 py-0.5 ${sliderMeaning.badgeClass}`}>{sliderMeaning.label}</span>
                                <span className="text-muted-foreground">{sliderMeaning.explanation}</span>
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-muted-foreground">Accuracy</span>
                                <span className="font-semibold text-emerald-400">
                                  {Number(video.total_submissions) > 0
                                    ? ((Number(video.correct_count) / Number(video.total_submissions)) * 100).toFixed(1)
                                    : 0}%
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {Number(video.total_submissions) > 0 && (Number(video.correct_count) / Number(video.total_submissions)) >= 0.75
                                  ? 'Interpretation: users identify this clip reliably.'
                                  : 'Interpretation: this clip is currently difficult to classify correctly.'}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/85 shadow-xl backdrop-blur">
              <CardHeader>
                <CardTitle className="text-2xl">Video Replays</CardTitle>
                <CardDescription>How often videos are replayed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {replayStats.length === 0 ? (
                    <p className="text-muted-foreground">No replay data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {replayStats.map((video: any, idx: number) => (
                        <div key={video.video_id} className="rounded-xl border border-border/60 bg-background/40 p-4">
                          <div className="mb-2 text-sm font-semibold">Video {idx + 1}</div>
                          {(() => {
                            const replayReach = parseFloat(formatPercent(Number(video.unique_sessions), totalSessionCount))
                            return (
                              <p className="mb-2 text-xs text-muted-foreground">{getReplayInsight(replayReach)}</p>
                            )
                          })()}
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Replay Reach</span>
                              <span className="font-semibold">{formatPercent(Number(video.unique_sessions), totalSessionCount)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Avg Replays/Session</span>
                              <span className="font-semibold">
                                {Number(video.unique_sessions) > 0
                                  ? (Number(video.replay_count) / Number(video.unique_sessions)).toFixed(2)
                                  : 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/85 shadow-xl backdrop-blur lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-2xl">Session Behavior</CardTitle>
                <CardDescription>How users complete the experience</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Completed Sessions</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-400">{completionRate}%</p>
                    <p className="mt-2 text-xs text-emerald-300">{getCompletionInsight(completionRateValue)}</p>
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Skipped Sessions</p>
                    <p className="mt-2 text-3xl font-bold text-amber-400">{skipRate}%</p>
                    <p className="mt-2 text-xs text-amber-300">{getSkipInsight(skipRateValue)}</p>
                  </div>
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Avg Progress Before Skip</p>
                    <p className="mt-2 text-3xl font-bold text-cyan-300">{avgCoverageBeforeSkip}%</p>
                    <p className="mt-2 text-xs text-cyan-200">
                      {parseFloat(avgCoverageBeforeSkip) >= 60
                        ? 'Users usually consume a large part of the content before dropping.'
                        : 'Users tend to leave early, before seeing most of the sequence.'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Completion vs Skip</p>
                    <p className="mt-2 text-3xl font-bold text-fuchsia-300">{(parseFloat(completionRate) - parseFloat(skipRate)).toFixed(1)} pp</p>
                    <p className="mt-2 text-xs text-fuchsia-200">
                      {parseFloat(completionRate) - parseFloat(skipRate) >= 0
                        ? 'Positive gap: the journey is currently net-completing.'
                        : 'Negative gap: skip behavior currently dominates completion.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Dashboard error:', error)
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Could not load analytics dashboard. Please check:
            </p>
            <ul className="list-disc list-inside text-sm space-y-2 text-muted-foreground">
              <li>DATABASE_URL is set in environment variables</li>
              <li>PostgreSQL database is accessible</li>
              <li>Check server logs for detailed error information</li>
            </ul>
            <details className="mt-4">
              <summary className="cursor-pointer font-medium">Error Details</summary>
              <pre className="mt-2 bg-muted p-2 rounded text-xs overflow-auto">
                {error instanceof Error ? error.message : 'Unknown error'}
              </pre>
            </details>
          </CardContent>
        </Card>
      </div>
    )
  }
}
