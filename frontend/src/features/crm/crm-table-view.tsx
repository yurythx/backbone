"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Column, ColumnDef, OnChangeFn, SortingState, VisibilityState } from "@tanstack/react-table"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, CircleCheckBig, Loader2 } from "lucide-react"

import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/axios"
import { cn } from "@/lib/utils"
import { Deal, getDealColumnId, getDealColumnMeta, getDealColumnTitle, getPipelineColumns, isDealInColumn, Pipeline, useCRM } from "./use-crm"
import { getDeadlineMeta, getDealStatusMeta, getPriorityMeta, getProgressMeta, getProgressValue, getStageMeta, isCriticalDeal } from "./crm-visuals"
import { DealDetailsModal } from "./deal-details-modal"

interface CRMTableViewProps {
  pipeline: Pipeline
  stageFilter: string
  priorityFilter: Deal["priority"] | "all"
  ownerFilter: string
  titleSearch: string
  sorting: SortingState
  columnVisibility: VisibilityState
  onStageFilterChange: (value: string) => void
  onPriorityFilterChange: (value: Deal["priority"] | "all") => void
  onOwnerFilterChange: (value: string) => void
  onTitleSearchChange: (value: string) => void
  onSortingChange: OnChangeFn<SortingState>
  onColumnVisibilityChange: OnChangeFn<VisibilityState>
}

interface CRMUser {
  id: number
  username: string
  first_name?: string
  last_name?: string
  email?: string
}

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

function getDeadlineInputValue(closingDate?: string) {
  if (!closingDate) return ""
  return format(new Date(closingDate), "yyyy-MM-dd'T'HH:mm")
}

function getPrioritySortValue(priority: Deal["priority"]) {
  if (priority === "LOW") return 1
  if (priority === "MEDIUM") return 2
  if (priority === "HIGH") return 3
  return 4
}

function getDeadlineSortValue(closingDate?: string) {
  if (!closingDate) return Number.MAX_SAFE_INTEGER
  return new Date(closingDate).getTime()
}

function SortableHeader<TData>({ column, label }: { column: Column<TData, unknown>; label: string }) {
  const sorted = column.getIsSorted()

  return (
    <Button
      type="button"
      variant="ghost"
      className="h-8 px-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
      onClick={() => column.toggleSorting(sorted === "asc")}
      aria-label={`Ordenar por ${label}`}
    >
      {label}
      {sorted === "asc" && <ArrowUp className="ml-2 h-3.5 w-3.5" />}
      {sorted === "desc" && <ArrowDown className="ml-2 h-3.5 w-3.5" />}
      {!sorted && <ArrowUpDown className="ml-2 h-3.5 w-3.5" />}
    </Button>
  )
}

export function CRMTableView({
  pipeline,
  stageFilter,
  priorityFilter,
  ownerFilter,
  titleSearch,
  sorting,
  columnVisibility,
  onStageFilterChange,
  onPriorityFilterChange,
  onOwnerFilterChange,
  onTitleSearchChange,
  onSortingChange,
  onColumnVisibilityChange,
}: CRMTableViewProps) {
  const { deals, isLoading, updateDeal } = useCRM()
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [pendingField, setPendingField] = useState<string | null>(null)
  const pipelineColumns = useMemo(() => getPipelineColumns(pipeline), [pipeline])
  const stageIds = useMemo(
    () => pipelineColumns.map((column) => column.legacy_stage).filter((stageId): stageId is number => typeof stageId === "number"),
    [pipelineColumns]
  )
  const pipelineDeals = useMemo(
    () => deals.filter((deal) => pipelineColumns.some((column) => isDealInColumn(deal, column)) || stageIds.includes(deal.stage)),
    [deals, pipelineColumns, stageIds]
  )
  const filteredDeals = useMemo(
    () =>
      pipelineDeals.filter((deal) => {
        const matchesStage = stageFilter === "all" || getDealColumnId(deal).toString() === stageFilter
        const matchesPriority = priorityFilter === "all" || deal.priority === priorityFilter
        const matchesOwner = ownerFilter === "all" || deal.owner.toString() === ownerFilter
        const matchesTitle =
          titleSearch.trim() === "" ||
          deal.title.toLowerCase().includes(titleSearch.trim().toLowerCase())
        return matchesStage && matchesPriority && matchesOwner && matchesTitle
      }),
    [ownerFilter, pipelineDeals, priorityFilter, stageFilter, titleSearch]
  )

  const { data: users = [] } = useQuery({
    queryKey: ["accounts-users-for-crm-table"],
    queryFn: async () => {
      const response = await api.get<CRMUser[] | { results?: CRMUser[] }>("/api/accounts/users/")
      return normalizeListResponse(response.data)
    }
  })

  const ownerById = useMemo(() => {
    return new Map(users.map((user) => [user.id, user]))
  }, [users])

  const availableOwners = useMemo(() => {
    const uniqueOwnerIds = Array.from(new Set(pipelineDeals.map((deal) => deal.owner)))

    return uniqueOwnerIds
      .map((ownerId) => {
        const owner = ownerById.get(ownerId)
        return {
          id: ownerId,
          name: owner ? getUserDisplayName(owner) : `Usuário #${ownerId}`,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
  }, [ownerById, pipelineDeals])

  const statusSummary = useMemo(() => {
    const summary = {
      overdue: 0,
      atRisk: 0,
      done: 0,
      averageProgress: 0,
    }

    if (filteredDeals.length === 0) {
      return summary
    }

    filteredDeals.forEach((deal) => {
      const status = getDealStatusMeta(deal)
      const progress = getProgressValue(deal)

      if (status.label === "Vencido") summary.overdue += 1
      if (status.label === "Em risco") summary.atRisk += 1
      if (status.label === "Concluído") summary.done += 1
      summary.averageProgress += progress
    })

    summary.averageProgress = Math.round(summary.averageProgress / filteredDeals.length)
    return summary
  }, [filteredDeals])

  const handleInlineUpdate = async (deal: Deal, data: Partial<Deal>, fieldKey: string) => {
    setPendingField(`${deal.id}:${fieldKey}`)
    try {
      await updateDeal.mutateAsync({
        id: deal.id,
        ...data,
      })
    } finally {
      setPendingField((current) => (current === `${deal.id}:${fieldKey}` ? null : current))
    }
  }

  const handleTitleCommit = async (deal: Deal, rawTitle: string) => {
    const nextTitle = rawTitle.trim()

    if (!nextTitle || nextTitle === deal.title) {
      return
    }

    await handleInlineUpdate(deal, { title: nextTitle }, "title")
  }

  const handleDeadlineCommit = async (deal: Deal, rawDeadline: string) => {
    const nextDeadline = rawDeadline.trim()
    const currentDeadline = getDeadlineInputValue(deal.closing_date)

    if (nextDeadline === currentDeadline) {
      return
    }

    await handleInlineUpdate(
      deal,
      { closing_date: nextDeadline || null } as Partial<Deal> & { closing_date: string | null },
      "closing_date"
    )
  }

  const handleProgressCommit = async (deal: Deal, rawProgress: string) => {
    const normalized = rawProgress.trim()
    const nextProgress = normalized === "" ? 0 : Number(normalized)

    if (!Number.isFinite(nextProgress)) {
      return
    }

    const clampedProgress = Math.max(0, Math.min(100, Math.round(nextProgress)))
    const currentProgress = getProgressValue(deal)

    if (clampedProgress === currentProgress) {
      return
    }

    await handleInlineUpdate(
      deal,
      {
        custom_fields: {
          ...(deal.custom_fields ?? {}),
          progress_percentage: clampedProgress,
        },
      },
      "progress_percentage"
    )
  }

  const columns = useMemo<ColumnDef<Deal>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => <SortableHeader column={column} label="Card" />,
        cell: ({ row }) => {
          const deal = row.original
          const priority = getPriorityMeta(deal.priority)
          const isPendingTitle = pendingField === `${deal.id}:title`

          return (
            <div
              className="min-w-[280px] space-y-2"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <div className="space-y-2">
                <Input
                  key={`${deal.id}:${deal.title}`}
                  defaultValue={deal.title}
                  onBlur={(event) => {
                    const nextTitle = event.currentTarget.value.trim()

                    if (!nextTitle) {
                      event.currentTarget.value = deal.title
                      return
                    }

                    void handleTitleCommit(deal, nextTitle)
                  }}
                  onKeyDown={(event) => {
                    event.stopPropagation()

                    if (event.key === "Enter") {
                      event.preventDefault()
                      const nextTitle = event.currentTarget.value.trim()
                      if (!nextTitle) {
                        event.currentTarget.value = deal.title
                        return
                      }
                      void handleTitleCommit(deal, nextTitle)
                    }

                    if (event.key === "Escape") {
                      event.preventDefault()
                      event.currentTarget.value = deal.title
                    }
                  }}
                  disabled={isPendingTitle || updateDeal.isPending}
                  aria-label={`Editar título do card ${deal.title}`}
                  className="h-10 border-dashed font-medium"
                />
                {isPendingTitle && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Salvando título...
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{deal.contact_name}</Badge>
                <Badge className={priority.className}>{priority.label}</Badge>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "column_title",
        header: ({ column }) => <SortableHeader column={column} label="Coluna" />,
        cell: ({ row }) => {
          const deal = row.original
          const isPendingStage = pendingField === `${deal.id}:stage`
          const stageMeta = getStageMeta(getDealColumnMeta(deal, [pipeline]), getDealColumnTitle(deal))

          return (
            <div
              className="min-w-[180px]"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <Select
                value={getDealColumnId(deal).toString()}
                onValueChange={(value) => {
                  const nextColumnId = Number(value)
                  handleInlineUpdate(deal, { column: nextColumnId }, "stage")
                }}
                disabled={isPendingStage || updateDeal.isPending}
              >
                <SelectTrigger
                  className={cn("h-9 border-2 font-medium", stageMeta.className)}
                  aria-label={`Editar coluna do card ${deal.title}`}
                >
                  <SelectValue placeholder="Selecione a coluna" />
                </SelectTrigger>
                <SelectContent>
                  {pipelineColumns.map((column) => (
                    <SelectItem key={column.id} value={column.id.toString()}>
                      {column.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isPendingStage && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Salvando coluna...
                </div>
              )}
            </div>
          )
        },
      },
      {
        id: "status",
        accessorFn: (deal) => getDealStatusMeta(deal).label,
        header: ({ column }) => <SortableHeader column={column} label="Status" />,
        sortingFn: (rowA, rowB) =>
          getDealStatusMeta(rowA.original).sortValue - getDealStatusMeta(rowB.original).sortValue,
        cell: ({ row }) => {
          const deal = row.original
          const status = getDealStatusMeta(deal)
          const progress = getProgressValue(deal)
          const isCritical = isCriticalDeal(deal)

          return (
            <div className="min-w-[180px] space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={status.className}>{status.label}</Badge>
                {isCritical ? <Badge className="border-rose-300 bg-rose-100 text-rose-800">Crítico</Badge> : null}
                {status.tone === "danger" || status.tone === "warning" ? (
                  <AlertTriangle className="h-4 w-4 text-current text-amber-700" />
                ) : null}
                {status.tone === "success" ? (
                  <CircleCheckBig className="h-4 w-4 text-emerald-700" />
                ) : null}
              </div>
              <div className="text-xs text-muted-foreground">
                {progress}% concluído
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "priority",
        header: ({ column }) => <SortableHeader column={column} label="Prioridade" />,
        sortingFn: (rowA, rowB) =>
          getPrioritySortValue(rowA.original.priority) - getPrioritySortValue(rowB.original.priority),
        cell: ({ row }) => {
          const deal = row.original
          const isPendingPriority = pendingField === `${deal.id}:priority`
          const priorityMeta = getPriorityMeta(deal.priority)

          return (
            <div
              className="min-w-[170px]"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <Select
                value={deal.priority}
                onValueChange={(value) => handleInlineUpdate(deal, { priority: value as Deal["priority"] }, "priority")}
                disabled={isPendingPriority || updateDeal.isPending}
              >
                <SelectTrigger
                  className={cn("h-9 border-2 font-medium", priorityMeta.className)}
                  aria-label={`Editar prioridade do card ${deal.title}`}
                >
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Baixa</SelectItem>
                  <SelectItem value="MEDIUM">Média</SelectItem>
                  <SelectItem value="HIGH">Alta</SelectItem>
                  <SelectItem value="URGENT">Urgente</SelectItem>
                </SelectContent>
              </Select>
              {isPendingPriority && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Salvando prioridade...
                </div>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "owner",
        header: ({ column }) => <SortableHeader column={column} label="Responsável" />,
        sortingFn: (rowA, rowB) => {
          const ownerA = ownerById.get(rowA.original.owner)
          const ownerB = ownerById.get(rowB.original.owner)
          const nameA = ownerA ? getUserDisplayName(ownerA) : `Usuário #${rowA.original.owner}`
          const nameB = ownerB ? getUserDisplayName(ownerB) : `Usuário #${rowB.original.owner}`
          return nameA.localeCompare(nameB, "pt-BR")
        },
        cell: ({ row }) => {
          const deal = row.original
          const owner = ownerById.get(deal.owner)
          const ownerName = owner ? getUserDisplayName(owner) : `Usuário #${deal.owner}`
          const ownerOptions = availableOwners.filter((availableOwner) => availableOwner.id !== deal.owner)
          const isPendingOwner = pendingField === `${deal.id}:owner`

          return (
            <div
              className="min-w-[220px] space-y-2"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <Select
                value={deal.owner.toString()}
                onValueChange={(value) => handleInlineUpdate(deal, { owner: Number(value) }, "owner")}
                disabled={isPendingOwner || updateDeal.isPending}
              >
                <SelectTrigger className="h-10 bg-background" aria-label={`Editar responsável do card ${deal.title}`}>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={deal.owner.toString()}>{ownerName}</SelectItem>
                  {ownerOptions.map((availableOwner) => (
                    <SelectItem key={availableOwner.id} value={availableOwner.id.toString()}>
                      {availableOwner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-[11px] font-semibold">
                    {getUserInitials(ownerName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate font-medium">{ownerName}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {owner?.email || owner?.username || "Responsável do card"}
                  </div>
                </div>
              </div>
              {isPendingOwner && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Salvando responsável...
                </div>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "closing_date",
        header: ({ column }) => <SortableHeader column={column} label="Prazo" />,
        sortingFn: (rowA, rowB) =>
          getDeadlineSortValue(rowA.original.closing_date) - getDeadlineSortValue(rowB.original.closing_date),
        cell: ({ row }) => {
          const deal = row.original
          const deadline = getDeadlineMeta(deal.closing_date)
          const isPendingDeadline = pendingField === `${deal.id}:closing_date`

          return (
            <div
              className="space-y-2 min-w-[220px]"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <Badge className={deadline.className}>{deadline.label}</Badge>
              <Input
                key={`${deal.id}:${deal.closing_date ?? "empty"}`}
                type="datetime-local"
                defaultValue={getDeadlineInputValue(deal.closing_date)}
                onBlur={(event) => void handleDeadlineCommit(deal, event.currentTarget.value)}
                onKeyDown={(event) => {
                  event.stopPropagation()

                  if (event.key === "Enter") {
                    event.preventDefault()
                    void handleDeadlineCommit(deal, event.currentTarget.value)
                  }

                  if (event.key === "Escape") {
                    event.preventDefault()
                    event.currentTarget.value = getDeadlineInputValue(deal.closing_date)
                  }
                }}
                disabled={isPendingDeadline || updateDeal.isPending}
                aria-label={`Editar prazo do card ${deal.title}`}
                className="h-10"
              />
              <div className="text-xs text-muted-foreground">
                {deal.closing_date
                  ? format(new Date(deal.closing_date), "dd/MM/yyyy", { locale: ptBR })
                  : "Sem data definida"}
              </div>
              {isPendingDeadline && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Salvando prazo...
                </div>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "custom_fields.progress_percentage",
        header: ({ column }) => <SortableHeader column={column} label="Progresso" />,
        sortingFn: (rowA, rowB) => getProgressValue(rowA.original) - getProgressValue(rowB.original),
        cell: ({ row }) => {
          const deal = row.original
          const progress = getProgressValue(deal)
          const progressMeta = getProgressMeta(progress)
          const isPendingProgress = pendingField === `${deal.id}:progress_percentage`

          return (
            <div
              className="min-w-[220px] space-y-2"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <Badge className={progressMeta.badgeClassName}>{progressMeta.label}</Badge>
                <Input
                  key={`${deal.id}:${progress}`}
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={progress}
                  onBlur={(event) => void handleProgressCommit(deal, event.currentTarget.value)}
                  onKeyDown={(event) => {
                    event.stopPropagation()

                    if (event.key === "Enter") {
                      event.preventDefault()
                      void handleProgressCommit(deal, event.currentTarget.value)
                    }

                    if (event.key === "Escape") {
                      event.preventDefault()
                      event.currentTarget.value = progress.toString()
                    }
                  }}
                  disabled={isPendingProgress || updateDeal.isPending}
                  aria-label={`Editar progresso do card ${deal.title}`}
                  className="h-9 w-24 text-right font-semibold"
                />
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn("h-full rounded-full transition-all", progressMeta.barClassName)}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs font-medium text-muted-foreground">{progress}% concluído</div>
              {isPendingProgress && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Salvando progresso...
                </div>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "value",
        header: ({ column }) => <SortableHeader column={column} label="Valor" />,
        sortingFn: (rowA, rowB) => Number(rowA.original.value) - Number(rowB.original.value),
        cell: ({ row }) => (
          <div className="font-medium">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(row.original.value))}
          </div>
        ),
      },
    ],
    [availableOwners, handleDeadlineCommit, handleInlineUpdate, handleProgressCommit, ownerById, pendingField, pipeline, pipelineColumns, updateDeal.isPending]
  )

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-3xl border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Tabela operacional do pipeline</h3>
              <p className="text-sm text-muted-foreground">
                Abra qualquer linha para editar o card no mesmo painel lateral do Kanban.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{pipeline.name}</Badge>
              <Badge variant="secondary">{filteredDeals.length} card{filteredDeals.length === 1 ? "" : "s"}</Badge>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-5 shadow-sm">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Filtros rápidos</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Combine coluna e prioridade para enxergar a operação como em um board gerencial.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-20 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Coluna</span>
                <Button
                  variant={stageFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onStageFilterChange("all")}
                  aria-pressed={stageFilter === "all"}
                >
                  Todas
                </Button>
                {pipelineColumns.map((column) => (
                  <Button
                    key={column.id}
                    variant={stageFilter === column.id.toString() ? "default" : "outline"}
                    size="sm"
                    onClick={() => onStageFilterChange(column.id.toString())}
                    aria-pressed={stageFilter === column.id.toString()}
                  >
                    {column.title}
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-20 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Prioridade</span>
                <Button
                  variant={priorityFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPriorityFilterChange("all")}
                  aria-pressed={priorityFilter === "all"}
                >
                  Todas
                </Button>
                {(["LOW", "MEDIUM", "HIGH", "URGENT"] as Deal["priority"][]).map((priority) => {
                  const meta = getPriorityMeta(priority)

                  return (
                    <Button
                      key={priority}
                      variant={priorityFilter === priority ? "default" : "outline"}
                      size="sm"
                      onClick={() => onPriorityFilterChange(priority)}
                      aria-pressed={priorityFilter === priority}
                    >
                      {meta.label}
                    </Button>
                  )
                })}
              </div>

              <div className="grid gap-2 md:max-w-sm">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Responsável</span>
                <Select value={ownerFilter} onValueChange={onOwnerFilterChange}>
                  <SelectTrigger aria-label="Filtrar por responsável" className="h-10 bg-background">
                    <SelectValue placeholder="Todos os responsáveis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os responsáveis</SelectItem>
                    {availableOwners.map((owner) => (
                      <SelectItem key={owner.id} value={owner.id.toString()}>
                        {owner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,320px)_1fr] md:items-center">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Busca
                </span>
                <Input
                  value={titleSearch}
                  onChange={(event) => onTitleSearchChange(event.target.value)}
                  placeholder="Buscar cards por título"
                  role="searchbox"
                  aria-label="Buscar cards por título"
                  className="mt-2"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                A busca é combinada com os filtros rápidos para localizar cards mesmo em pipelines com muitos itens.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Vencidos</p>
                <div className="mt-2 text-2xl font-semibold text-rose-700">{statusSummary.overdue}</div>
              </div>
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Em risco</p>
                <div className="mt-2 text-2xl font-semibold text-amber-700">{statusSummary.atRisk}</div>
              </div>
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Concluídos</p>
                <div className="mt-2 text-2xl font-semibold text-emerald-700">{statusSummary.done}</div>
              </div>
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Progresso médio</p>
                <div className="mt-2 text-2xl font-semibold text-primary">{statusSummary.averageProgress}%</div>
              </div>
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredDeals}
          isLoading={isLoading}
          sorting={sorting}
          onSortingChange={onSortingChange}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={onColumnVisibilityChange}
          onRowClick={setSelectedDeal}
          getRowClassName={(deal) =>
            cn(
              "hover:bg-primary/5",
              isCriticalDeal(deal) && "border-l-4 border-l-rose-500 bg-rose-50/60"
            )
          }
          getRowAriaLabel={(deal) => `Abrir card ${deal.title}`}
        />
      </div>

      {selectedDeal && (
        <DealDetailsModal
          deal={selectedDeal}
          open={!!selectedDeal}
          onOpenChange={(open) => {
            if (!open) setSelectedDeal(null)
          }}
        />
      )}
    </>
  )
}
