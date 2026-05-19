export type TrustLevel = 'low' | 'medium' | 'high'

export interface Scenario {
  id: string
  title: string
  description: string
  hint: string
  hintTiming: number // seconds before end when hint appears
  videoPlaceholder: string
  thumbnailColor: string
  recommendedTrust: TrustLevel
  feedbackCorrect: string
  feedbackIncorrect: string
  educationalTakeaway: string
  source: string
  isVerified: boolean
  isFake: boolean
  // TikTok-style engagement metrics
  viewerCount?: string
  likes?: string
  comments?: string
  shares?: string
  hashtags?: string
}

export const scenarios: Scenario[] = [
  {
    id: 'flood-munich',
    title: 'Breaking: Massive Flood Hits Munich Central Station',
    description: 'Something big just happened in the city center... stay safe!',
    hint: 'It has been raining a lot recently...',
    hintTiming: 5,
    videoPlaceholder: 'Dramatic flood footage - water rushing through train station',
    thumbnailColor: 'from-blue-900 to-cyan-800',
    recommendedTrust: 'low',
    feedbackCorrect: 'You are absolutely right!',
    feedbackIncorrect: 'Think again.',
    educationalTakeaway: 'Weather conditions can make fake content seem more plausible. Always verify dramatic claims with official sources before sharing.',
    source: 'citizen_report',
    isVerified: false,
    isFake: true,
    viewerCount: '12.4K',
    likes: '8,231',
    comments: '1,452',
    shares: '3,276',
    hashtags: '#news #breaking',
  },
  {
    id: 'tagesschau-tiktok',
    title: 'Tagesschau: New Government Policy Announced',
    description: 'Breaking: New digital identity requirements for all German citizens starting next month. More details soon.',
    hint: 'Tagesschau is a trusted news source...',
    hintTiming: 5,
    videoPlaceholder: 'Professional news broadcast style video',
    thumbnailColor: 'from-blue-800 to-indigo-900',
    recommendedTrust: 'low',
    feedbackCorrect: 'You are absolutely right!',
    feedbackIncorrect: 'Think again.',
    educationalTakeaway: 'Professional visuals and familiar branding can strongly increase perceived credibility. Deepfakes often impersonate trusted sources.',
    source: 'tagesschau_official',
    isVerified: false,
    isFake: true,
    viewerCount: '45.2K',
    likes: '12,847',
    comments: '3,291',
    shares: '8,102',
    hashtags: '#tagesschau #germany #politics',
  },
  {
    id: 'deutsche-bahn',
    title: 'DB Service Update: ICE Routes Affected',
    description: 'Important: Construction work on Munich-Berlin route this weekend. Check the DB app for alternatives.',
    hint: 'The account is verified.',
    hintTiming: 5,
    videoPlaceholder: 'Official Deutsche Bahn announcement',
    thumbnailColor: 'from-red-900 to-red-800',
    recommendedTrust: 'high',
    feedbackCorrect: 'You are absolutely right!',
    feedbackIncorrect: 'Think again.',
    educationalTakeaway: 'Verification badges from official platforms indicate authentic accounts. However, always cross-reference important information.',
    source: 'deutschebahn',
    isVerified: true,
    isFake: false,
    viewerCount: '8.7K',
    likes: '2,156',
    comments: '892',
    shares: '1,203',
    hashtags: '#deutschebahn #ice #travel',
  },
  {
    id: 'celebrity-endorsement',
    title: 'Famous Actor Endorses Crypto Investment',
    description: 'I made millions with this simple trick... You can too! Link in bio',
    hint: 'This seems too good to be true...',
    hintTiming: 5,
    videoPlaceholder: 'Celebrity speaking directly to camera',
    thumbnailColor: 'from-amber-900 to-orange-800',
    recommendedTrust: 'low',
    feedbackCorrect: 'You are absolutely right!',
    feedbackIncorrect: 'Think again.',
    educationalTakeaway: 'Celebrity deepfakes are commonly used for financial scams. If it seems too good to be true, it probably is.',
    source: 'crypto_wealth_tips',
    isVerified: false,
    isFake: true,
    viewerCount: '156K',
    likes: '42,891',
    comments: '8,234',
    shares: '15,672',
    hashtags: '#crypto #invest #millionaire',
  },
  {
    id: 'emergency-alert',
    title: 'Emergency: Evacuation Order for City Center',
    description: 'URGENT: Gas leak detected! Evacuate immediately. Share this with everyone you know!',
    hint: 'Check if this matches official emergency channels...',
    hintTiming: 5,
    videoPlaceholder: 'Urgent emergency broadcast style',
    thumbnailColor: 'from-red-950 to-red-900',
    recommendedTrust: 'low',
    feedbackCorrect: 'You are absolutely right!',
    feedbackIncorrect: 'Think again.',
    educationalTakeaway: 'Fake emergency alerts exploit fear and urgency. Always verify through official government apps and websites before taking action.',
    source: 'emergency_munich',
    isVerified: false,
    isFake: true,
    viewerCount: '89.3K',
    likes: '5,102',
    comments: '12,847',
    shares: '28,456',
    hashtags: '#emergency #munich #urgent',
  },
]

export const securityChecklist = [
  {
    id: 'verify-sources',
    title: 'Verify Sources',
    description: 'Always check if the content comes from the original, official source',
    icon: 'search',
  },
  {
    id: 'check-badges',
    title: 'Look for Verification Badges',
    description: 'Official accounts on major platforms display verification marks',
    icon: 'badge-check',
  },
  {
    id: 'trusted-outlets',
    title: 'Check Trusted News Outlets',
    description: 'Cross-reference breaking news with established media organizations',
    icon: 'newspaper',
  },
  {
    id: 'emotional-manipulation',
    title: 'Question Emotional Manipulation',
    description: 'Content that triggers strong emotions may be designed to bypass critical thinking',
    icon: 'heart',
  },
  {
    id: 'context-plausibility',
    title: 'Verify Context and Plausibility',
    description: 'Consider if the content makes sense given what you know about the world',
    icon: 'brain',
  },
]

export function getTrustLevelValue(level: TrustLevel): number {
  switch (level) {
    case 'low':
      return 20
    case 'medium':
      return 50
    case 'high':
      return 80
    default:
      return 50
  }
}

export function getSliderTrustLevel(value: number): TrustLevel {
  if (value < 35) return 'low'
  if (value > 65) return 'high'
  return 'medium'
}

export function isCorrectAssessment(userTrust: TrustLevel, recommended: TrustLevel): boolean {
  // For fake content (low trust recommended), user should rate low
  // For real content (high trust recommended), user should rate high
  // Medium is only correct if recommended is medium
  if (recommended === 'low') {
    return userTrust === 'low'
  }
  if (recommended === 'high') {
    return userTrust === 'high'
  }
  return userTrust === 'medium'
}
