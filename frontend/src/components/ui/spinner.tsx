import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface SpinnerProps {
    size?: "sm" | "default" | "lg"
    className?: string
}

export function Spinner({ size = "default", className }: SpinnerProps) {
    const sizeClasses = {
        sm: "h-4 w-4",
        default: "h-6 w-6",
        lg: "h-8 w-8",
    }

    return (
        <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size], className)} />
    )
}

interface LoadingProps {
    text?: string
    size?: "sm" | "default" | "lg"
    className?: string
}

export function Loading({ text = "Carregando...", size = "default", className }: LoadingProps) {
    return (
        <div className={cn("flex items-center justify-center gap-2", className)}>
            <Spinner size={size} />
            {text && <span className="text-sm text-muted-foreground">{text}</span>}
        </div>
    )
}

// Full page loading
export function PageLoading({ text = "Carregando..." }: { text?: string }) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Spinner size="lg" />
                <p className="text-muted-foreground">{text}</p>
            </div>
        </div>
    )
}

// Inline loading (for buttons, etc)
export function InlineLoading({ className }: { className?: string }) {
    return <Spinner size="sm" className={className} />
}
