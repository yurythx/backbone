"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PresenceHeartbeat } from "@/components/layout/presence-heartbeat"
import { PresenceProvider } from "@/hooks/use-presence"


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
    // Verificar se estamos no cliente
    if (typeof window === "undefined") return

    const checkAuth = () => {
      // Se for a página inicial ou rota pública, libera o acesso imediatamente
      const path = window.location.pathname
      if (
        path === '/' || 
        path.startsWith('/p/') ||
        path.startsWith('/login')
      ) {
        setAuthorized(true)
        setChecked(true)
        return
      }
      
      try {
        const accessToken = localStorage.getItem("accessToken")
        
        if (!accessToken) {
          if (!isRedirecting.current) {
            isRedirecting.current = true
            console.log("[DashboardLayout] Sem token, redirecionando para /")
            // Redireciona para / que é a landing page pública
            router.replace("/")
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

  return (
    <DashboardShell>
      <PresenceHeartbeat />
      {children}
    </DashboardShell>
  )
}
