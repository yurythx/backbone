"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/axios"
import { H3, P, Muted } from "@/components/ui/typography"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Loader2, Mail, Send, CheckCircle2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function SmtpSettings() {
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [config, setConfig] = useState({
        use_custom_smtp: false,
        smtp_host: "",
        smtp_port: 587,
        smtp_user: "",
        smtp_password: "",
        smtp_use_tls: true,
        from_email: ""
    })

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                setIsLoading(true)
                const res = await api.get('/api/core/branding/email_config/')
                const data = res.data
                setConfig({
                    use_custom_smtp: data.use_custom_smtp ?? false,
                    smtp_host: data.smtp_host ?? "",
                    smtp_port: data.smtp_port ?? 587,
                    smtp_user: data.smtp_user ?? "",
                    smtp_password: data.smtp_password ?? "",
                    smtp_use_tls: data.smtp_use_tls ?? true,
                    from_email: data.from_email ?? ""
                })
            } catch (error) {
                console.error("Failed to fetch email config", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchConfig()
    }, [])

    const handleSave = async () => {
        try {
            setIsLoading(true)
            await api.put('/api/core/branding/email_config/', config)
            toast({
                title: "Configurações salvas",
                description: "As configurações de SMTP foram atualizadas com sucesso.",
            })
        } catch (error) {
            toast({
                title: "Erro ao salvar",
                description: "Não foi possível salvar as configurações de e-mail.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleTest = async () => {
        try {
            setIsTesting(true)
            const res = await api.post('/api/core/branding/test_smtp/')
            toast({
                title: "E-mail enviado!",
                description: res.data.message || "Verifique sua caixa de entrada.",
            })
        } catch (error: any) {
            toast({
                title: "Falha no teste",
                description: error.response?.data?.error || "Erro desconhecido ao enviar e-mail.",
                variant: "destructive"
            })
        } finally {
            setIsTesting(false)
        }
    }

    if (isLoading && !config.smtp_host) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <H3>Configurações de E-mail (SMTP)</H3>
                    <P className="text-muted-foreground">
                        Configure seu próprio servidor de e-mail para que as notificações do sistema (boas-vindas, alertas, etc.) saiam com o seu domínio.
                    </P>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                    <Switch
                        id="use-custom"
                        checked={config.use_custom_smtp}
                        onCheckedChange={(val) => setConfig({ ...config, use_custom_smtp: val })}
                    />
                    <Label htmlFor="use-custom">Ativar SMTP Próprio</Label>
                </div>
            </div>

            <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity", !config.use_custom_smtp && "opacity-50 pointer-events-none")}>
                <div className="space-y-2">
                    <Label>Host SMTP</Label>
                    <Input
                        placeholder="smtp.example.com"
                        value={config.smtp_host || ""}
                        onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Porta</Label>
                    <Input
                        type="number"
                        placeholder="587"
                        value={config.smtp_port}
                        onChange={(e) => setConfig({ ...config, smtp_port: parseInt(e.target.value) })}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Usuário / E-mail</Label>
                    <Input
                        placeholder="contato@empresa.com"
                        value={config.smtp_user || ""}
                        onChange={(e) => setConfig({ ...config, smtp_user: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Senha</Label>
                    <Input
                        type="password"
                        placeholder="••••••••"
                        value={config.smtp_password || ""}
                        onChange={(e) => setConfig({ ...config, smtp_password: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label>E-mail Remetente (From)</Label>
                    <Input
                        placeholder="noreply@empresa.com"
                        value={config.from_email || ""}
                        onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
                    />
                    <Muted className="text-[10px]">Deve ser um e-mail autorizado no seu servidor SMTP.</Muted>
                </div>
                <div className="flex items-center space-x-2 h-full pt-8">
                    <Switch
                        id="use-tls"
                        checked={config.smtp_use_tls}
                        onCheckedChange={(val) => setConfig({ ...config, smtp_use_tls: val })}
                    />
                    <Label htmlFor="use-tls">Usar TLS / SSL</Label>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between pt-6 border-t">
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={handleTest}
                        disabled={isTesting || !config.use_custom_smtp || !config.smtp_host}
                        className="gap-2"
                    >
                        {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Enviar E-mail de Teste
                    </Button>
                </div>
                <div className="flex gap-3">
                    <Button onClick={handleSave} disabled={isLoading} className="min-w-[120px]">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Salvar Configurações
                    </Button>
                </div>
            </div>

            {!config.use_custom_smtp && (
                <div className="bg-muted p-4 rounded-lg flex gap-3 items-center text-sm text-muted-foreground">
                    <AlertCircle className="h-5 w-5" />
                    <span>O sistema está utilizando o servidor de e-mail padrão do Backbone.</span>
                </div>
            )}
        </div>
    )
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ")
}
