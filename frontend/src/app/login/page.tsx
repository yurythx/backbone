"use client"
// Force recompile: 2026-01-30

import { LoginForm } from "@/features/auth/login-form"
import { useTheme } from "@/components/theme-provider"
import { H2, P } from "@/components/ui/typography"
import Link from "next/link"

export default function LoginPage() {
  const { logo, companyName } = useTheme()

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      {/* Visual Side - Hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 bg-primary/5 items-center justify-center p-12 relative overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[80px]" />

        <div className="max-w-md space-y-6 relative z-10 text-center">
          <div className="flex justify-center mb-8">
            {logo ? (
              <img src={logo} alt={companyName} className="h-16 w-auto object-contain" />
            ) : (
              <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-bold text-2xl">
                B
              </div>
            )}
          </div>
          <H2 className="text-4xl lg:text-5xl border-none">Bem-vindo ao {companyName}</H2>
          <P className="text-xl text-muted-foreground">
            Sua plataforma centralizada de gestão modular. Potência e simplicidade em um só lugar.
          </P>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="md:hidden flex flex-col items-center gap-4 mb-8 text-center transition-all animate-in fade-in slide-in-from-top-4">
            {logo ? (
              <img src={logo} alt={companyName} className="h-12 w-auto object-contain" />
            ) : (
              <div className="h-12 w-12 bg-primary rounded-xl" />
            )}
            <H2 className="text-2xl border-none">{companyName}</H2>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Login</h1>
            <p className="text-muted-foreground">
              Insira suas credenciais para acessar sua conta
            </p>
          </div>

          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <LoginForm />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Ainda não tem uma conta?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Cadastre sua empresa
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
