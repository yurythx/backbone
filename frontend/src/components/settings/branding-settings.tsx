"use client"

import { useState } from "react"
import { useTheme } from "@/components/theme-provider"
import { api } from "@/lib/axios"
import { H3, P, Muted } from "@/components/ui/typography"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, X, Check, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const palettes = [
    { id: 'django-green', name: 'Django Green', color: '#0C4B33' },
    { id: 'ocean-blue', name: 'Ocean Blue', color: '#0369A1' },
    { id: 'royal-purple', name: 'Royal Purple', color: '#7C3AED' },
    { id: 'sunset-orange', name: 'Sunset Orange', color: '#EA580C' },
    { id: 'forest-green', name: 'Forest Green', color: '#166534' },
    { id: 'slate-gray', name: 'Slate Gray', color: '#475569' },
]

export function BrandingSettings() {
    const { logo, icon, currentPalette, refreshConfig } = useTheme()
    const { toast } = useToast()

    const [isUploading, setIsUploading] = useState(false)
    const [selectedPalette, setSelectedPalette] = useState(currentPalette)
    const [footerText, setFooterText] = useState("")
    const [socialLinks, setSocialLinks] = useState({
        facebook: "",
        instagram: "",
        linkedin: "",
        twitter: ""
    })

    // Carregar dados iniciais ao montar o componente
    useState(() => {
        api.get('/api/core/branding/current/').then(res => {
            setFooterText(res.data.footer_text || "")
            setSocialLinks({
                facebook: res.data.facebook_url || "",
                instagram: res.data.instagram_url || "",
                linkedin: res.data.linkedin_url || "",
                twitter: res.data.twitter_url || ""
            })
            setSelectedPalette(res.data.theme_palette || currentPalette)
        })
    })

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'icon') => {
        const file = e.target.files?.[0]
        if (!file) return

        const formData = new FormData()
        formData.append(type, file)

        try {
            setIsUploading(true)
            await api.post(`/api/core/branding/upload-${type}/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            await refreshConfig()
            toast({
                title: "Sucesso!",
                description: `${type === 'logo' ? 'Logo' : 'Ícone'} atualizado com sucesso.`,
            })
        } catch (error) {
            toast({
                title: "Erro no upload",
                description: "Não foi possível enviar a imagem. Tente novamente.",
                variant: "destructive"
            })
        } finally {
            setIsUploading(false)
        }
    }

    const handleSaveBranding = async () => {
        try {
            setIsUploading(true)
            await api.put(`/api/core/branding/update_current/`, {
                theme_palette: selectedPalette,
                footer_text: footerText,
                facebook_url: socialLinks.facebook,
                instagram_url: socialLinks.instagram,
                linkedin_url: socialLinks.linkedin,
                twitter_url: socialLinks.twitter
            })
            await refreshConfig()
            toast({
                title: "Configurações salvas",
                description: "As alterações de branding e rodapé foram aplicadas.",
            })
        } catch (error) {
            toast({
                title: "Erro ao salvar",
                description: "Não foi possível salvar as configurações.",
                variant: "destructive"
            })
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="space-y-10">
            <div>
                <H3>Identidade Visual da Empresa</H3>
                <P className="text-muted-foreground mt-1">
                    Personalize como sua empresa é vista por todos os usuários. Estas configurações são aplicadas a todos que não têm um tema personalizado.
                </P>
            </div>

            {/* Upload de Logo e Ícone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <Label>Logo da Empresa</Label>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 bg-muted/30">
                        {logo ? (
                            <img src={logo} alt="Logo preview" className="max-h-20 object-contain mb-4" />
                        ) : (
                            <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                        )}
                        <Input
                            type="file"
                            className="hidden"
                            id="logo-upload"
                            onChange={(e) => handleFileUpload(e, 'logo')}
                            accept="image/*"
                            disabled={isUploading}
                        />
                        <Button variant="outline" asChild disabled={isUploading}>
                            <label htmlFor="logo-upload" className="cursor-pointer">
                                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Selecionar Logo"}
                            </label>
                        </Button>
                        <Muted className="mt-2 text-center text-[10px]">Recomendado: PNG ou SVG (max 2MB)</Muted>
                    </div>
                </div>

                <div className="space-y-4">
                    <Label>Ícone (Favicon)</Label>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 bg-muted/30">
                        {icon ? (
                            <img src={icon} alt="Icon preview" className="h-10 w-10 object-contain mb-4" />
                        ) : (
                            <div className="h-10 w-10 rounded bg-muted-foreground/20 mb-4" />
                        )}
                        <Input
                            type="file"
                            className="hidden"
                            id="icon-upload"
                            onChange={(e) => handleFileUpload(e, 'icon')}
                            accept="image/x-icon,image/png"
                            disabled={isUploading}
                        />
                        <Button variant="outline" asChild disabled={isUploading}>
                            <label htmlFor="icon-upload" className="cursor-pointer">
                                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Selecionar Ícone"}
                            </label>
                        </Button>
                        <Muted className="mt-2 text-center text-[10px]">Recomendado: ICO ou PNG (32x32px)</Muted>
                    </div>
                </div>
            </div>

            {/* Seletor de Paleta Coletivo */}
            <div className="space-y-6 pt-6 border-t">
                <div>
                    <Label className="text-lg font-semibold">Paleta de Cores Padrão</Label>
                    <P className="text-muted-foreground text-sm mt-1">
                        Escolha a cor primária que define a marca da sua empresa no sistema.
                    </P>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {palettes.map((palette) => (
                        <button
                            key={palette.id}
                            onClick={() => setSelectedPalette(palette.id)}
                            className={cn(
                                "relative flex items-center gap-3 p-3 rounded-lg border transition-all hover:bg-accent",
                                selectedPalette === palette.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                            )}
                        >
                            <div className="h-6 w-6 rounded-full" style={{ backgroundColor: palette.color }} />
                            <span className="text-sm font-medium">{palette.name}</span>
                            {selectedPalette === palette.id && <Check className="h-4 w-4 ml-auto text-primary" />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Rodapé e Redes Sociais */}
            <div className="space-y-6 pt-6 border-t">
                <div>
                    <Label className="text-lg font-semibold">Rodapé e Redes Sociais</Label>
                    <P className="text-muted-foreground text-sm mt-1">
                        Personalize as informações que aparecerão no final do seu portal público.
                    </P>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Texto do Rodapé</Label>
                        <Input
                            placeholder="Ex: © 2026 Minha Empresa. Todos os direitos reservados."
                            value={footerText}
                            onChange={(e) => setFooterText(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Facebook URL</Label>
                            <Input
                                placeholder="https://facebook.com/..."
                                value={socialLinks.facebook}
                                onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Instagram URL</Label>
                            <Input
                                placeholder="https://instagram.com/..."
                                value={socialLinks.instagram}
                                onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>LinkedIn URL</Label>
                            <Input
                                placeholder="https://linkedin.com/company/..."
                                value={socialLinks.linkedin}
                                onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Twitter (X) URL</Label>
                            <Input
                                placeholder="https://twitter.com/..."
                                value={socialLinks.twitter}
                                onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => refreshConfig()}>Restaurar</Button>
                    <Button onClick={handleSaveBranding} disabled={isUploading}>
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Salvar Todas as Alterações
                    </Button>
                </div>
            </div>
        </div>
    )
}
