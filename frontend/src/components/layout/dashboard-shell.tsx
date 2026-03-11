"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { SetupAlert } from "@/components/layout/setup-alert"


import { useUIStore } from "@/hooks/use-ui-store"

export function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { isSidebarCollapsed } = useUIStore()

  const showSidebar = pathname?.startsWith('/settings') || pathname?.startsWith('/admin') || pathname?.startsWith('/insights')

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar fixa à esquerda */}
      {showSidebar && <Sidebar />}

      {/* Wrapper do conteúdo principal que se ajusta à largura da sidebar */}
      <div
        className={cn(
          "flex flex-col min-h-screen transition-all duration-300 ease-in-out",
          // Correção Mobile: Padding só é aplicado em desktop (md:)
          showSidebar ? (isSidebarCollapsed ? "md:pl-20" : "md:pl-72") : "pl-0"
        )}
      >
        <Header />
        <SetupAlert />


        <main className="flex-1 px-4 py-6 sm:p-6 md:p-8 overflow-y-auto overflow-x-hidden" role="main" aria-label="Conteúdo principal do dashboard">
          <div className="mx-auto w-full min-w-0 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
