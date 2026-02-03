"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Company } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BrandingSettings } from "@/components/settings/branding-settings"
import { SmtpSettings } from "@/features/settings/smtp-settings"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, ChevronRight, Rocket, Shield, Globe, Mail, Palette } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function OnboardingWizard() {
    const queryClient = useQueryClient()
    const [step, setStep] = useState(1)
    const totalSteps = 4

    const { data: company, isLoading } = useQuery({
        queryKey: ['current-company'],
        queryFn: async () => {
            const res = await api.get<Company>('/api/core/companies/current/')
            return res.data
        }
    })

    const completeMutation = useMutation({
        mutationFn: async () => {
            await api.post('/api/core/companies/complete_onboarding/')
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['current-company'] })
            window.location.reload() // Refresh to clear wizard overlay
        }
    })

    if (isLoading || !company) return null

    const handleNext = () => {
        if (step < totalSteps) {
            setStep(step + 1)
        } else {
            completeMutation.mutate()
        }
    }

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/10 border border-primary/20">
                            <div className="p-3 rounded-xl bg-primary text-primary-foreground">
                                <Shield className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Identidade da Plataforma</h3>
                                <p className="text-muted-foreground text-sm">Confirme o nome e o endereço único da sua empresa.</p>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome da Empresa</Label>
                                <Input id="name" value={company.name} readOnly className="bg-muted cursor-not-allowed" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slug">Slug da URL</Label>
                                <div className="flex items-center gap-2">
                                    <Input id="slug" value={company.slug} readOnly className="bg-muted cursor-not-allowed" />
                                    <span className="text-sm text-muted-foreground">.backbone.io</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Este é o seu identificador único no sistema.</p>
                            </div>
                        </div>
                    </motion.div>
                )
            case 2:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-4"
                    >
                        <BrandingSettings />
                    </motion.div>
                )
            case 3:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-4"
                    >
                        <SmtpSettings />
                    </motion.div>
                )
            case 4:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/10 border border-primary/20">
                            <div className="p-3 rounded-xl bg-primary text-primary-foreground">
                                <Globe className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Domínio Customizado</h3>
                                <p className="text-muted-foreground text-sm">Pronto para usar seu próprio endereço?</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm">Você pode configurar isso agora ou deixar para depois nas configurações.</p>
                            <div className="space-y-2">
                                <Label htmlFor="domain-input">Seu Domínio (opcional)</Label>
                                <Input
                                    id="domain-input"
                                    placeholder="ex: app.suaempresa.com"
                                    defaultValue={company.domain || ''}
                                    onBlur={async (e) => {
                                        const val = (e.target as HTMLInputElement).value
                                        if (val !== company.domain) {
                                            await api.patch(`/api/core/companies/${company.slug}/`, { domain: val || null })
                                            queryClient.invalidateQueries({ queryKey: ['current-company'] })
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex gap-3">
                            <div className="text-yellow-500 mt-0.5">⚠️</div>
                            <p className="text-sm text-yellow-600 dark:text-yellow-400">
                                Lembre-se que para domínios customizados funcionarem, você precisará apontar o DNS (CNAME) para nossos servidores.
                            </p>
                        </div>
                    </motion.div>
                )
            default:
                return null
        }
    }

    return (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl shadow-2xl border-primary/20 overflow-hidden bg-card/50 backdrop-blur-md">
                <div className="h-1 bg-muted">
                    <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${(step / totalSteps) * 100}%` }}
                    />
                </div>

                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-primary font-bold tracking-tight">
                            <Rocket className="h-5 w-5" />
                            <span>WELCOME TO BACKBONE</span>
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">Passo {step} de {totalSteps}</span>
                    </div>
                    <CardTitle className="text-3xl font-extrabold tracking-tight">Configuração Inicial</CardTitle>
                    <CardDescription>Vamos deixar a plataforma com a cara da sua empresa em poucos minutos.</CardDescription>
                </CardHeader>

                <CardContent className="min-h-[400px] max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {renderStep()}
                    </AnimatePresence>
                </CardContent>

                <CardFooter className="flex justify-between border-t bg-muted/20 p-6">
                    <Button
                        variant="ghost"
                        onClick={() => setStep(Math.max(1, step - 1))}
                        disabled={step === 1 || completeMutation.isPending}
                    >
                        Anterior
                    </Button>
                    <Button
                        size="lg"
                        onClick={handleNext}
                        disabled={completeMutation.isPending}
                        className="rounded-xl px-8 font-bold gap-2"
                    >
                        {step === totalSteps ? 'Finalizar Setup' : 'Próximo Passo'}
                        {step === totalSteps ? <Check className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
