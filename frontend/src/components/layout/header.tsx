"use client"

import { useTheme as useNextTheme } from "next-themes"
import { useTheme } from "@/components/theme-provider"
import { Moon, Sun, Menu, User, Settings, LogOut } from "lucide-react"
import { usePathname } from "next/navigation"
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

const navItems = [
  { label: "Visão Geral", href: "/" },
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
                  {pathname === item.href && (
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
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setNextTheme(nextTheme === "dark" ? "light" : "dark")}
          className="text-muted-foreground hover:text-foreground group h-10 w-10"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 group-hover:text-primary" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 group-hover:text-primary" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 border bg-muted/30 hover:bg-muted/50 transition-all shadow-sm">
              <User className="h-5 w-5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2 glass-morphism shadow-xl border-0 p-1">
            <DropdownMenuLabel className="font-bold px-3 py-2">Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-muted/50 mx-1" />
            <DropdownMenuItem asChild className="cursor-pointer rounded-md focus:bg-primary/5 focus:text-primary transition-colors">
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer rounded-md focus:bg-destructive/5 transition-colors">
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mobile Menu Button */}
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </FadeIn>
    </header>
  )
}
