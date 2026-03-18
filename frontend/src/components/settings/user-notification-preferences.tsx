"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { H3, P } from "@/components/ui/typography"

type UserNotificationPreference = {
  notify_comment_moderation: boolean
  notify_reply_approved: boolean
}

export function UserNotificationPreferences() {
  const queryClient = useQueryClient()

  const prefQuery = useQuery({
    queryKey: ["accounts", "preferences", "notifications", "current"],
    queryFn: async () => {
      const res = await api.get<UserNotificationPreference>("/api/accounts/preferences/notifications/current/")
      return res.data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (partial: Partial<UserNotificationPreference>) => {
      const res = await api.patch<UserNotificationPreference>(
        "/api/accounts/preferences/notifications/update_current/",
        partial
      )
      return res.data
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(["accounts", "preferences", "notifications", "current"], data)
      toast.success("Preferências de notificações atualizadas")
    },
    onError: () => {
      toast.error("Falha ao atualizar preferências de notificações")
    },
  })

  const data = prefQuery.data

  if (prefQuery.isLoading) {
    return <div role="status" aria-live="polite">Carregando preferências...</div>
  }

  if (!data) {
    return <div className="text-sm text-muted-foreground">Não foi possível carregar preferências.</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <H3>Notificações</H3>
        <P className="text-muted-foreground mt-1">
          Controle quais eventos geram notificações para você.
        </P>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-6 rounded-2xl border border-border/50 bg-muted/20 p-4">
          <div className="min-w-0">
            <div className="font-medium">Moderação de comentários</div>
            <div className="text-sm text-muted-foreground">
              Notificar quando houver comentários ou respostas pendentes de aprovação.
            </div>
          </div>
          <Switch
            checked={data.notify_comment_moderation}
            onCheckedChange={(checked) => updateMutation.mutate({ notify_comment_moderation: checked })}
            disabled={updateMutation.isPending}
          />
        </div>

        <div className="flex items-start justify-between gap-6 rounded-2xl border border-border/50 bg-muted/20 p-4">
          <div className="min-w-0">
            <div className="font-medium">Respostas aprovadas</div>
            <div className="text-sm text-muted-foreground">
              Notificar quando uma resposta ao seu comentário for aprovada.
            </div>
          </div>
          <Switch
            checked={data.notify_reply_approved}
            onCheckedChange={(checked) => updateMutation.mutate({ notify_reply_approved: checked })}
            disabled={updateMutation.isPending}
          />
        </div>
      </div>
    </div>
  )
}

