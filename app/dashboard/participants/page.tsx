/**
 * Dashboard → Participants
 *
 * Anonymous per-person analytics. Every locally recognized participant is shown
 * as "Person N" (numbered stably by enrollment order — no names, no PII). The
 * left column navigates between people; the right panel shows that person's
 * attempts, scores and improvement across repeated attempts.
 */

import Link from 'next/link'
import { getPersonDirectoryWithDetail } from '@/lib/face/server/analytics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function pct(v: number | null): string {
  return v === null ? '—' : `${(v * 100).toFixed(0)}%`
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
}

function improvementTone(v: number | null): string {
  if (v === null) return 'text-muted-foreground'
  if (v > 0.0001) return 'text-emerald-400'
  if (v < -0.0001) return 'text-red-400'
  return 'text-muted-foreground'
}

function signed(n: number, digits = 0): string {
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}`
}

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>
}) {
  const sp = await searchParams
  const selectedIndex = Math.max(1, parseInt(sp.p ?? '1', 10) || 1)
  const { directory, detail } = await getPersonDirectoryWithDetail(selectedIndex)

  return (
    <div className="relative min-h-screen bg-background px-6 py-8 md:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">TrustCheck Internal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Participants{' '}
            <span className="bg-linear-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
              Progress
            </span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Anonymous per-person view. Each recognized participant is labelled Person 1, 2, 3 … and never
            by name. Select a person to see their scores and improvement across repeated attempts.
          </p>
        </header>

        {directory.length === 0 ? (
          <Card className="border-border/70 bg-card/80">
            <CardContent className="p-6 text-sm text-muted-foreground">
              No recognized participants yet. People appear here after they are enrolled and complete at
              least one attempt.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
            {/* Left: anonymous person navigation */}
            <nav className="space-y-2">
              <p className="px-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {directory.length} {directory.length === 1 ? 'person' : 'people'}
              </p>
              <div className="max-h-[70vh] space-y-1 overflow-y-auto rounded-2xl border border-border/60 bg-card/50 p-2">
                {directory.map((person) => {
                  const active = detail?.person.index === person.index
                  return (
                    <Link
                      key={person.id}
                      href={`/dashboard/participants?p=${person.index}`}
                      className={[
                        'flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                        active
                          ? 'bg-emerald-500/15 text-emerald-100'
                          : 'text-foreground/80 hover:bg-muted/40',
                      ].join(' ')}
                    >
                      <span className="font-medium">Person {person.index}</span>
                      <span className={`text-xs tabular-nums ${improvementTone(
                        person.attempts <= 1 || person.improvementPp === null
                          ? null
                          : person.improvementPp / 100,
                      )}`}>
                        {person.attempts <= 1
                          ? `${person.attempts}×`
                          : `${signed(person.improvementPct ?? 0)}%`}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </nav>

            {/* Right: selected person detail */}
            {detail && (
              <div className="space-y-6">
                <Card className="border-border/70 bg-card/85">
                  <CardHeader>
                    <CardTitle className="text-2xl">Person {detail.person.index}</CardTitle>
                    <CardDescription>
                      Ref <span className="font-mono">{detail.person.id.slice(0, 8)}</span> · first seen{' '}
                      {fmtDate(detail.person.createdAt)} · last seen {fmtDate(detail.person.lastSeenAt)} ·
                      recognized {detail.person.observations}×
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Headline improvement */}
                    <div className="rounded-2xl border border-border/60 bg-background/50 p-5">
                      {detail.person.attempts <= 1 || detail.person.improvementPct === null ? (
                        <p className="text-sm text-muted-foreground">
                          {detail.person.attempts <= 1
                            ? 'Only one attempt so far — no improvement to compare yet.'
                            : 'Not enough scored attempts to compare yet.'}
                        </p>
                      ) : (
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span
                            className={`text-4xl font-bold ${improvementTone(
                              detail.person.improvementPct / 100,
                            )}`}
                          >
                            {signed(detail.person.improvementPct)}%
                          </span>
                          <span className="text-sm text-muted-foreground">
                            change from first ({pct(detail.person.firstScore)}) to last (
                            {pct(detail.person.lastScore)}) attempt · {signed(detail.person.improvementPp ?? 0)} pp
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Stat cards */}
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className="rounded-xl border border-border/60 bg-background/50 p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Attempts</p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums">{detail.person.attempts}</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-background/50 p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">First</p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums">{pct(detail.person.firstScore)}</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-background/50 p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Last</p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums">{pct(detail.person.lastScore)}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Best</p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-300">
                          {pct(detail.person.bestScore)}
                        </p>
                      </div>
                    </div>

                    {/* Attempt-by-attempt */}
                    <div>
                      <p className="mb-3 text-sm font-medium text-foreground/90">Attempt history</p>
                      {detail.attempts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No attempts recorded yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {detail.attempts.map((a, i) => {
                            const prev = i > 0 ? detail.attempts[i - 1].score : null
                            const delta = prev === null ? null : (a.score - prev) * 100
                            return (
                              <div
                                key={a.id}
                                className="flex items-center gap-4 rounded-xl border border-border/60 bg-background/40 p-3"
                              >
                                <span className="w-16 shrink-0 text-xs text-muted-foreground">#{i + 1}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                    <span>{fmtDate(a.createdAt)}</span>
                                    <span className="tabular-nums">
                                      {a.correctCount}/{a.totalCount} correct
                                    </span>
                                  </div>
                                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                      className="h-full rounded-full bg-linear-to-r from-emerald-500 to-cyan-400"
                                      style={{ width: `${Math.round(a.score * 100)}%` }}
                                    />
                                  </div>
                                </div>
                                <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums">
                                  {Math.round(a.score * 100)}%
                                </span>
                                <span
                                  className={`w-16 shrink-0 text-right text-xs tabular-nums ${improvementTone(
                                    delta === null ? null : delta / 100,
                                  )}`}
                                >
                                  {delta === null ? '—' : `${signed(delta)} pp`}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
