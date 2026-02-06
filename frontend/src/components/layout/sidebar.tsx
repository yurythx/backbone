"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { TenantModule } from "@/types"
import { useModules } from "@/hooks/use-modules"
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Settings,
  ShieldCheck,
  CreditCard,
  Box,
  ChevronRight,
  TrendingUp
} from "lucide-react"
import { SlideUp } from "@/components/ui/motion"
import { motion } from "framer-motion"

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
    title: "Insights",
    href: "/insights",
    icon: TrendingUp,
  },
  {
    title: "Mensagens",
    href: "/messenger",
    icon: MessageSquare,
    module: "messenger",
  },
  {
    title: "Páginas",
    href: "/cms",
    icon: ShieldCheck,
    module: "pages",
  },
  {
    title: "Artigos",
    href: "/artigos",
    icon: FileText,
    module: "articles",
  },
  {
    title: "Membros",
    href: "/admin/users",
    icon: ShieldCheck,
  },
  {
    title: "Papéis de Acesso",
    href: "/admin/roles",
    icon: ShieldCheck,
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
  const { isModuleActive } = useModules()

  return (
    <aside className="hidden md:flex w-64 glass-morphism h-[calc(100vh-5rem)] sticky top-20 flex-col p-4 shrink-0 border-r-0 shadow-lg z-40 transition-all duration-500 overflow-y-auto">
      <nav className="flex-1 space-y-2">
        {sidebarItems.map((item, index) => {
          // Visibility Logic
          if (item.module && !isModuleActive(item.module)) {
            return null
          }

          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <SlideUp key={item.href} delay={index * 0.05}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative overflow-hidden",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Icon className={cn(
                  "h-4 w-4 transition-transform duration-500 group-hover:scale-110",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                )} />
                <span className="relative z-10">{item.title}</span>

                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            </SlideUp>
          )
        })}
      </nav>

      <SlideUp delay={0.4} className="mt-auto px-3 py-2">
        <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10 glass-morphism shadow-inner group">
          <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-2 opacity-70">Backbone v1.0</p>
          <p className="text-xs text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
            Experiência digital refinada para negócios modernos.
          </p>
        </div>
      </SlideUp>
    </aside>
  )
}
