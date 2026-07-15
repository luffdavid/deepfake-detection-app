"use client"

import { 
  Scenario, 
  TrustLevel, 
  isCorrectAssessment, 
  getTrustLevelLabel, 
  getTrustLevelColorClass, 
  getTrustLevelValue, 
  securityChecklist
} from "@/lib/scenarios"

import { Button } from "@/components/ui/button"
import { TRACK_IDS } from "@/lib/track-ids"
import { useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  ClipboardCheck,
  Search,
  MessageSquare,
  BadgeCheck,
  BadgeX,
  Newspaper,
  Heart,
  Brain,
  Shield,
  QrCode,
  AlertTriangle,
  Link2Off,
  Building2,
  ScanSearch,
  FileSearch,
} from "lucide-react"

const iconMap = {
  search: Search,
  "badge-check": BadgeCheck,
  newspaper: Newspaper,
  heart: Heart,
  brain: Brain,
  shield: Shield,
}

interface FeedbackScreenProps {
  scenario: Scenario
  userTrust: TrustLevel
  onContinue: () => void
}

function getCueIcon(cue: string) {
  const cueIconMap: Record<string, typeof Shield> = {
    "Mimicked public-broadcaster branding": Newspaper,
    "Account was not verified": BadgeX,
    "Fear and urgency framing": Heart,
    "No link to an official health authority": Link2Off,

    '"Guaranteed profit" promise': AlertTriangle,
    "Pressure to DM a keyword": MessageSquare,
    "Anonymous, unregulated account": Shield,
    "Screenshots that cannot be verified": ScanSearch,

    "Strong emotional pressure": Heart,
    "QR-code payment": QrCode,
    "No verifiable organisation details": Building2,
    '"Every second counts" urgency': AlertTriangle,

    "No official recall notice": FileSearch,
    "No batch numbers or product details": Search,
    "Alarmist framing": AlertTriangle,
    "Missing source attribution": Link2Off,

    "Verified, named news institution": BadgeCheck,
    "Calm, neutral reporting tone": Brain,
    "Specific, checkable claims": Search,
    "Reported consistently elsewhere": Newspaper,
  }

  return cueIconMap[cue] ?? Shield
}

export function FeedbackScreen({ scenario, userTrust, onContinue }: FeedbackScreenProps) {
  const isCorrect = isCorrectAssessment(userTrust, scenario.recommendedTrust)
  const recommendedSliderValue = getTrustLevelValue(scenario.recommendedTrust)
  const authentic = !scenario.isFake
  const [isChecklistOpen, setIsChecklistOpen] = useState(false)

  return (
    <div className="relative flex h-screen min-h-screen w-screen flex-col items-center justify-center overflow-hidden p-10">
      <div className="absolute right-8 top-8 z-20 flex items-center gap-5">
        <Button
          data-track-id={TRACK_IDS.feedbackChecklistButton}
          onClick={() => setIsChecklistOpen(true)}
          variant="outline"
          className="border-emerald-400/50 bg-emerald-400/10 px-6 py-6 text-3xl text-emerald-100 hover:bg-emerald-400/20"
        >
          <ClipboardCheck className="mr-3 h-8 w-8" />
          Need help? Open checklist
        </Button>

        {/* Checklist popup */}
        <Dialog open={isChecklistOpen} onOpenChange={setIsChecklistOpen}>
          <DialogContent
            overlayClassName="bg-black/55 backdrop-blur-md"
            className="max-h-[92vh] w-[96vw]! max-w-none! overflow-y-auto sm:w-[92vw]! sm:max-w-none! lg:w-[75vw]!"
          >
            <DialogHeader>
              <div className="mx-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary text-xl font-bold">
                <Shield className="h-7 w-7" />
              </div>

              <DialogTitle className="text-center text-4xl font-bold">
                Your deepfake checklist
              </DialogTitle>

              <DialogDescription className="text-center text-base">
                Use these steps before trusting or sharing suspicious content.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {securityChecklist.map((item) => {
                const Icon =
                  iconMap[item.icon as keyof typeof iconMap] ?? Shield

                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-5 rounded-2xl bg-secondary/60 p-6"
                  >
                    <div className="shrink-0 rounded-lg bg-accent/15 p-3 text-accent">
                      <Icon className="h-7 w-7" />
                    </div>

                    <div>
                      <h3 className="text-xl font-bold">{item.title}</h3>

                      <p className="mt-1 text-base leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <Button
              onClick={() => setIsChecklistOpen(false)}
              size="lg"
              className="mt-8 h-16 w-full text-xl font-semibold"
            >
              Got it
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="w-full max-w-4xl space-y-7 animate-scale-in">

        {/* User's choice badge */}
        <div className="text-center">
          <p className="mb-3 text-2xl text-muted-foreground">Your choice:</p>
          <span
            className={`inline-block rounded-full border px-7 py-3 text-xl font-semibold ${
              getTrustLevelColorClass(userTrust)
            }`}
          >
            {getTrustLevelLabel(userTrust)}
          </span>
        </div>

        {/* Result header */}
        <div className="space-y-4 text-center" data-track-id={TRACK_IDS.feedbackResult}>
          <div
            className={`inline-flex rounded-full p-6 ${
              isCorrect ? "bg-emerald-500/20" : "bg-red-500/20"
            }`}
          >
            {isCorrect ? (
              <CheckCircle2 className="h-20 w-20 text-emerald-500" />
            ) : (
              <XCircle className="h-20 w-20 text-red-500" />
            )}
          </div>
          <h1 className="text-5xl font-bold md:text-6xl">
            {isCorrect ? scenario.feedbackCorrect : scenario.feedbackIncorrect}
          </h1>
          <p className="text-3xl text-muted-foreground">
            This content was{" "}
            <span className={scenario.isFake ? "text-red-500 font-bold" : "text-emerald-500 font-bold"}>
              {scenario.isFake ? "FAKE" : "AUTHENTIC"}
            </span>
          </p>
        </div>

        {/* Detailed review */}
        <div className="glass-card animate-slide-up space-y-4 rounded-xl border border-border/60 p-6" style={{ animationDelay: "0.2s" }}>
          <div className="rounded-xl border border-border/60 bg-background/30 p-5" data-track-id={TRACK_IDS.feedbackCues}>
            <h3 className="mb-3 text-2xl font-semibold text-foreground">
              {authentic ? "Trust signals to recognise" : "Signals that mattered"}
            </h3>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {scenario.cues.map((cue) => {
                const CueIcon = getCueIcon(cue)

                return (
                <li key={cue} className="flex items-start gap-3 text-xl text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                      authentic
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-rose-500/15 text-rose-400"
                    }`}
                  >
                    <CueIcon className="h-4.5 w-4.5" />
                  </span>
                  <span className="leading-snug">{cue}</span>
                </li>
                )
              })}
            </ul>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/30 p-5" data-track-id={TRACK_IDS.feedbackWhy}>
            <h3 className="mb-2 text-2xl font-semibold text-foreground">
              {authentic ? "Why it was credible" : "Why it was convincing"}
            </h3>
            <p className="text-xl leading-relaxed text-muted-foreground">{scenario.whyConvincing}</p>
          </div>

         {/*  <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-5">
            <p className="mb-1.5 text-sm font-bold uppercase tracking-wider text-emerald-400">In the real world</p>
            <p className="text-xl leading-relaxed text-foreground/90">{scenario.educationalTakeaway}</p>
          </div> */}
        </div>

       

        {/* Continue button */}
        <Button
          data-track-id={TRACK_IDS.feedbackNextButton}
          onClick={onContinue}
          size="lg"
          className="w-full rounded-xl bg-emerald-600 py-10 text-3xl hover:bg-emerald-700"
        >
          Next scenario
          <ArrowRight className="ml-3 h-9 w-9" />
        </Button>
      </div>
    </div>
  )
}