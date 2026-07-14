/**
 * Dashboard Layout
 * Layout for admin/analytics routes
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Analytics Dashboard | TrustCheck',
  description: 'Internal analytics dashboard for TrustCheck project',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="h-dvh overflow-y-auto overflow-x-hidden">{children}</div>
}
