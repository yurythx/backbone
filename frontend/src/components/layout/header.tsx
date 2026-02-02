"use client"

import { useTheme as useNextTheme } from "next-themes"
import { useTheme } from "@/components/theme-provider"
import { Moon, Sun, Menu, User, Settings, LogOut, Building2 } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import React from "react"
import { Button } from "@/components/ui/button"
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

const navItems = [
  { label: "Visão Geral", href: "/admin" },
  { label: "Páginas", href: "/cms" },
  { label: "Artigos", href: "/artigos" },
  { label: "Messenger", href: "/messenger" },
  { label: "Administração", href: "/admin" },
]

export function Header() {
  const config = useTheme() // Branding/Tenant configuration
  const { theme: nextTheme, setTheme: setNextTheme } = useNextTheme()
  const { logo, companyName } = config
  const pathname = usePathname()
  const router = useRouter()

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/api/accounts/users/me/')
      return res.data
    }
  })

  const { data: companies } = useQuery({
    queryKey: ['public-companies'],
    queryFn: async () => {
      const res = await api.get('/api/core/companies/public_list/')
      return res.data
    }
  })

  const onLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('companySlug')
    }
    router.replace('/login')
  }

  return (
    <header className="h-20 glass-morphism sticky top-0 z-50 px-8 flex items-center justify-between border-b-0 shadow-sm transition-all duration-500">
      <div className="flex items-center gap-12">
        <SlideUp className="flex items-center gap-12">
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 relative flex items-center justify-center overflow-hidden rounded-xl bg-primary/10 shadow-inner">
              {logo ? (
                <img
                  src={logo}
                  alt={companyName}
                  className="object-contain h-7 w-7 transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="h-6 w-6 bg-primary rounded-md shadow-lg" />
              )}
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              {companyName}
            </span>
          </Link>
        </SlideUp>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item, index) => (
            <SlideUp key={item.href} delay={0.1 + index * 0.05}>
              <Button
                variant="ghost"
                asChild
                className={cn(
                  "px-4 font-medium transition-all relative group h-14",
                  pathname === item.href ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Link href={item.href}>
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
      </div>

      <FadeIn delay={0.4} className="flex items-center gap-4">
        {/* Mobile Navigation Trigger */}
        <div className="md:hidden">
          <MobileNav />
        </div>

        {/* Theme Toggle Premium */}
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 border bg-muted/30 hover:bg-muted/50 transition-all shadow-sm">
              <User className="h-5 w-5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2 glass-morphism shadow-xl border-0 p-1">
            <DropdownMenuLabel className="font-normal px-3 py-2">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium leading-none">{me?.first_name || me?.username || 'Usuário'}</span>
                <span className="text-xs leading-none text-muted-foreground">{me?.email || ''}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-muted/50 mx-1" />
            <DropdownMenuLabel className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-1">Trocar Empresa</DropdownMenuLabel>
            <div className="max-h-40 overflow-y-auto px-1">
              {(companies || []).map((c: any) => (
                <button
                  key={c.slug}
                  onClick={() => {
                    localStorage.setItem('companySlug', c.slug)
                    window.dispatchEvent(new Event('app-company-changed'))
                    window.location.reload()
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-primary/5 hover:text-primary transition-colors text-left"
                >
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-sm">{c.name}</span>
                </button>
              ))}
            </div>
            <DropdownMenuSeparator className="bg-muted/50 mx-1" />
            <DropdownMenuItem asChild className="cursor-pointer rounded-md focus:bg-primary/5 focus:text-primary transition-colors">
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer rounded-md focus:bg-destructive/5 transition-colors">
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </FadeIn>
    </header>
  )
}
