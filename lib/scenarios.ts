export type TrustLevel = 'low' | 'medium' | 'high'

export interface Scenario {
  id: string
  title: string
  description: string
  hint: string
  hintTiming: number // seconds before end when hint appears
  videoSrc?: string
  videoPlaceholder: string
  thumbnailColor: string
  profileImage?: string
  recommendedTrust: TrustLevel
  feedbackCorrect: string
  feedbackIncorrect: string
  educationalTakeaway: string
  source?: string
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
    id: 'political-video',
    title: 'Hantavirus löst Alarm aus in München',
    description: 'Breaking: Tödlicher Hantavirus-Ausbruch in München! Behörden warnen vor hoher Sterblichkeitsrate.',
    hint: 'This looks like an official news update...',
    hintTiming: 5,
    videoSrc: '/Videos/Hantavirus.mp4',
    videoPlaceholder: 'Dramatic political footage - Olaf Scholz speaking at a podium',
    thumbnailColor: 'from-blue-900 to-cyan-800',
    profileImage: '/profile/hantavirus.jpg',
    recommendedTrust: 'low',
    feedbackCorrect: 'You are absolutely right!',
    feedbackIncorrect: 'Think again.',
    educationalTakeaway: 'Professional production quality and urgent tone do not make a story true. Always verify breaking health news through official sources (RKI, official health agencies) before reacting or sharing.',
    source: 'tagesschau',
    isVerified: false,
    isFake: true,
    viewerCount: '12.4K',
    likes: '12,847',
    comments: '3,291',
    shares: '8,102',
    hashtags: '#tagesschau #münchen #hantavirus',
  },
  {
    id: 'tagesschau-tiktok',
    title: 'How I turned €500 into €50,000',
    description: 'I made guaranteed profits with my secret trading strategy! DM me "PROFIT" to join my free signal group 🚀💰',
    hint: 'The dashboard looks impressive!! Is this real?',
    hintTiming: 5,
    videoSrc: '/Videos/trading.mp4',
    videoPlaceholder: 'Professional news broadcast style video',
    thumbnailColor: 'from-blue-800 to-indigo-900',
    profileImage: '/profile/trading.jpg',
    recommendedTrust: 'low',
    feedbackCorrect: 'You are absolutely right!',
    feedbackIncorrect: 'Think again.',
    educationalTakeaway: 'If a stranger on TikTok is showing you their Gains and offering you guaranteed profits, they are selling the dream, not the result. Legitimate investments always carry risk and are regulated. Never hand over money or personal data based on a social media video.',
    source: 'trading_guru',
    isVerified: false,
    isFake: true,
    viewerCount: '45.2K',
    likes: '12,847',
    comments: '3,291',
    shares: '8,102',
    hashtags: '#trading #crypto #passiveincome',
  },
  {
    id: 'deutsche-bahn',
    title: 'Help us save lives — donate today',
    description: 'Every euro counts! Scan the QR code to support children in need. Your donation makes a difference ❤️',
    hint: 'This is heartbreaking... I just donated!',
    hintTiming: 5,
    videoSrc: '/Videos/charity.mp4',
    videoPlaceholder: 'Charity appeal video',
    thumbnailColor: 'from-red-900 to-red-800',
    profileImage: '/profile/charity.jpeg',
    recommendedTrust: 'low',
    feedbackCorrect: 'You are absolutely right!',
    feedbackIncorrect: 'Think again.',
    educationalTakeaway: 'Sympathy is a powerful manipulation tool. Legitimate charities always provide verifiable credentials, transparent fund usage reports, and official payment channels. Scan QR codes only from organisations you can independently confirm.',
    source: 'hwb_ev',
    isVerified: false,
    isFake: true,
    viewerCount: '8.7K',
    likes: '2,156',
    comments: '892',
    shares: '1,203',
    hashtags: '#charity #donate #help',
  },
  {
    id: 'celebrity-endorsement',
    title: 'WAKE UP! They are destroying our country',
    description: 'The mainstream media won\'t show you THIS! Share before they delete it! 🇩🇪 #Widerstand',
    hint: 'Where is the original source or official police statement?',
    hintTiming: 5,
    videoPlaceholder: 'Far-right political agitation video',
    thumbnailColor: 'from-amber-900 to-orange-800',
    recommendedTrust: 'low',
    feedbackCorrect: 'You are absolutely right!',
    feedbackIncorrect: 'Think again.',
    educationalTakeaway: 'Anger and outrage are the most viral emotions — and the most exploited by disinformation. Before sharing politically charged content, ask: Who made this? What evidence is cited? What is left out? Does this confirm what I already believe?',
    source: 'patriot_news_de',
    isVerified: false,
    isFake: true,
    viewerCount: '156K',
    likes: '42,891',
    comments: '8,234',
    shares: '15,672',
    hashtags: '#politik #afd #deutschland',
  },
  {
    id: 'emergency-alert',
    title: 'tagesschau: Bundestag verabschiedet neues Gesetz',
    description: 'Der Bundestag hat heute mit breiter Mehrheit das neue Gesetz beschlossen. Mehr dazu in den tagesthemen.',
    hint: 'This seems trustworthy because the source is identifiable...',
    hintTiming: 5,
    videoPlaceholder: 'Official tagesschau news broadcast',
    thumbnailColor: 'from-blue-950 to-blue-900',
    recommendedTrust: 'high',
    feedbackCorrect: 'You are absolutely right!',
    feedbackIncorrect: 'Think again.',
    educationalTakeaway: 'Trustworthy news content has identifiable verification signals: named sources, institutional credibility markers, a measured tone, and cross-referencing links. Recognising these signals is just as important as spotting fakes.',
    source: 'tagesschau',
    isVerified: true,
    isFake: false,
    viewerCount: '89.3K',
    likes: '5,102',
    comments: '892',
    shares: '2,456',
    hashtags: '#tagesschau #news #bundestag',
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
      return 80
    case 'medium':
      return 50
    case 'high':
      return 20
    default:
      return 50
  }
}

export function getSliderTrustLevel(value: number): TrustLevel {
  if (value < 35) return 'high'
  if (value > 65) return 'low'
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

export function getTrustLevelLabel(level: TrustLevel): string {
  switch (level) {
    case 'high':
      return 'Very trustworthy'
    case 'medium':
      return 'Not sure'
    case 'low':
      return 'Not trustworthy'
  }
}

export function getTrustLevelColorClass(level: TrustLevel): string {
  switch (level) {
    case 'high':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
    case 'medium':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/40'
    case 'low':
      return 'bg-red-500/20 text-red-400 border-red-500/40'
  }
}
