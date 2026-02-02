"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"

export function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/admin')

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        {isAdminRoute && <Sidebar />}
        <main className={cn(
          "flex-1 p-4 md:p-8 bg-background overflow-x-hidden",
          !isAdminRoute && "max-w-7xl mx-auto w-full"
        )}>
          {children}
        </main>
      </div>
    </div>
  )
}
