"use client"

import { PublicNavbar } from "@/components/public/navbar"
import { PublicFooter } from "@/components/public/footer"

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <PublicNavbar />
            <main className="flex-1 container mx-auto px-4 py-8">
                {children}
            </main>
            <PublicFooter />
        </div>
    )
}
