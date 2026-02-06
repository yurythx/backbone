"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, LayoutDashboard, MessageSquare, FileText, Settings, ShieldCheck, Box, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useModules } from "@/hooks/use-modules"

interface SidebarItem {
    title: string
    href: string
    icon: any
    module?: string
}

const navItems: SidebarItem[] = [
    { title: "Painel Admin", href: "/admin", icon: LayoutDashboard },
    { title: "Mensagens", href: "/messenger", icon: MessageSquare, module: "messenger" },
    { title: "Páginas", href: "/cms", icon: ShieldCheck, module: "pages" },
    { title: "Artigos", href: "/artigos", icon: FileText, module: "articles" },
    { title: "Módulos", href: "/admin/modules", icon: Box },
    { title: "Configurações", href: "/settings", icon: Settings },
]

export function MobileNav() {
    const [isOpen, setIsOpen] = React.useState(false)
    const pathname = usePathname()
    const { isModuleActive } = useModules()

    // Close menu when route changes
    React.useEffect(() => {
        setIsOpen(false)
    }, [pathname])

    // Prevent body scroll when menu is open
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    return (
        <div className="md:hidden">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(true)}
                className="text-muted-foreground hover:text-foreground"
            >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-background/95 backdrop-blur-sm z-[100]"
                        />

                        {/* Content */}
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-full bg-background border-r z-[101] shadow-2xl flex flex-col p-6"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
                                        B
                                    </div>
                                    <span className="text-xl font-bold tracking-tight">Backbone</span>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} aria-label="Fechar menu">
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <nav className="flex-1 space-y-2">
                                {navItems.map((item) => {
                                    if (item.module && !isModuleActive(item.module)) {
                                        return null
                                    }

                                    const Icon = item.icon
                                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            aria-current={isActive ? "page" : undefined}
                                            className={cn(
                                                "flex items-center gap-4 px-4 py-3 rounded-xl text-lg font-medium transition-all",
                                                isActive
                                                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                                    : "text-muted-foreground hover:bg-muted"
                                            )}
                                        >
                                            <Icon className="h-5 w-5" />
                                            {item.title}
                                        </Link>
                                    )
                                })}
                            </nav>

                            <div className="mt-auto space-y-4">
                                <div className="p-4 rounded-xl bg-muted/50 border flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm font-bold truncate">Administrador</p>
                                        <p className="text-xs text-muted-foreground truncate">admin@backbone.io</p>
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    className="w-full justify-start gap-3 rounded-xl h-12 text-destructive border-destructive/20 hover:bg-destructive/5"
                                    onClick={() => {
                                        setIsOpen(false)
                                        localStorage.removeItem('accessToken')
                                        localStorage.removeItem('refreshToken')
                                        localStorage.removeItem('companySlug')
                                        toast.success("Você saiu da conta. Até logo!")
                                        window.location.href = '/login'
                                    }}
                                >
                                    <LogOut className="h-5 w-5" />
                                    Sair da Conta
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
