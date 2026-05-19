"use client"

import { Button } from "@/components/ui/button"
import { Play, Shield, Eye } from "lucide-react"

interface IntroScreenProps {
  onStart: () => void
}

export function IntroScreen({ onStart }: IntroScreenProps) {
  return (
    <div className="relative h-screen w-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/20" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-8 max-w-4xl animate-fade-in">
        {/* Logo/Badge */}
        <div className="mb-8 flex justify-center">
          <div className="p-4 rounded-2xl glass-card">
            <Shield className="w-16 h-16 text-accent" />
          </div>
        </div>

        {/* Main headline */}
        <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6 text-balance">
          Can you spot
          <br />
          <span className="text-accent">fake content?</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
          Rate how trustworthy each video feels.
          <br />
          Test your ability to detect deepfakes and misinformation.
        </p>

        {/* Start button */}
        <Button
          onClick={onStart}
          size="lg"
          className="text-xl px-12 py-8 rounded-2xl animate-pulse-glow hover:scale-105 transition-transform duration-300"
        >
          <Play className="w-6 h-6 mr-3" />
          Start Experience
        </Button>

        {/* Info badge */}
        <div className="mt-16 flex items-center justify-center gap-3 text-muted-foreground">
          <Eye className="w-5 h-5" />
          <span className="text-sm tracking-wide uppercase">5 Scenarios • Interactive Trust Rating</span>
        </div>
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-xs text-muted-foreground/60 tracking-widest uppercase">
          LMU Munich • Usable Security Research
        </p>
      </div>
    </div>
  )
}
