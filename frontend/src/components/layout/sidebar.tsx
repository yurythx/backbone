"use client"

import { useUIStore } from "@/hooks/use-ui-store"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useModules } from "@/hooks/use-modules"
import { useTheme } from "@/components/theme-provider"
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Settings,
  Shield,
  Users,
  Package,
  ChevronRight,
  TrendingUp,
  Globe,
  LogOut
} from "lucide-react"
import { SlideUp } from "@/components/ui/motion"
import { motion, AnimatePresence } from "framer-motion"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SidebarItem {
  title: string
  href: string
  icon: any
  module?: string
  exact?: boolean
}

interface SidebarSection {
  title?: string
  items: SidebarItem[]
}

const sidebarSections: SidebarSection[] = [
  {
    items: [
      {
        title: "Visão Geral",
        href: "/admin",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        title: "Insights",
        href: "/insights",
        icon: TrendingUp,
      },
    ]
  },
  {
    title: "Módulos",
    items: [
      {
        title: "Mensagens",
        href: "/messenger",
        icon: MessageSquare,
        module: "messenger",
      },
      {
        title: "Páginas",
        href: "/cms",
        icon: Globe,
        module: "pages",
      },
      {
        title: "Artigos",
        href: "/artigos",
        icon: FileText,
        module: "articles",
      },
    ]
  },
  {
    title: "Administração",
    items: [
      {
        title: "Membros",
        href: "/admin/users",
        icon: Users,
      },
      {
        title: "Papéis e Permissões",
        href: "/admin/roles",
        icon: Shield,
      },
      {
        title: "Módulos do Sistema",
        href: "/admin/modules",
        icon: Package,
      },
      {
        title: "Configurações",
        href: "/settings",
        icon: Settings,
      },
    ]
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isModuleActive } = useModules()
  const { isSidebarCollapsed, toggleSidebar } = useUIStore()
  const { logo, companyName } = useTheme()

  return (
    <aside
      className={cn(
        "border-r h-screen fixed left-0 top-0 hidden md:flex flex-col transition-all duration-300 z-50 glass",
        isSidebarCollapsed ? "w-20" : "w-72"
      )}
    >
      {/* Header / Logo Area */}
      <div className={cn(
          "h-16 flex items-center border-b border-border/50 transition-all duration-300",
          isSidebarCollapsed ? "justify-center px-0" : "px-6"
      )}>
         <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
            {/* Logo Wrapper */}
            <div className={cn(
                "flex-shrink-0 transition-all duration-300 flex items-center justify-center",
                isSidebarCollapsed ? "h-10 w-10" : "h-8 w-8"
            )}>
               {logo ? (
                 <img src={logo} alt={companyName || "Logo"} className="h-full w-full object-contain" />
               ) : (
                 <div className="h-full w-full rounded-lg bg-primary/20 flex items-center justify-center">
                    <span className="text-lg">🦴</span>
                 </div>
               )}
            </div>
            
            {/* Company Name (Hidden when collapsed) */}
            <span className={cn(
                "font-bold text-lg tracking-tight transition-all duration-300 opacity-100",
                isSidebarCollapsed && "opacity-0 w-0 hidden"
            )}>
                {companyName || "Backbone"}
            </span>
         </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "absolute -right-3 top-20 bg-background border rounded-full p-1.5 shadow-md z-30 transition-transform duration-300 hover:bg-muted hover:scale-110",
          !isSidebarCollapsed && "rotate-180"
        )}
      >
        <ChevronRight className="h-3 w-3" />
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6 scrollbar-thin scrollbar-thumb-muted-foreground/20">
        <TooltipProvider delayDuration={0}>
          {sidebarSections.map((section, sectionIndex) => {
            // Filter items based on active modules
            const visibleItems = section.items.filter(
              (item) => !item.module || isModuleActive(item.module)
            )

            if (visibleItems.length === 0) return null

            return (
              <div key={sectionIndex} className="space-y-2">
                {!isSidebarCollapsed && section.title && (
                  <h4 className="px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground/70 mb-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    {section.title}
                  </h4>
                )}
                
                <div className="space-y-1">
                  {visibleItems.map((item, itemIndex) => {
                    const Icon = item.icon
                    const isActive = item.exact
                      ? pathname === item.href
                      : pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
                              isActive
                                ? "text-primary bg-primary/10 shadow-sm"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                              isSidebarCollapsed && "justify-center px-2"
                            )}
                          >
                            <Icon className={cn(
                              "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
                              isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                            )} />
                            
                            {!isSidebarCollapsed && (
                              <span className="relative z-10 transition-all duration-300">{item.title}</span>
                            )}

                            {isActive && (
                              <motion.div
                                layoutId="sidebar-active"
                                className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-full"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              />
                            )}
                          </Link>
                        </TooltipTrigger>
                        {isSidebarCollapsed && (
                          <TooltipContent side="right" className="font-semibold glass border-none shadow-xl text-foreground">
                            {item.title}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </TooltipProvider>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 bg-background/20">
         {!isSidebarCollapsed ? (
            <div className="bg-gradient-to-br from-primary/10 to-transparent rounded-2xl p-4 border border-primary/10 shadow-sm group hover:border-primary/20 transition-all cursor-default">
              <div className="flex items-center gap-3 mb-2">
                 <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    BB
                 </div>
                 <div>
                    <p className="text-xs font-bold text-foreground">Backbone SaaS</p>
                    <p className="text-[10px] text-muted-foreground">v1.0.0 Stable</p>
                 </div>
              </div>
            </div>
         ) : (
            <div className="flex justify-center">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary cursor-help" title="Backbone v1.0">
                    v1
                 </div>
            </div>
         )}
      </div>
    </aside>
  )
}
