"use client"

/**
 * Dashboard → Settings
 *
 * Operator tools to delete participant recognition data and verify deletion.
 * All operations require the admin token (validated server-side). No participant
 * data is ever shown here beyond aggregate row counts.
 */

import { useState, useTransition } from "react"
import { AlertTriangle, CheckCircle2, Loader2, Trash2, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  deleteAllAction,
  deleteParticipantAction,
  verifyStatusAction,
  type AdminResult,
} from "./actions"

type Counts = NonNullable<AdminResult["counts"]>

function errorMessage(code?: string): string {
  switch (code) {
    case "unauthorized":
      return "Invalid admin token."
    case "invalid_confirmation":
      return 'You must type exactly "DELETE ALL" to confirm.'
    case "invalid_participant_id":
      return "That is not a valid participant ID (expected a UUID)."
    case "server_error":
      return "Server error. Check the database connection and try again."
    default:
      return "Something went wrong."
  }
}

function CountsView({ counts }: { counts: Counts }) {
  const allZero = counts.participants === 0 && counts.attempts === 0 && counts.recognitionEvents === 0
  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-3">
          <p className="text-2xl font-semibold tabular-nums">{counts.participants}</p>
          <p className="text-xs text-muted-foreground">Participants</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-3">
          <p className="text-2xl font-semibold tabular-nums">{counts.attempts}</p>
          <p className="text-xs text-muted-foreground">Attempts</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-3">
          <p className="text-2xl font-semibold tabular-nums">{counts.recognitionEvents}</p>
          <p className="text-xs text-muted-foreground">Recognition events</p>
        </div>
      </div>
      {allZero ? (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> All participant data has been deleted.
        </p>
      ) : (
        <p className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          <AlertTriangle className="h-4 w-4" /> Participant data is still present.
        </p>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const [token, setToken] = useState("")
  const [participantId, setParticipantId] = useState("")
  const [confirmPhrase, setConfirmPhrase] = useState("")
  const [counts, setCounts] = useState<Counts | null>(null)
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<AdminResult>, successText: string) {
    setMessage(null)
    startTransition(async () => {
      const res = await action()
      if (res.counts) setCounts(res.counts)
      if (res.ok) {
        setMessage({ kind: "ok", text: successText })
      } else {
        setMessage({ kind: "err", text: errorMessage(res.error) })
      }
    })
  }

  return (
    <div className="relative min-h-screen bg-background px-6 py-8 md:px-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">TrustCheck Internal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Manage locally recognized participant data. All participant templates are stored encrypted
            in PostgreSQL only — nothing is stored in the browser.
          </p>
        </header>

        {/* Admin token */}
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-emerald-300" /> Admin authentication
            </CardTitle>
            <CardDescription>
              Enter the admin token (server secret <code className="text-xs">ADMIN_API_TOKEN</code>). It is
              validated on the server and never stored.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="admin-token">Admin token</Label>
            <Input
              id="admin-token"
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="••••••••••••••••"
              className="mt-1"
            />
          </CardContent>
        </Card>

        {/* Verify / tester */}
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">Verify stored data</CardTitle>
            <CardDescription>Check how many participant records currently exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              disabled={pending || !token}
              onClick={() => run(() => verifyStatusAction(token), "Status loaded.")}
            >
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Check current status
            </Button>
            {counts && <CountsView counts={counts} />}
          </CardContent>
        </Card>

        {/* Delete single participant */}
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">Delete a single participant</CardTitle>
            <CardDescription>
              Removes the participant template, recognition events, progress and attempts (cascading).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="participant-id">Participant ID (UUID)</Label>
              <Input
                id="participant-id"
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
                className="mt-1 font-mono"
              />
            </div>
            <Button
              variant="outline"
              disabled={pending || !token || !participantId}
              onClick={() =>
                run(() => deleteParticipantAction(token, participantId.trim()), "Participant deleted.")
              }
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete participant
            </Button>
          </CardContent>
        </Card>

        {/* Delete everything */}
        <Card className="border-red-500/40 bg-red-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-red-300">
              <AlertTriangle className="h-4 w-4" /> Delete ALL participant data
            </CardTitle>
            <CardDescription>
              Irreversibly deletes every participant template, all recognition history, progress and
              attempts. Use this at the end of the project. Type <strong>DELETE ALL</strong> to confirm.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="confirm-phrase">Confirmation</Label>
              <Input
                id="confirm-phrase"
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder="DELETE ALL"
                className="mt-1"
              />
            </div>
            <Button
              variant="destructive"
              disabled={pending || !token || confirmPhrase !== "DELETE ALL"}
              onClick={() =>
                run(() => deleteAllAction(token, confirmPhrase), "All participant data deleted.")
              }
            >
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete everything
            </Button>
          </CardContent>
        </Card>

        {message && (
          <p
            className={[
              "rounded-lg border px-4 py-3 text-sm",
              message.kind === "ok"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300",
            ].join(" ")}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  )
}
