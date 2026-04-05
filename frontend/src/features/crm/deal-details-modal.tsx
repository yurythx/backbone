"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Loader2, Search } from "lucide-react"

import { api } from "@/lib/axios"
import { Deal, useCRM } from "./use-crm"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { getDeadlineMeta, getPriorityMeta, getProgressMeta, getProgressValue } from "./crm-visuals"
import { getColumnTransitionGuard, getDealColumnId, getDealColumnTitle, getPipelineColumns, isDealDone, resolveColumnSemantics } from "./use-crm"

interface DealDetailsModalProps {
  deal: Deal
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CRMUser {
  id: number
  username: string
  first_name?: string
  last_name?: string
  email?: string
}

type ActivityFilterId = "all" | "updates" | "moves" | "creation" | "automation"

const ACTIVITY_FILTER_OPTIONS: Array<{ id: ActivityFilterId; label: string }> = [
  { id: "all", label: "Tudo" },
  { id: "updates", label: "Updates" },
  { id: "moves", label: "Movimentações" },
  { id: "creation", label: "Criação" },
  { id: "automation", label: "Automação" },
]

function normalizeListResponse<T>(data: T[] | { results?: T[] } | undefined): T[] {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.results)) return data.results
  return []
}

function getUserDisplayName(user: CRMUser) {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim()
  return fullName || user.username
}

function getUserInitials(name: string) {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)

  if (parts.length === 0) return "?"
  return parts.map((part) => part[0]?.toUpperCase()).join("")
}

function getRelatedUserIds(deal: Deal) {
  const value = deal.custom_fields?.related_user_ids
  if (!Array.isArray(value)) return []
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0)
}

function getActivityTypeLabel(activityType: Deal["activities"][number]["activity_type"]) {
  if (activityType === "column_change" || activityType === "stage_change") return "Mudança de coluna"
  if (activityType === "creation") return "Criação do card"
  if (activityType === "note") return "Anotação"
  if (activityType === "automation") return "Automação"
  return activityType
}

function matchesActivityFilter(
  activity: Deal["activities"][number],
  filter: ActivityFilterId
) {
  if (filter === "all") return true
  if (filter === "updates") return activity.activity_type === "note"
  if (filter === "moves") return activity.activity_type === "column_change" || activity.activity_type === "stage_change"
  if (filter === "creation") return activity.activity_type === "creation"
  if (filter === "automation") return activity.activity_type === "automation"
  return true
}

export function DealDetailsModal({ deal, open, onOpenChange }: DealDetailsModalProps) {
  const { deals, pipelines, updateDeal, addDealNote } = useCRM()
  const currentDeal = useMemo(
    () => deals.find((item) => item.id === deal.id) || deal,
    [deal, deals]
  )
  const [draftDescription, setDraftDescription] = useState("")
  const [draftPriority, setDraftPriority] = useState<Deal["priority"]>("MEDIUM")
  const [draftColumnId, setDraftColumnId] = useState("")
  const [draftRelatedUsers, setDraftRelatedUsers] = useState<number[]>([])
  const [draftProgress, setDraftProgress] = useState("0")
  const [userSearch, setUserSearch] = useState("")
  const [draftUpdateNote, setDraftUpdateNote] = useState("")
  const [activityFilter, setActivityFilter] = useState<ActivityFilterId>("all")

  const { data: users = [] } = useQuery({
    queryKey: ["accounts-users-for-crm"],
    queryFn: async () => {
      const response = await api.get<CRMUser[] | { results?: CRMUser[] }>("/api/accounts/users/")
      return normalizeListResponse(response.data)
    }
  })

  const columns = useMemo(
    () => pipelines.flatMap((pipeline) => getPipelineColumns(pipeline)),
    [pipelines]
  )

  useEffect(() => {
    if (!open) return
    setDraftDescription(currentDeal.description || "")
    setDraftPriority(currentDeal.priority)
    setDraftColumnId(getDealColumnId(currentDeal).toString())
    setDraftRelatedUsers(getRelatedUserIds(currentDeal))
    setDraftProgress(getProgressValue(currentDeal).toString())
    setUserSearch("")
    setDraftUpdateNote("")
    setActivityFilter("all")
  }, [currentDeal, open])

  const selectedUsers = useMemo(
    () => users.filter((user) => draftRelatedUsers.includes(user.id)),
    [draftRelatedUsers, users]
  )
  const filteredUsers = useMemo(() => {
    const normalizedQuery = userSearch.trim().toLowerCase()
    if (!normalizedQuery) return users

    return users.filter((user) => {
      const displayName = getUserDisplayName(user).toLowerCase()
      const email = user.email?.toLowerCase() || ""
      const username = user.username.toLowerCase()
      return (
        displayName.includes(normalizedQuery) ||
        email.includes(normalizedQuery) ||
        username.includes(normalizedQuery)
      )
    })
  }, [userSearch, users])
  const ownerUser = users.find((user) => user.id === currentDeal.owner)
  const selectedColumn = columns.find((column) => column.id.toString() === draftColumnId)
  const selectedColumnSemantics = resolveColumnSemantics(selectedColumn)
  const draftPriorityMeta = getPriorityMeta(draftPriority)
  const currentPriorityMeta = getPriorityMeta(currentDeal.priority)
  const deadlineMeta = getDeadlineMeta(currentDeal.closing_date, isDealDone(currentDeal, pipelines))
  const activities = currentDeal.activities || []
  const latestActivity = activities[0]
  const latestManualUpdate = useMemo(
    () =>
      activities
        .filter((activity) => activity.activity_type === "note")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0],
    [activities]
  )
  const filteredActivities = useMemo(
    () => activities.filter((activity) => matchesActivityFilter(activity, activityFilter)),
    [activities, activityFilter]
  )
  const activityFilterCounts = useMemo(
    () =>
      ACTIVITY_FILTER_OPTIONS.reduce<Record<ActivityFilterId, number>>(
        (accumulator, option) => {
          accumulator[option.id] = activities.filter((activity) => matchesActivityFilter(activity, option.id)).length
          return accumulator
        },
        {
          all: 0,
          updates: 0,
          moves: 0,
          creation: 0,
          automation: 0,
        }
      ),
    [activities]
  )
  const currentProgress = getProgressValue(currentDeal)
  const normalizedDraftProgressValue = Number(draftProgress)
  const safeDraftProgress =
    Number.isFinite(normalizedDraftProgressValue) ? Math.max(0, Math.min(100, Math.round(normalizedDraftProgressValue))) : 0
  const draftProgressMeta = getProgressMeta(safeDraftProgress)
  const hasChanges =
    draftDescription !== (currentDeal.description || "") ||
    draftPriority !== currentDeal.priority ||
    draftColumnId !== getDealColumnId(currentDeal).toString() ||
    safeDraftProgress !== currentProgress ||
    JSON.stringify([...draftRelatedUsers].sort((a, b) => a - b)) !==
      JSON.stringify([...getRelatedUserIds(currentDeal)].sort((a, b) => a - b))
  const selectedColumnGuard = getColumnTransitionGuard(currentDeal, selectedColumn, deals, pipelines)

  const resetDraft = () => {
    setDraftDescription(currentDeal.description || "")
    setDraftPriority(currentDeal.priority)
    setDraftColumnId(getDealColumnId(currentDeal).toString())
    setDraftRelatedUsers(getRelatedUserIds(currentDeal))
    setDraftProgress(getProgressValue(currentDeal).toString())
    setUserSearch("")
  }

  const handleToggleRelatedUser = (userId: number, checked: boolean) => {
    setDraftRelatedUsers((current) =>
      checked ? [...current, userId] : current.filter((id) => id !== userId)
    )
  }

  const handleSave = async () => {
    const nextCustomFields = { ...(currentDeal.custom_fields || {}) } as Record<string, unknown>

    if (draftRelatedUsers.length > 0) {
      nextCustomFields.related_user_ids = draftRelatedUsers
    } else {
      delete nextCustomFields.related_user_ids
    }

    nextCustomFields.progress_percentage = safeDraftProgress

    await updateDeal.mutateAsync({
      id: currentDeal.id,
      description: draftDescription,
      priority: draftPriority,
      column: Number(draftColumnId),
      custom_fields: nextCustomFields,
    })
  }

  const handlePublishUpdate = async () => {
    const description = draftUpdateNote.trim()
    if (!description) return

    await addDealNote.mutateAsync({
      dealId: currentDeal.id,
      description,
    })
    setDraftUpdateNote("")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full border-l bg-background p-0 sm:max-w-[1120px]">
        <SheetHeader className="border-b bg-muted/30 px-6 py-5 text-left">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Monday-style</Badge>
                <Badge variant="secondary">{selectedColumn?.title || getDealColumnTitle(currentDeal)}</Badge>
                <Badge className={draftPriorityMeta.className}>{draftPriorityMeta.label}</Badge>
                <Badge className={draftProgressMeta.badgeClassName}>{safeDraftProgress}%</Badge>
                <Badge className={deadlineMeta.badgeClassName}>{deadlineMeta.label}</Badge>
                {hasChanges && <Badge>Alterações pendentes</Badge>}
              </div>
              <SheetTitle className="text-2xl font-semibold">{currentDeal.title}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full bg-background px-3 py-1 text-foreground shadow-sm">
                  {currentDeal.contact_name}
                </span>
                <span className="rounded-full bg-background px-3 py-1 text-foreground shadow-sm">
                  {ownerUser ? getUserDisplayName(ownerUser) : `Usuário #${currentDeal.owner}`}
                </span>
                <span className="text-muted-foreground">
                  {latestActivity
                    ? `Última atividade ${formatDistanceToNow(new Date(latestActivity.created_at), { addSuffix: true, locale: ptBR })}`
                    : "Sem histórico recente"}
                </span>
              </SheetDescription>
            </div>

            <div className="flex flex-col gap-4 xl:min-w-[320px] xl:items-end">
              <div className="text-left xl:text-right">
                <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Valor do card
                </div>
                <div className="text-3xl font-bold text-primary">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(currentDeal.value))}
                </div>
                {currentDeal.closing_date && (
                  <div className="mt-1 text-sm text-muted-foreground">
                    Fechamento: {format(new Date(currentDeal.closing_date), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                )}
                <div className="mt-3 space-y-2 rounded-2xl border bg-background/80 p-4 xl:min-w-[280px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Progresso</span>
                    <Badge className={draftProgressMeta.badgeClassName}>{draftProgressMeta.label}</Badge>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn("h-full rounded-full transition-all", draftProgressMeta.barClassName)}
                      style={{ width: `${safeDraftProgress}%` }}
                    />
                  </div>
                  <div className="text-sm font-semibold">{safeDraftProgress}% concluído</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
                <Button
                  variant="outline"
                  onClick={resetDraft}
                  disabled={!hasChanges || updateDeal.isPending}
                >
                  Descartar
                </Button>
                <Button onClick={handleSave} disabled={!hasChanges || updateDeal.isPending}>
                  {updateDeal.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar alterações
                </Button>
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-154px)]">
          <div className="space-y-6 p-6">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border bg-card p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Coluna atual</p>
                <div className="mt-3">
                  <Badge variant="secondary" className="text-sm">
                    {selectedColumn?.title || getDealColumnTitle(currentDeal)}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  O card segue a coluna selecionada no painel e persiste ao salvar.
                </p>
                {selectedColumnSemantics.wip_limit ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Limite WIP: {selectedColumnSemantics.wip_limit} card{selectedColumnSemantics.wip_limit === 1 ? "" : "s"}.
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border bg-card p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Prioridade</p>
                <div className="mt-3">
                  <Badge className={draftPriorityMeta.className}>{draftPriorityMeta.label}</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Antes: {currentPriorityMeta.label}. Agora: {draftPriorityMeta.label}.
                </p>
              </div>

              <div className="rounded-2xl border bg-card p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Progresso</p>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Badge className={draftProgressMeta.badgeClassName}>{draftProgressMeta.label}</Badge>
                    <span className="text-lg font-semibold">{safeDraftProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn("h-full rounded-full transition-all", draftProgressMeta.barClassName)}
                      style={{ width: `${safeDraftProgress}%` }}
                    />
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Ajuste o avanço do trabalho como em um board operacional estilo Monday.
                </p>
              </div>

              <div className="rounded-2xl border bg-card p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Colaboradores</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {selectedUsers.slice(0, 4).map((user) => {
                      const displayName = getUserDisplayName(user)

                      return (
                        <Avatar key={user.id} className="h-10 w-10 border-2 border-background">
                          <AvatarFallback className="text-xs font-semibold">
                            {getUserInitials(displayName)}
                          </AvatarFallback>
                        </Avatar>
                      )
                    })}
                    {selectedUsers.length === 0 && (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed text-xs text-muted-foreground">
                        0
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{selectedUsers.length}</div>
                    <p className="text-sm text-muted-foreground">usuários relacionados</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-card p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Histórico</p>
                <div className="mt-3 text-lg font-semibold">
                  {currentDeal.activities?.length || 0} registro{(currentDeal.activities?.length || 0) === 1 ? "" : "s"}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {latestActivity
                    ? `Último movimento ${formatDistanceToNow(new Date(latestActivity.created_at), { addSuffix: true, locale: ptBR })}`
                    : "Nenhuma atividade registrada ainda."}
                </p>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]">
              <div className="space-y-6">
                <section className="rounded-2xl border bg-card p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Atualização do trabalho</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Escreva como se fosse a atualização principal do item no board: contexto, andamento, bloqueios e próximos passos.
                      </p>
                    </div>
                    <Badge variant={hasChanges ? "default" : "outline"}>
                      {hasChanges ? "Pronto para salvar" : "Sem alterações"}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border bg-background p-4">
                      <p className="text-sm font-medium">Descrição do que está sendo feito</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Este campo funciona como o update central do card, semelhante ao painel lateral do Monday.com.
                      </p>
                      <Textarea
                        value={draftDescription}
                        onChange={(event) => setDraftDescription(event.target.value)}
                        placeholder="Descreva o andamento, bloqueios, próximos passos e contexto do card..."
                        className="mt-4 min-h-[320px] resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border bg-background p-4">
                        <p className="text-sm font-medium">Responsável principal</p>
                        <div className="mt-3 flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="text-xs font-semibold">
                              {getUserInitials(ownerUser ? getUserDisplayName(ownerUser) : `Usuário ${currentDeal.owner}`)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold">
                              {ownerUser ? getUserDisplayName(ownerUser) : `Usuário #${currentDeal.owner}`}
                            </p>
                            <p className="text-xs text-muted-foreground">Responsável pelo card</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border bg-background p-4">
                        <p className="text-sm font-medium">Contato vinculado</p>
                        <div className="mt-3">
                          <p className="text-sm font-semibold">{currentDeal.contact_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Referência principal do atendimento ou oportunidade
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border bg-card p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Publicar atualização</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Registre um update rápido no histórico do card com contexto, bloqueios ou próximos passos sem alterar a descrição principal.
                      </p>
                    </div>
                    <Badge variant="outline">Histórico colaborativo</Badge>
                  </div>

                  <div className="rounded-2xl border bg-background p-4">
                    <Textarea
                      value={draftUpdateNote}
                      onChange={(event) => setDraftUpdateNote(event.target.value)}
                      placeholder="Ex.: Cliente respondeu, agenda confirmada para amanhã e aguardamos a liberação do acesso remoto."
                      className="min-h-[140px] resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                    />

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        A atualização entra no histórico do card como anotação manual.
                      </p>
                      <Button
                        onClick={handlePublishUpdate}
                        disabled={!draftUpdateNote.trim() || addDealNote.isPending}
                      >
                        {addDealNote.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Publicar update
                      </Button>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border bg-card p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Histórico</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Filtre rapidamente os eventos do card para acompanhar updates manuais, movimentações e automações.
                      </p>
                    </div>
                    <Badge variant="outline">
                      {filteredActivities.length} de {activities.length}
                    </Badge>
                  </div>

                  {latestManualUpdate ? (
                    <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>Último update manual</Badge>
                        {latestManualUpdate.actor_name && (
                          <span className="text-xs text-muted-foreground">por {latestManualUpdate.actor_name}</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(latestManualUpdate.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-foreground">{latestManualUpdate.description}</p>
                    </div>
                  ) : null}

                  <div className="mb-4 flex flex-wrap gap-2">
                    {ACTIVITY_FILTER_OPTIONS.map((option) => (
                      <Button
                        key={option.id}
                        type="button"
                        variant={activityFilter === option.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActivityFilter(option.id)}
                      >
                        {option.label} ({activityFilterCounts[option.id]})
                      </Button>
                    ))}
                  </div>

                  <p className="mb-4 text-xs text-muted-foreground">
                    Exibindo {filteredActivities.length} registro{filteredActivities.length === 1 ? "" : "s"} para o filtro selecionado.
                  </p>

                  <div className="space-y-4">
                    {filteredActivities.length > 0 ? (
                      filteredActivities.map((activity) => (
                        <div key={activity.id} className="rounded-2xl border bg-background/80 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">{getActivityTypeLabel(activity.activity_type)}</Badge>
                                {latestManualUpdate?.id === activity.id && activity.activity_type === "note" && (
                                  <Badge variant="secondary">Update mais recente</Badge>
                                )}
                                {activity.actor_name && (
                                  <span className="text-xs text-muted-foreground">por {activity.actor_name}</span>
                                )}
                              </div>
                              <p className="text-sm text-foreground">{activity.description}</p>
                            </div>
                            <span className="whitespace-nowrap text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                        Nenhuma atividade encontrada para o filtro atual.
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="rounded-2xl border bg-card p-5 shadow-sm">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Campos principais</h3>

                  <div className="space-y-4">
                    <div className="rounded-2xl border bg-background p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Coluna</p>
                      <p className="mt-1 text-sm text-muted-foreground">Atualize o andamento do card sem sair do painel.</p>
                      <Select value={draftColumnId} onValueChange={setDraftColumnId}>
                        <SelectTrigger className="mt-3">
                          <SelectValue placeholder="Selecione uma coluna" />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map((column) => (
                            <SelectItem
                              key={column.id}
                              value={column.id.toString()}
                              disabled={!getColumnTransitionGuard(currentDeal, column, deals, pipelines).allowed}
                            >
                              {column.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!selectedColumnGuard.allowed && (
                        <p className="mt-3 text-xs font-medium text-amber-700">
                          {selectedColumnGuard.reason}
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border bg-background p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Prioridade</p>
                      <p className="mt-1 text-sm text-muted-foreground">Destaque rápido para urgência e foco do time.</p>
                      <Select value={draftPriority} onValueChange={(value) => setDraftPriority(value as Deal["priority"])}>
                        <SelectTrigger className="mt-3">
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Baixa</SelectItem>
                          <SelectItem value="MEDIUM">Média</SelectItem>
                          <SelectItem value="HIGH">Alta</SelectItem>
                          <SelectItem value="URGENT">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="rounded-2xl border bg-background p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Progresso</p>
                      <p className="mt-1 text-sm text-muted-foreground">Defina o percentual de conclusão do trabalho em andamento.</p>
                      <div className="mt-3 flex items-center gap-3">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={draftProgress}
                          onChange={(event) => setDraftProgress(event.target.value)}
                          className="max-w-[120px] font-semibold"
                          aria-label="Editar progresso do card no painel"
                        />
                        <Badge className={draftProgressMeta.badgeClassName}>{safeDraftProgress}%</Badge>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn("h-full rounded-full transition-all", draftProgressMeta.barClassName)}
                          style={{ width: `${safeDraftProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border bg-card p-5 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pessoas</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Organize responsáveis relacionados ao card em um painel editável no estilo Monday.</p>
                  </div>

                  <div className="space-y-4">
                    {selectedUsers.length > 0 && (
                      <div className="rounded-2xl border bg-background p-4">
                        <p className="text-sm font-medium">Time relacionado</p>
                        <div className="mt-3 flex flex-wrap gap-3">
                          {selectedUsers.map((user) => {
                            const displayName = getUserDisplayName(user)

                            return (
                              <div key={user.id} className="flex items-center gap-2 rounded-full border bg-card px-2 py-1">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-[11px] font-semibold">
                                    {getUserInitials(displayName)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{displayName}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl border bg-background p-4">
                      <p className="text-sm font-medium">Usuários relacionados</p>
                      <div className="relative mt-3">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={userSearch}
                          onChange={(event) => setUserSearch(event.target.value)}
                          placeholder="Buscar por nome, usuário ou e-mail"
                          className="pl-9"
                        />
                      </div>

                      <ScrollArea className="mt-4 h-72 rounded-2xl border">
                        <div className="space-y-2 p-3">
                          {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => {
                              const checked = draftRelatedUsers.includes(user.id)
                              const displayName = getUserDisplayName(user)

                              return (
                                <label
                                  key={user.id}
                                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${checked ? "border-primary/30 bg-primary/5" : "bg-background/70 hover:bg-muted/40"}`}
                                >
                                  <Checkbox
                                    checked={checked}
                                    onClick={(event) => {
                                      event.preventDefault()
                                      handleToggleRelatedUser(user.id, !checked)
                                    }}
                                    onCheckedChange={(value) => handleToggleRelatedUser(user.id, value === true)}
                                  />
                                  <Avatar className="h-10 w-10">
                                    <AvatarFallback className="text-xs font-semibold">
                                      {getUserInitials(displayName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-medium">{displayName}</p>
                                      {checked && <Badge variant="secondary">Selecionado</Badge>}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{user.email || user.username}</p>
                                  </div>
                                </label>
                              )
                            })
                          ) : (
                            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                              Nenhum usuário encontrado para a busca atual.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
