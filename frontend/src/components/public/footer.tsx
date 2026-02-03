"use client"

import { useTheme } from "@/components/theme-provider"
import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react"

export function PublicFooter() {
    const { companyName, footerText, socialLinks } = useTheme()
    const year = new Date().getFullYear()

    return (
        <footer className="border-t bg-muted/30">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center justify-between">
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {footerText || `© ${year} ${companyName}. Todos os direitos reservados.`}
                        </p>

                        <div className="flex items-center gap-4">
                            {socialLinks.facebook && (
                                <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-background border hover:text-primary transition-all">
                                    <Facebook className="h-4 w-4" />
                                </a>
                            )}
                            {socialLinks.instagram && (
                                <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-background border hover:text-primary transition-all">
                                    <Instagram className="h-4 w-4" />
                                </a>
                            )}
                            {socialLinks.linkedin && (
                                <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-background border hover:text-primary transition-all">
                                    <Linkedin className="h-4 w-4" />
                                </a>
                            )}
                            {socialLinks.twitter && (
                                <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-background border hover:text-primary transition-all">
                                    <Twitter className="h-4 w-4" />
                                </a>
                            )}
                        </div>
                    </div>

                    <nav className="flex items-center gap-8 text-sm text-muted-foreground font-medium md:justify-end">
                        <a href="#" className="hover:text-primary transition-colors">Privacidade</a>
                        <a href="#" className="hover:text-primary transition-colors">Termos de Uso</a>
                        <a href="#" className="hover:text-primary transition-colors">Cookies</a>
                    </nav>
                </div>
            </div>
        </footer>
    )
}
