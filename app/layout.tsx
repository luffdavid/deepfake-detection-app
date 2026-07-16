import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ExperimentProvider } from '@/components/experiment-provider'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter'
});
const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: '--font-geist-mono'
});

export const metadata: Metadata = {
  title: 'TrustCheck | Deepfake Detection Experience',
  description: 'An interactive public display for detecting deepfakes and misinformation on social media. A usable security project by LMU Munich.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} bg-background`}>
      <head>
        <link rel="dns-prefetch" href="https://pub-5d3075f6487b4d3b9aea4e8c811e8bff.r2.dev" />
        <link rel="preconnect" href="https://pub-5d3075f6487b4d3b9aea4e8c811e8bff.r2.dev" crossOrigin="" />
      </head>
      <body className="font-sans antialiased min-h-screen">
        <ExperimentProvider>{children}</ExperimentProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
