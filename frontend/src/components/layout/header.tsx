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

const navItems = [
  { label: "Visão Geral", href: "/" },
  { label: "CMS (Páginas)", href: "/cms" },
  { label: "Artigos", href: "/artigos" },
  { label: "Messenger", href: "/messenger" },
  { label: "Administração", href: "/admin" },
]

export function Header() {
  const { theme, setTheme } = useNextTheme()
  const { logo, companyName } = useTheme()
  const pathname = usePathname()

  return (
    <header className="h-20 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-50">
      <div className="flex items-center gap-12">
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 relative flex items-center justify-center overflow-hidden rounded-lg bg-primary/5">
            {logo ? (
              <img src={logo} alt={companyName} className="object-contain h-8 w-8 transition-transform group-hover:scale-110" />
            ) : (
              <div className="h-8 w-8 bg-primary rounded" />
            )}
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            {companyName}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              asChild
              className={cn(
                "px-4 font-medium transition-colors",
                pathname === item.href ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-muted-foreground hover:text-foreground"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 border bg-muted/30">
              <User className="h-5 w-5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mobile Menu Button */}
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </div>
    </header>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
