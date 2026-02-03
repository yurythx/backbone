"use client"

import Link from "next/link"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export function PublicNavbar() {
    const { logo, companyName, isLoading } = useTheme()

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-6">
                    <Link href="/p/artigos" className="flex items-center space-x-2">
                        {isLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : logo ? (
                            <img src={logo} alt={companyName} className="h-8 w-auto object-contain" />
                        ) : (
                            <span className="font-bold text-xl tracking-tight">{companyName}</span>
                        )}
                    </Link>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                        <Link href="/p/artigos" className="transition-colors hover:text-primary">
                            Artigos
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/login">Área do Cliente</Link>
                    </Button>
                </div>
            </div>
        </header>
    )
}
