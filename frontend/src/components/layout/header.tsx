"use client"

import { useTheme as useNextTheme } from "next-themes"
import { Moon, Sun, User, Settings, LogOut, Loader2 } from "lucide-react"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import Link from "next/link"
import React from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { MobileNav } from "@/components/layout/mobile-nav"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Building2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const navItems = [
  { label: "Visão Geral", href: "/admin" },
  { label: "CMS", href: "/cms" },
  { label: "Artigos", href: "/artigos" },
  { label: "Módulos", href: "/admin/modules" },
  { label: "Configurações", href: "/settings" },
]

export function Header() {
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

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname?.startsWith(href))
  const onLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('companySlug')
    }
    router.replace('/login')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-gradient-to-r from-primary/10 via-background to-primary/5 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-8">
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold group-hover:rotate-12 transition-transform">
              B
            </div>
            <span className="hidden sm:inline-block text-xl font-bold tracking-tight">Backbone</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  "text-muted-foreground hover:text-foreground relative h-9 px-4 transition-colors rounded-full",
                  isActive(item.href) && "text-foreground font-semibold bg-primary/10"
                )}
              >
                <Link href={item.href} aria-current={isActive(item.href) ? "page" : undefined}>
                  {item.label}
                  {isActive(item.href) && (
                    <div className="absolute inset-x-4 -bottom-[12px] h-[2px] bg-primary/70 rounded-t-full" aria-hidden="true" />
                  )}
                </Link>
              </Button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile Navigation Trigger */}
          <MobileNav />

          {/* Theme Toggle Premium */}
          <ThemeToggle />

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-full border bg-muted/40 hover:bg-muted shadow-sm"
              >
                <User className="h-5 w-5" />
                <span className="sr-only">Abrir menu do usuário</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                    <span className="text-sm font-medium leading-none">{me?.first_name || me?.username || 'Usuário'}</span>
                    <span className="text-xs leading-none text-muted-foreground">{me?.email || ''}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
                <DropdownMenuItem className="h-auto py-2">
                  <div className="w-full">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Trocar Empresa</div>
                    <div className="space-y-1">
                      {(companies || []).map((c: any) => (
                        <button
                          key={c.slug}
                          onClick={() => {
                            localStorage.setItem('companySlug', c.slug)
                            window.dispatchEvent(new Event('app-company-changed'))
                            window.location.reload()
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition"
                        >
                          <Building2 className="h-4 w-4 text-primary" />
                          <span className="text-sm">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2 w-full cursor-pointer">
                  <Settings className="h-4 w-4" />
                  <span>Configurações</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="flex items-center gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
