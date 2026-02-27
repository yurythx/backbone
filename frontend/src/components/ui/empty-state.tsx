"use client"

import { LucideIcon } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
    title: string
    description: string
    icon: LucideIcon
    children?: React.ReactNode
    className?: string
}

export function EmptyState({
    title,
    description,
    icon: Icon,
    children,
    className,
}: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center glass rounded-3xl border-dashed border-2", className)}>
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 relative"
            >
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" aria-hidden="true" />
        <Icon className="h-8 w-8 text-primary relative z-10" aria-hidden="true" />
            </motion.div>
            <div className="max-w-xs space-y-2 mb-8">
                <h3 className="text-xl font-bold tracking-tight">{title}</h3>
                <p className="text-muted-foreground text-sm">
                    {description}
                </p>
            </div>
            {children}
        </div>
    )
}
