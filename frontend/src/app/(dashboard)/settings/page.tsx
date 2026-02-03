"use client"

import { ProfileForm } from "@/features/settings/profile-form"
import { CompanyForm } from "@/features/settings/company-form"
import { BrandingSettings } from "@/components/settings/branding-settings"
import { UserThemeSelector } from "@/components/settings/user-theme-selector"
import { SmtpSettings } from "@/features/settings/smtp-settings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { H2, P } from "@/components/ui/typography"
import { User, Building, Palette, Settings2, Mail } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <div>
        <H2 className="border-none pb-0">Configurações</H2>
        <P className="text-muted-foreground mt-1">
          Gerencie seu perfil, empresa e preferências visuais do sistema.
        </P>
      </div>

      <Tabs defaultValue="personalization" className="space-y-6">
        <TabsList className="bg-background/95 backdrop-blur p-1 rounded-full border">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="personalization" className="gap-2">
            <Palette className="h-4 w-4" />
            Personalização
          </TabsTrigger>
          <TabsTrigger value="company" className="gap-2">
            <Building className="h-4 w-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Settings2 className="h-4 w-4" />
            White-label
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            E-mail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4 outline-none">
          <ProfileForm />
        </TabsContent>

        <TabsContent value="personalization" className="outline-none">
          <div className="border rounded-xl p-6 bg-card">
            <UserThemeSelector />
          </div>
        </TabsContent>

        <TabsContent value="company" className="space-y-4 outline-none">
          <CompanyForm />
        </TabsContent>

        <TabsContent value="branding" className="outline-none">
          <div className="border rounded-xl p-6 bg-card">
            <BrandingSettings />
          </div>
        </TabsContent>

        <TabsContent value="email" className="outline-none">
          <div className="border rounded-xl p-6 bg-card">
            <SmtpSettings />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
