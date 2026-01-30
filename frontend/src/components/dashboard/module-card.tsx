import Link from "next/link"
import { LucideIcon } from "lucide-react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ModuleCardProps {
    title: string
    description: string
    href: string
    icon: LucideIcon
    color?: string
}

export function ModuleCard({ title, description, href, icon: Icon }: ModuleCardProps) {
    return (
        <Link href={href} className="block group">
            <Card className="h-full border border-border/50 group-hover:border-primary/50 transition-all duration-300 group-hover:shadow-md">
                <CardHeader>
                    <div className="mb-4 p-3 w-fit rounded-full bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                        <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors">{title}</CardTitle>
                    <CardDescription className="line-clamp-2">{description}</CardDescription>
                </CardHeader>
            </Card>
        </Link>
    )
}
