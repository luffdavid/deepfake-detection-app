/**
 * Dashboard Layout
 * Layout for admin/analytics routes
 */

import type { Metadata } from 'next'
import { DashboardNav } from './nav'

export const metadata: Metadata = {
  title: 'Analytics Dashboard | TrustCheck',
  description: 'Internal analytics dashboard for TrustCheck project',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-dvh bg-background">
      <DashboardNav />
      <div className="flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
    </div>
  )
}
