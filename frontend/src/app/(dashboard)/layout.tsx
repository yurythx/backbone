"use client"

import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PresenceHeartbeat } from "@/components/layout/presence-heartbeat"

/**
 * DashboardLayout — proteção primária feita via middleware.ts (server-side).
 * Este layout assume que o usuário já está autenticado.
 * O middleware redireciona para /login antes mesmo de renderizar esta página.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardShell>
      <PresenceHeartbeat />
      {children}
    </DashboardShell>
  )
}
