"use client"

import Link from "next/link"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import Image from "next/image"
import { usePathname } from "next/navigation"

export function PublicNavbar() {
    const { logo, companyName, isLoading } = useTheme()
    const pathname = usePathname()

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95" role="banner" aria-label="Cabeçalho">
            <div className="mx-auto max-w-7xl flex h-16 items-center justify-between px-6 md:px-8">
                <div className="flex items-center gap-6">
                    <Link href="/p/artigos" className="flex items-center space-x-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md" aria-label="Ir para Artigos">
                        {isLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
                        ) : logo ? (
                            <Image src={logo} alt={companyName || 'Logo'} width={32} height={32} className="object-contain" />
                        ) : (
                            <span className="font-bold text-xl tracking-tight">{companyName}</span>
                        )}
                    </Link>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium" role="navigation" aria-label="Navegação pública">
                        <Link href="/p/artigos" className="transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md" aria-current={(pathname === '/p/artigos' || pathname?.startsWith('/p/artigos')) ? 'page' : undefined}>
                            Artigos
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                        <Link href="/login">Área do Cliente</Link>
                    </Button>
                </div>
            </div>
        </header>
    )
}
