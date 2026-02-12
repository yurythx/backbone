"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [checked, setChecked] = useState(false)
  const isRedirecting = useRef(false)

  useEffect(() => {
    const checkAuth = () => {
      // Se for a página inicial, NUNCA redireciona, apenas libera o acesso
      if (window.location.pathname === '/') {
        setAuthorized(true)
        setChecked(true)
        return
      }

      try {
        const accessToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
        const companySlug = typeof window !== "undefined" ? localStorage.getItem("companySlug") : null
        // Removida a verificação de rota de artigos daqui, pois ela tem sua própria lógica de redirecionamento na página
        // const isPublicRoute = window.location.pathname.startsWith('/artigos') 

        if (!accessToken || !companySlug) {
          // Apenas redireciona se realmente não tiver token
          if (!isRedirecting.current) {
             isRedirecting.current = true
             router.replace("/login")
          }
          return
        }

        setAuthorized(true)
        setChecked(true)
      } catch (err) {
        console.error("[DashboardLayout] Auth check error:", err)
        setAuthorized(true) 
        setChecked(true)
      }
    }

    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Executa apenas uma vez na montagem do layout

  if (!checked) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // Se não autorizado e não estiver redirecionando, não renderiza o shell
  // Se estiver redirecionando, mostra loading
  if (!authorized && !isRedirecting.current) {
      // Força um estado de carregamento em vez de null para evitar cancelamento de requisições
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )
  }

  return <DashboardShell>{children}</DashboardShell>
}
