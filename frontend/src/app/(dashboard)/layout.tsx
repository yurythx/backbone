 "use client"
 
 import { useEffect, useState } from "react"
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
 
  useEffect(() => {
    try {
      const accessToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
      const companySlug = typeof window !== "undefined" ? localStorage.getItem("companySlug") : null
 
      if (!accessToken || !companySlug) {
        router.replace("/login")
        setChecked(true)
        return
      }
 
      setAuthorized(true)
      setChecked(true)
    } catch {
      router.replace("/login")
      setChecked(true)
    }
  }, [router])
 
  if (!checked) {
    return null
  }
 
  if (!authorized) {
    return null
  }
 
  return <DashboardShell>{children}</DashboardShell>
}
