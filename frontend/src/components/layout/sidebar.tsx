"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { TenantModule } from "@/types"
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Settings,
  ShieldCheck,
  CreditCard,
  Box,
  ChevronRight
} from "lucide-react"

interface SidebarItem {
  title: string
  href: string
  icon: any
  module?: string // Module code required to see this
}

const sidebarItems: SidebarItem[] = [
  {
    title: "Painel Admin",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Gestão de Módulos",
    href: "/admin/modules",
    icon: Box,
  },
  {
    title: "Configurações",
    href: "/settings",
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  const { data: tenantModules } = useQuery({
    queryKey: ['my-modules'],
    queryFn: async () => {
      const res = await api.get<TenantModule[]>('/api/modules/my-modules/')
      return res.data
    },
  })

  const { data: allModules } = useQuery({
    queryKey: ['modules'],
    queryFn: async () => {
      const res = await api.get<any[]>('/api/modules/available/')
      return res.data
    }
  })

  return (
    <aside className="w-64 border-r bg-background h-[calc(100vh-5rem)] sticky top-20 flex flex-col p-4 shrink-0">
      <nav className="flex-1 space-y-1">
        {sidebarItems.map((item) => {
          // Visibility Logic
          if (item.module) {
            // Backend may return direct array or paginated object { results: [] }
            const moduleList = Array.isArray(allModules) ? allModules : (allModules as any)?.results || []
            const activeList = Array.isArray(tenantModules) ? tenantModules : (tenantModules as any)?.results || []

            const mod = moduleList.find((m: any) => m.code === item.module)
            if (!mod) return null
            const isActive = activeList.some((tm: any) => tm.module === mod.id && tm.is_active)
            if (!isActive) return null
          }

          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className={cn(
                "h-4 w-4 transition-transform group-hover:scale-110",
                isActive ? "text-primary" : "text-muted-foreground"
              )} />
              <span>{item.title}</span>
              {isActive && (
                <div className="ml-auto w-1 h-4 bg-primary rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto px-3 py-2">
        <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Backbone v1.0</p>
          <p className="text-xs text-muted-foreground leading-relaxed">Arquitetura modular equilibrada.</p>
        </div>
      </div>
    </aside>
  )
}
