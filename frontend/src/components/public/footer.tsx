"use client"

import { useTheme } from "@/components/theme-provider"

export function PublicFooter() {
    const { companyName } = useTheme()
    const year = new Date().getFullYear()

    return (
        <footer className="border-t bg-muted/30">
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                        © {year} {companyName}. Todos os direitos reservados.
                    </p>
                    <nav className="flex items-center gap-6 text-sm text-muted-foreground font-medium">
                        <a href="#" className="hover:text-primary transition-colors">Privacidade</a>
                        <a href="#" className="hover:text-primary transition-colors">Termos</a>
                    </nav>
                </div>
            </div>
        </footer>
    )
}
