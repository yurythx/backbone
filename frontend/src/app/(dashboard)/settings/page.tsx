"use client"

import { ProfileForm } from "@/features/settings/profile-form"
import { CompanyForm } from "@/features/settings/company-form"
import { BrandingSettings } from "@/components/settings/branding-settings"
import { UserThemeSelector } from "@/components/settings/user-theme-selector"
import { SmtpSettings } from "@/features/settings/smtp-settings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Building, Palette, Settings2, Mail, ShieldCheck } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <PageHeader
        title="Configurações do Ecossistema"
        description="Gerencie sua identidade pessoal, preferências da empresa e infraestrutura enterprise."
      />

      <Tabs defaultValue="personalization" className="space-y-10">
        <TabsList className="bg-muted/40 p-1.5 rounded-3xl border flex items-center gap-1 w-full overflow-x-auto no-scrollbar justify-start md:justify-center lg:w-fit lg:mx-auto shadow-sm">
          <TabsTrigger value="profile" className="gap-2 px-6 py-2.5 rounded-2xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Perfil Pessoal</span>
          </TabsTrigger>
          <TabsTrigger value="personalization" className="gap-2 px-6 py-2.5 rounded-2xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Tema & UI</span>
          </TabsTrigger>
          <TabsTrigger value="company" className="gap-2 px-6 py-2.5 rounded-2xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">Dados da Empresa</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2 px-6 py-2.5 rounded-2xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Identidade (White-label)</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2 px-6 py-2.5 rounded-2xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all" title="Segurança & E-mail">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">SMTP & Envios</span>
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="profile" className="outline-none focus-visible:ring-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-morphism rounded-[2.5rem] p-10 border shadow-sm"
            >
              <ProfileForm />
            </motion.div>
          </TabsContent>

          <TabsContent value="personalization" className="outline-none focus-visible:ring-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-morphism rounded-[2.5rem] p-10 border shadow-sm"
            >
              <div className="mb-8">
                <H3 className="mb-2">Experiência Visual</H3>
                <P className="text-muted-foreground text-sm">Escolha como você prefere visualizar o Backbone. Esta configuração é salva individualmente por usuário.</P>
              </div>
              <UserThemeSelector />
            </motion.div>
          </TabsContent>

          <TabsContent value="company" className="outline-none focus-visible:ring-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-morphism rounded-[2.5rem] p-10 border shadow-sm"
            >
              <CompanyForm />
            </motion.div>
          </TabsContent>

          <TabsContent value="branding" className="outline-none focus-visible:ring-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-morphism rounded-[2.5rem] p-10 border shadow-sm"
            >
              <BrandingSettings isOnboarding={false} />
            </motion.div>
          </TabsContent>

          <TabsContent value="email" className="outline-none focus-visible:ring-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-morphism rounded-[2.5rem] p-10 border shadow-sm"
            >
              <SmtpSettings isOnboarding={false} />
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>

      {/* Visual Footer hint */}
      <div className="flex items-center justify-center gap-2 py-8 opacity-40 grayscale group hover:opacity-100 hover:grayscale-0 transition-all cursor-default">
        <ShieldCheck className="h-4 w-4" />
        <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Backbone Cloud Governance</span>
      </div>
    </div>
  )
}

function H3({ children, className }: { children: React.ReactNode, className?: string }) {
  return <h3 className={cn("text-xl font-bold tracking-tight", className)}>{children}</h3>
}

function P({ children, className }: { children: React.ReactNode, className?: string }) {
  return <p className={cn("text-base", className)}>{children}</p>
}
