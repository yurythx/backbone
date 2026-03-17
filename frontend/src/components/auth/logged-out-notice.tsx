"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { notify } from "@/lib/notifications"

export function LoggedOutNotice() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const loggedOut = searchParams.get("logged_out") === "1"
    if (!loggedOut) return
    notify.success("Logout realizado", "Você saiu da sua conta com segurança.")
    router.replace("/")
  }, [router, searchParams])

  return null
}
