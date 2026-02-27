"use client"
import { useTheme } from "@/components/theme-provider"
import { User, Settings, LogOut, Plus, FileText, ShieldCheck, UserPlus, LogIn } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import React from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SlideUp, FadeIn } from "@/components/ui/motion"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { MobileNav } from "@/components/layout/mobile-nav"
import { NotificationBell } from "@/components/layout/notification-bell"
import { usePresence } from "@/hooks/use-presence"
import { GlobalSearch } from "@/components/layout/global-search"
import Image from "next/image"


const navItems = [
  { label: "Visão Geral", href: "/admin" },
  { label: "Páginas", href: "/cms" },
  { label: "Artigos", href: "/artigos" },
  { label: "Messenger", href: "/messenger" },
]

const guestNavItems: { label: string; href: string }[] = [
  { label: "Início", href: "/" },
  { label: "Artigos", href: "/p/artigos" },
]

export function Header() {
  const config = useTheme()
  const { logo, companyName } = config
  const pathname = usePathname()
  const [isClient, setIsClient] = React.useState(false)
  const { userStatuses, updateStatus } = usePresence()

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      // Se não tiver token, nem tenta buscar o usuário
      if (typeof window === "undefined") return null
      const token = localStorage.getItem('accessToken')
      if (!token) return null

      try {
        const res = await api.get('/api/accounts/users/me/')
        return res.data
      } catch {
        // Se falhar (ex: 401 mesmo com token), limpa o storage para evitar loops futuros
        // mas NÃO redireciona aqui (deixa o usuário como "guest")
        if (typeof window !== "undefined") {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
        }
        return null
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    enabled: isClient
  })

  // Removed unused companies query

  const onLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('companySlug')
    }
    toast.success("Você saiu da conta. Até logo!", { duration: 2000 })

    // Forçar reload completo para limpar estados
    window.location.href = '/'
  }


  return (
    <header className="h-20 sticky top-0 z-50 px-8 flex items-center justify-between border-b glass shadow-sm transition-all duration-500" role="banner" aria-label="Cabeçalho">
      <div className="flex items-center gap-12">
        <SlideUp className="flex items-center gap-12">
          <Link href="/" className="flex items-center gap-3 group" aria-label="Ir para a página inicial">
            {me ? (
              <div className="h-10 w-10 relative flex items-center justify-center overflow-hidden rounded-xl bg-primary/10 shadow-inner">
                {logo ? (
                  <Image
                    src={logo}
                    alt={companyName || "Logo"}
                    width={28}
                    height={28}
                    className="object-contain transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="h-6 w-6 bg-primary rounded-md shadow-lg" />
                )}
              </div>
            ) : (
              <div className="h-10 w-10 relative flex items-center justify-center overflow-hidden rounded-xl bg-primary/10 shadow-inner">
                <div className="h-6 w-6 bg-primary rounded-md shadow-lg" />
              </div>
            )}
            {me && (
              <span className="hidden sm:inline text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 max-w-[180px] sm:max-w-[240px] truncate">
                {companyName}
              </span>
            )}
          </Link>
        </SlideUp>
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Navegação do cabeçalho">
          {(me ? navItems : guestNavItems).map((item, index) => (
            <SlideUp key={item.href} delay={0.1 + index * 0.05}>
              <Button
                variant="ghost"
                asChild
                className={cn(
                  "px-4 font-medium transition-all relative group h-14 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  pathname === item.href ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Link href={item.href} aria-current={(pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))) ? "page" : undefined}>
                  {item.label}
                  {(pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))) && (
                    <motion.div
                      layoutId="header-active"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              </Button>
            </SlideUp>
          ))}
        </nav>
        {/* Global Search CMD+K */}
        {me && (
          <div className="hidden lg:block ml-4">
            <GlobalSearch />
          </div>
        )}
      </div>


      <FadeIn delay={0.4} className="flex items-center gap-4">
        {/* Mobile Navigation Trigger */}
        {me && (
          <div className="md:hidden">
            <MobileNav />
          </div>
        )}

        {/* Theme Toggle Premium */}
        <ThemeToggle />

        {/* Quick Action Menu */}
        {me && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden lg:flex rounded-xl font-bold bg-primary/5 hover:bg-primary/10 border-primary/20 transition-all gap-2 group h-10 px-4">
                <Plus className="h-4 w-4 text-primary transition-transform group-hover:rotate-90" aria-hidden="true" />
                Ação Rápida
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2 bg-popover shadow-xl border p-1.5 translate-y-2">
              <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-2">
                Atalhos de Criação
              </DropdownMenuLabel>
              <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer p-2.5">
                <Link href="/artigos?action=create" className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-orange-500" aria-hidden="true" />
                  </div>
                  <span>Novo Artigo</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer p-2.5">
                <Link href="/cms?action=create" className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <ShieldCheck className="h-4 w-4 text-blue-500" aria-hidden="true" />
                  </div>
                  <span>Nova Página</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer p-2.5">
                <Link href="/admin?action=create" className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <UserPlus className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                  </div>
                  <span>Novo Usuário</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Global Notifications Bell */}
        {me && <NotificationBell />}

        {me ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative rounded-full h-10 w-10 border bg-muted/30 hover:bg-muted/50 transition-all shadow-sm p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" aria-label="Abrir menu do usuário">
                {me?.avatar ? (
                  <div className="relative h-full w-full">
                    <Image src={me.avatar} alt="Avatar" fill className="object-cover rounded-full" sizes="40px" />
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background shadow-sm transition-colors",
                        (userStatuses.get(me.id) || me.status) === 'online' ? "bg-green-500" :
                          (userStatuses.get(me.id) || me.status) === 'busy' ? "bg-amber-500" : "bg-slate-400"
                      )}
                    />
                  </div>
                ) : (
                  <div className="relative h-full w-full flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background shadow-sm transition-colors",
                        (userStatuses.get(me.id) || me.status) === 'online' ? "bg-green-500" :
                          (userStatuses.get(me.id) || me.status) === 'busy' ? "bg-amber-500" : "bg-slate-400"
                      )}
                    />
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2 bg-popover shadow-xl border p-1">
              <DropdownMenuLabel className="font-normal px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-sm group">
                <Link href="/settings?tab=profile" className="flex flex-col space-y-1">
                  <span className="text-sm font-medium leading-none group-hover:text-primary transition-colors">{me?.first_name || me?.username || 'Usuário'}</span>
                  <span className="text-xs leading-none text-muted-foreground">{me?.email || ''}</span>
                </Link>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-muted/50 mx-1" />

              <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-2 pb-1">
                Seu Status
              </DropdownMenuLabel>
              <div className="flex flex-col gap-0.5 px-1 pb-1">
                <DropdownMenuItem
                  onClick={() => updateStatus('online')}
                  className={cn(
                    "flex items-center gap-2 rounded-md cursor-pointer py-2",
                    (userStatuses.get(me.id) || me.status) === 'online' && "bg-primary/10 text-primary font-bold shadow-sm"
                  )}
                >
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                  <span>Online</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => updateStatus('busy')}
                  className={cn(
                    "flex items-center gap-2 rounded-md cursor-pointer py-2",
                    (userStatuses.get(me.id) || me.status) === 'busy' && "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold shadow-sm"
                  )}
                >
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                  <span>Ocupado</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => updateStatus('offline')}
                  className={cn(
                    "flex items-center gap-2 rounded-md cursor-pointer py-2",
                    (userStatuses.get(me.id) || me.status) === 'offline' && "bg-muted text-muted-foreground font-bold shadow-sm"
                  )}
                >
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                  <span>Offline</span>
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator className="bg-muted/50 mx-1" />

              <DropdownMenuItem asChild className="cursor-pointer rounded-md focus:bg-primary/5 focus:text-primary transition-colors">
                <Link href="/settings?tab=profile" className="flex items-center gap-2 w-full">
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  Configurações do Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer rounded-md focus:bg-destructive/5 transition-colors">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="ghost" size="icon" className="rounded-full" asChild>
            <Link href="/login" title="Acessar Sistema">
              <LogIn className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Acessar Sistema</span>
            </Link>
          </Button>
        )}
      </FadeIn>
    </header>
  )
}
