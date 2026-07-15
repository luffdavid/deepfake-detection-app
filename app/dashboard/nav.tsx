"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Settings, ShieldCheck, Users } from "lucide-react"

const links = [
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/participants", label: "Participants", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border/60 bg-card/40 backdrop-blur">
      <div className="flex items-center gap-2 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">TrustCheck</p>
          <p className="text-xs text-muted-foreground">Admin</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-emerald-500/15 text-emerald-200"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto px-5 py-4 text-xs text-muted-foreground">LMU Munich · Usable Security</div>
    </aside>
  )
}
