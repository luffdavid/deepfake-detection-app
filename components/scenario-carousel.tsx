"use client"

import { useEffect, useState } from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { ScenarioReviewSlide } from "./scenario-review-slide"
import type { ScenarioReview } from "@/types/scenario"

interface ScenarioCarouselProps {
  scenarios: ScenarioReview[]
  activeIndex: number
  onIndexChange: (index: number) => void
}

export function ScenarioCarousel({ scenarios, activeIndex, onIndexChange }: ScenarioCarouselProps) {
  const [api, setApi] = useState<CarouselApi>()

  // Keep parent state in sync when the user swipes/drags the carousel.
  useEffect(() => {
    if (!api) return
    onIndexChange(api.selectedScrollSnap())
    const handleSelect = () => onIndexChange(api.selectedScrollSnap())
    api.on("select", handleSelect)
    return () => {
      api.off("select", handleSelect)
    }
  }, [api, onIndexChange])

  // Keep the carousel in sync when the parent (e.g. the overview strip) changes the index.
  useEffect(() => {
    if (!api) return
    if (api.selectedScrollSnap() !== activeIndex) {
      api.scrollTo(activeIndex)
    }
  }, [activeIndex, api])

  return (
    <section className="w-full max-w-2xl mx-auto px-4 py-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground/70">
          Scenario review
        </h2>
        <span className="text-xs text-muted-foreground">
          {activeIndex + 1} / {scenarios.length}
        </span>
      </div>

      <Carousel setApi={setApi} className="w-full" opts={{ align: "start" }}>
        <CarouselContent>
          {scenarios.map((scenario, index) => (
            <CarouselItem key={scenario.id}>
              <ScenarioReviewSlide
                scenario={scenario}
                index={index}
                total={scenarios.length}
                userTrust={scenario.userTrust}
                isCorrect={scenario.isCorrect}
              />
            </CarouselItem>
          ))}
        </CarouselContent>

        <div className="flex justify-center gap-3 mt-5">
          <CarouselPrevious className="static translate-y-0" />
          <CarouselNext className="static translate-y-0" />
        </div>
      </Carousel>
    </section>
  )
}
