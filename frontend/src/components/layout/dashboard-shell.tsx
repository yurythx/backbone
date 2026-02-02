"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

export function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/admin')

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 relative overflow-hidden">
        {isAdminRoute && <Sidebar />}
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, scale: 0.99, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.01, filter: "blur(4px)" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "flex-1 p-8 bg-background overflow-auto min-h-0",
              !isAdminRoute && "max-w-7xl mx-auto w-full"
            )}
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  )
}
