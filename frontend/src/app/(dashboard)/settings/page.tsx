"use client"



import { ProfileForm } from "@/features/settings/profile-form"
import { CompanyForm } from "@/features/settings/company-form"
import { BrandingSettings } from "@/components/settings/branding-settings"
import { UserThemeSelector } from "@/components/settings/user-theme-selector"
import { SmtpSettings } from "@/features/settings/smtp-settings"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Building, Palette, Settings2, Mail } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { motion, AnimatePresence } from "framer-motion"
import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Protected } from "@/components/auth/protected"

function SettingsContent() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") || "company"
  const [activeTab, setActiveTab] = useState(initialTab)

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <PageHeader
        title="Configurações do Sistema"
        description="Gerencie as configurações da organização e preferências globais."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="glass rounded-2xl p-2 border shadow-sm">
          <TabsList className="bg-transparent p-0 w-full flex flex-col md:flex-row h-auto gap-2" aria-label="Seções de configurações">
            <TabsTrigger
              value="company"
              className="w-full md:flex-1 justify-start md:justify-center gap-3 px-4 py-3 rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all font-medium"
            >
              <Building className="h-4 w-4" aria-hidden="true" />
              Empresa
            </TabsTrigger>

            <TabsTrigger
              value="branding"
              className="w-full md:flex-1 justify-start md:justify-center gap-3 px-4 py-3 rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all font-medium"
            >
              <Settings2 className="h-4 w-4" aria-hidden="true" />
              Marca
            </TabsTrigger>

            <TabsTrigger
              value="email"
              className="w-full md:flex-1 justify-start md:justify-center gap-3 px-4 py-3 rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all font-medium"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              E-mail
            </TabsTrigger>
          </TabsList>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="glass rounded-3xl p-6 md:p-10 border shadow-sm outline-none"
          >
            <Protected requireStaff>
              {activeTab === "company" && <CompanyForm />}
              {activeTab === "branding" && <BrandingSettings isOnboarding={false} />}
              {activeTab === "email" && <SmtpSettings isOnboarding={false} />}
            </Protected>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div role="status" aria-live="polite" aria-label="Carregando configurações">Carregando...</div>}>
      <Protected>
        <SettingsContent />
      </Protected>
    </Suspense>
  )
}
