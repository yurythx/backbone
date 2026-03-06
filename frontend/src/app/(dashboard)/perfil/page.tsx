"use client"

import { ProfileForm } from "@/features/settings/profile-form"
import { PageHeader } from "@/components/ui/page-header"
import { UserThemeSelector } from "@/components/settings/user-theme-selector"
import { motion } from "framer-motion"
import { Suspense } from "react"
import { Protected } from "@/components/auth/protected"
import { Separator } from "@/components/ui/separator"
import { Palette, User } from "lucide-react"

function ProfileContent() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <PageHeader
        title="Meu Perfil"
        description="Gerencie suas informações pessoais e preferências de conta."
      />

      <div className="grid gap-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="glass rounded-3xl p-6 md:p-10 border shadow-sm"
        >
          <div className="flex items-center gap-2 mb-6 text-primary">
            <User className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Informações Pessoais</h2>
          </div>
          <ProfileForm />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="glass rounded-3xl p-6 md:p-10 border shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2 text-primary">
            <Palette className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Aparência & Tema</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Personalize como você vê a plataforma. Essas configurações afetam apenas o seu usuário.
          </p>
          
          <UserThemeSelector />
        </motion.div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando perfil...</div>}>
      <Protected>
        <ProfileContent />
      </Protected>
    </Suspense>
  )
}
