"use client"

import * as React from "react"
import { Moon, Sun, Monitor, Check } from "lucide-react"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // Evitar erros de hidratação
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="h-9 w-9">
                <div className="h-4 w-4" />
            </Button>
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 relative overflow-hidden group">
                    <AnimatePresence mode="wait" initial={false}>
                        {theme === "light" ? (
                            <motion.div
                                key="sun"
                                initial={{ y: 20, opacity: 0, rotate: -45 }}
                                animate={{ y: 0, opacity: 1, rotate: 0 }}
                                exit={{ y: -20, opacity: 0, rotate: 45 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                            >
                                <Sun className="h-4 w-4 text-orange-500" />
                            </motion.div>
                        ) : theme === "dark" ? (
                            <motion.div
                                key="moon"
                                initial={{ y: 20, opacity: 0, rotate: -45 }}
                                animate={{ y: 0, opacity: 1, rotate: 0 }}
                                exit={{ y: -20, opacity: 0, rotate: 45 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                            >
                                <Moon className="h-4 w-4 text-blue-400" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="system"
                                initial={{ y: 20, opacity: 0, rotate: -45 }}
                                animate={{ y: 0, opacity: 1, rotate: 0 }}
                                exit={{ y: -20, opacity: 0, rotate: 45 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                            >
                                <Monitor className="h-4 w-4 text-muted-foreground" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <span className="sr-only">Alternar tema</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 p-1">
                <DropdownMenuItem
                    onClick={() => setTheme("light")}
                    className="flex items-center justify-between cursor-pointer"
                >
                    <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-orange-500" />
                        <span>Claro</span>
                    </div>
                    {theme === "light" && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme("dark")}
                    className="flex items-center justify-between cursor-pointer"
                >
                    <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4 text-blue-400" />
                        <span>Escuro</span>
                    </div>
                    {theme === "dark" && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme("system")}
                    className="flex items-center justify-between cursor-pointer"
                >
                    <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <span>Sistema</span>
                    </div>
                    {theme === "system" && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
