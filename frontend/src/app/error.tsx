"use client"

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log error to monitoring service
        console.error('Global error:', error)

        // TODO: Send to Sentry when configured
        // if (typeof window !== 'undefined' && window.Sentry) {
        //   window.Sentry.captureException(error)
        // }
    }, [error])

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="max-w-md w-full p-8 text-center space-y-6">
                <div className="flex justify-center">
                    <div className="rounded-full bg-destructive/10 p-4">
                        <AlertCircle className="h-12 w-12 text-destructive" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">
                        Ops! Algo deu errado
                    </h2>
                    <p className="text-muted-foreground">
                        Encontramos um erro inesperado. Nossa equipe foi notificada.
                    </p>
                </div>

                {process.env.NODE_ENV === 'development' && (
                    <div className="text-left">
                        <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground mb-2">
                                Detalhes do erro (apenas em desenvolvimento)
                            </summary>
                            <pre className="bg-muted p-3 rounded-md overflow-auto max-h-40 text-destructive font-mono">
                                {error.message}
                                {error.digest && `\n\nDigest: ${error.digest}`}
                            </pre>
                        </details>
                    </div>
                )}

                <div className="flex gap-3 justify-center flex-wrap">
                    <Button
                        onClick={reset}
                        variant="outline"
                        className="gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Tentar Novamente
                    </Button>
                    <Button
                        onClick={() => window.location.href = '/'}
                        variant="default"
                        className="gap-2"
                    >
                        <Home className="h-4 w-4" />
                        Voltar ao Início
                    </Button>
                </div>
            </Card>
        </div>
    )
}
