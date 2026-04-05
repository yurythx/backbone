import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { toast } from "sonner"

export type CRMViewMode = "overview" | "kanban" | "list"

export interface Contact {
  id: number
  uuid: string
  name: string
  email?: string
  phone?: string
  company_name?: string
}

export interface Stage {
  id: number
  pipeline: number
  name: string
  order: number
}

export interface CRMColumn {
  id: number
  pipeline: number
  title: string
  order: number
  color: string
  column_kind?: "backlog" | "planned" | "active" | "done" | "custom"
  marks_done?: boolean
  requires_schedule?: boolean
  requires_assignee?: boolean
  allowed_source_columns?: number[]
  wip_limit?: number | null
  legacy_stage?: number | null
  cards?: Deal[]
}

export interface Pipeline {
  id: number
  name: string
  description?: string
  stages: Stage[]
  columns?: CRMColumn[]
}

export interface CRMSavedViewFilters {
  stageFilter: string
  priorityFilter: Deal["priority"] | "all"
  ownerFilter: string
  titleSearch: string
}

export interface CRMSavedViewSortingItem {
  id: string
  desc: boolean
}

export interface CRMSavedView {
  id: number
  pipeline: number
  owner: number
  owner_name?: string
  name: string
  view_mode: CRMViewMode
  filters: Partial<CRMSavedViewFilters>
  sorting: CRMSavedViewSortingItem[]
  column_visibility: Record<string, boolean>
  is_default: boolean
}

export interface DealActivity {
  id: number;
  activity_type: "column_change" | "stage_change" | "note" | "automation" | "creation";
  description: string;
  actor_name: string;
  created_at: string;
  old_value?: any;
  new_value?: any;
}

export interface DealNoteInput {
  dealId: number
  description: string
}

export interface Deal {
  id: number
  uuid: string
  title: string
  description?: string
  contact: number
  contact_name: string
  stage?: number
  stage_name?: string
  stage_legacy_id?: number
  stage_legacy_name?: string
  column?: number | null
  column_id?: number | null
  column_title?: string
  column_data?: CRMColumn | null
  value: string
  closing_date?: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  owner: number
  is_closed: boolean
  external_id?: string | null
  integration_source?: string
  data_agendamento?: string
  tecnico_responsavel?: number | null
  custom_fields?: Record<string, any>
  activities?: DealActivity[]
}

function normalizeListResponse<T>(data: T[] | { results?: T[] } | undefined): T[] {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.results)) return data.results
  return []
}

function mergeDealCache(currentDeals: Deal[] | undefined, updatedDeal: Deal) {
  if (!currentDeals) return [updatedDeal]
  const exists = currentDeals.some((deal) => deal.id === updatedDeal.id)
  if (!exists) return [updatedDeal, ...currentDeals]
  return currentDeals.map((deal) => deal.id === updatedDeal.id ? updatedDeal : deal)
}

function normalizeColumnSemanticText(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
}

export function inferColumnSemantics(title?: string | null) {
  const normalizedTitle = normalizeColumnSemanticText(title)

  if (["novo", "new", "backlog"].includes(normalizedTitle)) {
    return {
      column_kind: "backlog" as const,
      marks_done: false,
      requires_schedule: false,
      requires_assignee: false,
    }
  }

  if (normalizedTitle.includes("planejad") || normalizedTitle.includes("agendad")) {
    return {
      column_kind: "planned" as const,
      marks_done: false,
      requires_schedule: true,
      requires_assignee: true,
    }
  }

  if (["andamento", "execucao", "progresso", "in progress", "doing"].some((token) => normalizedTitle.includes(token))) {
    return {
      column_kind: "active" as const,
      marks_done: false,
      requires_schedule: false,
      requires_assignee: false,
    }
  }

  if (["concluid", "finaliz", "encerr", "done", "closed"].some((token) => normalizedTitle.includes(token))) {
    return {
      column_kind: "done" as const,
      marks_done: true,
      requires_schedule: false,
      requires_assignee: false,
    }
  }

  return {
    column_kind: "custom" as const,
    marks_done: false,
    requires_schedule: false,
    requires_assignee: false,
  }
}

export function resolveColumnSemantics(column?: Partial<CRMColumn> | null) {
  const inferred = inferColumnSemantics(column?.title)

  return {
    column_kind: column?.column_kind ?? inferred.column_kind,
    marks_done: column?.marks_done ?? inferred.marks_done,
    requires_schedule: column?.requires_schedule ?? inferred.requires_schedule,
    requires_assignee: column?.requires_assignee ?? inferred.requires_assignee,
    allowed_source_columns: Array.isArray(column?.allowed_source_columns) ? column?.allowed_source_columns : [],
    wip_limit: typeof column?.wip_limit === "number" ? column.wip_limit : null,
  }
}

export function getPipelineColumns(pipeline: Pipeline): CRMColumn[] {
  if (pipeline.columns && pipeline.columns.length > 0) {
    return [...pipeline.columns]
      .map((column) => ({ ...column, ...resolveColumnSemantics(column) }))
      .sort((a, b) => a.order - b.order || a.id - b.id)
  }

  return [...pipeline.stages]
    .sort((a, b) => a.order - b.order || a.id - b.id)
    .map((stage) => ({
      id: stage.id,
      pipeline: stage.pipeline,
      title: stage.name,
      order: stage.order,
      color: "#CBD5E1",
      ...inferColumnSemantics(stage.name),
      legacy_stage: stage.id,
    }))
}

export function getPipelineStageFromColumn(pipeline: Pipeline, columnId?: number | null) {
  if (!columnId) return undefined

  const column = getPipelineColumns(pipeline).find((item) => item.id === columnId)
  if (!column) return undefined

  if (column.legacy_stage) {
    return pipeline.stages.find((stage) => stage.id === column.legacy_stage)
  }

  return pipeline.stages.find((stage) => stage.name === column.title)
}

export function getDealColumnTitle(deal: Pick<Deal, "column_title" | "stage_name">) {
  return deal.column_title || deal.stage_name || "Sem coluna"
}

export function getDealColumnId(deal: Pick<Deal, "column" | "stage">) {
  return deal.column || deal.stage
}

export function isDealInColumn(
  deal: Pick<Deal, "column" | "stage">,
  column: Pick<CRMColumn, "id" | "legacy_stage">
) {
  if (deal.column) {
    return deal.column === column.id
  }

  return deal.stage === column.legacy_stage
}

export function getDealColumnMeta(
  deal: Pick<Deal, "column" | "column_id" | "column_data" | "column_title" | "stage_name">,
  pipelines?: Pipeline[]
) {
  if (deal.column_data) {
    return {
      ...deal.column_data,
      ...resolveColumnSemantics(deal.column_data),
    }
  }

  const columnId = deal.column ?? deal.column_id
  if (columnId && pipelines) {
    const resolvedColumn = pipelines
      .flatMap((pipeline) => getPipelineColumns(pipeline))
      .find((column) => column.id === columnId)

    if (resolvedColumn) {
      return resolvedColumn
    }
  }

  const fallbackTitle = getDealColumnTitle(deal)
  return {
    id: columnId ?? 0,
    pipeline: 0,
    title: fallbackTitle,
    order: 0,
    color: "#CBD5E1",
    ...inferColumnSemantics(fallbackTitle),
  }
}

export function isDealDone(
  deal: Pick<Deal, "is_closed" | "custom_fields" | "column" | "column_id" | "column_data" | "column_title" | "stage_name">,
  pipelines?: Pipeline[]
) {
  const progress = typeof deal.custom_fields?.progress_percentage === "number"
    ? deal.custom_fields.progress_percentage
    : Number(deal.custom_fields?.progress_percentage)
  const safeProgress = Number.isFinite(progress) ? progress : 0
  return deal.is_closed || resolveColumnSemantics(getDealColumnMeta(deal, pipelines)).marks_done || safeProgress >= 100
}

export function getColumnOccupancy(
  columnId: number,
  deals: Pick<Deal, "id" | "column" | "column_id" | "stage">[],
  pipelines?: Pipeline[],
  ignoreDealId?: number
) {
  return deals.filter((deal) => {
    if (ignoreDealId && deal.id === ignoreDealId) return false
    const dealColumnId = getDealColumnId(deal)
    if (dealColumnId) return dealColumnId === columnId

    if (!pipelines) return false
    const resolvedColumn = pipelines
      .flatMap((pipeline) => getPipelineColumns(pipeline))
      .find((column) => isDealInColumn(deal, column))
    return resolvedColumn?.id === columnId
  }).length
}

export function getColumnTransitionGuard(
  deal: Pick<Deal, "id" | "column" | "column_id" | "column_data" | "column_title" | "stage" | "stage_name">,
  targetColumn: Partial<CRMColumn> | null | undefined,
  deals: Pick<Deal, "id" | "column" | "column_id" | "stage">[],
  pipelines?: Pipeline[]
) {
  if (!targetColumn?.id) {
    return { allowed: false, reason: "Selecione uma coluna válida." }
  }

  const sourceColumnId = getDealColumnId(deal)
  const semantics = resolveColumnSemantics(targetColumn)
  const pipelineColumns = pipelines?.flatMap((pipeline) => getPipelineColumns(pipeline)) ?? []
  const sourceColumn = sourceColumnId ? pipelineColumns.find((column) => column.id === sourceColumnId) : null

  if (sourceColumnId && sourceColumnId === targetColumn.id) {
    return { allowed: true, reason: null }
  }

  if (semantics.allowed_source_columns.length > 0 && (!sourceColumnId || !semantics.allowed_source_columns.includes(sourceColumnId))) {
    const allowedOrigins = semantics.allowed_source_columns
      .map((columnId) => pipelineColumns.find((column) => column.id === columnId)?.title)
      .filter(Boolean)
    return {
      allowed: false,
      reason: `A coluna '${targetColumn.title || "destino"}' não aceita cards vindos de '${sourceColumn?.title || "sem origem definida"}'.${allowedOrigins.length ? ` Origens permitidas: ${allowedOrigins.join(", ")}.` : ""}`,
    }
  }

  const occupancy = semantics.wip_limit ? getColumnOccupancy(targetColumn.id, deals, pipelines, deal.id) : 0
  if (semantics.wip_limit && occupancy >= semantics.wip_limit) {
    return {
      allowed: false,
      reason: `A coluna '${targetColumn.title || "destino"}' atingiu o limite WIP de ${semantics.wip_limit} cards (${occupancy}/${semantics.wip_limit}).`,
    }
  }

  return { allowed: true, reason: null }
}

const DEALS_FUTURE_PAYLOAD_QUERY = "?omit_legacy_stage_fields=1"

export function useCRM() {
  const queryClient = useQueryClient()

  // Pipelines e Estágios
  const { data: pipelines = [], isLoading: isLoadingPipelines } = useQuery({
    queryKey: ['crm-pipelines'],
    queryFn: async () => {
      const response = await api.get<Pipeline[] | { results?: Pipeline[] }>('/api/crm/pipelines/')
      return normalizeListResponse(response.data)
    }
  })

  // Deals (Cards do Kanban)
  const { data: deals = [], isLoading: isLoadingDeals } = useQuery({
    queryKey: ['crm-deals'],
    queryFn: async () => {
      const response = await api.get<Deal[] | { results?: Deal[] }>(`/api/crm/deals/${DEALS_FUTURE_PAYLOAD_QUERY}`)
      return normalizeListResponse(response.data)
    }
  })

  // Contatos
  const { data: contacts = [] } = useQuery({
    queryKey: ['crm-contacts'],
    queryFn: async () => {
      const response = await api.get<Contact[] | { results?: Contact[] }>('/api/crm/contacts/')
      return normalizeListResponse(response.data)
    }
  })

  // Mutations
  const createDeal = useMutation({
    mutationFn: async (newDeal: Partial<Deal>) => {
      const response = await api.post(`/api/crm/deals/${DEALS_FUTURE_PAYLOAD_QUERY}`, newDeal)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-deals'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] }) // Sincronização!
      toast.success("Card criado com sucesso!")
    }
  })

  const updateDeal = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Deal> & { id: number }) => {
      const response = await api.patch<Deal>(`/api/crm/deals/${id}/${DEALS_FUTURE_PAYLOAD_QUERY}`, data)
      return response.data
    },
    onMutate: async (updatedDeal) => {
      // 1. Cancela refetches em andamento para não sobrescrever a atualização otimista
      await queryClient.cancelQueries({ queryKey: ['crm-deals'] })

      // 2. Snapshot do estado anterior para permitir rollback
      const previousDeals = queryClient.getQueryData<Deal[]>(['crm-deals'])
      const pipelines = queryClient.getQueryData<Pipeline[]>(['crm-pipelines']) || []
      const targetColumn = updatedDeal.column
        ? pipelines
            .flatMap((pipeline) => getPipelineColumns(pipeline))
            .find((column) => column.id === updatedDeal.column)
        : undefined
      const targetPipeline = targetColumn
        ? pipelines.find((pipeline) => pipeline.id === targetColumn.pipeline)
        : undefined
      const targetStage = updatedDeal.stage
        ? pipelines.flatMap((pipeline) => pipeline.stages).find((stage) => stage.id === updatedDeal.stage)
        : targetPipeline && targetColumn
          ? getPipelineStageFromColumn(targetPipeline, targetColumn.id)
          : undefined

      // 3. Atualiza o cache de forma otimista
      if (previousDeals) {
        queryClient.setQueryData<Deal[]>(['crm-deals'], (old) => {
          return old?.map((deal) =>
            deal.id === updatedDeal.id ? {
              ...deal,
              ...updatedDeal,
              stage: updatedDeal.stage ?? targetStage?.id ?? deal.stage,
              stage_name: targetStage?.name || deal.stage_name,
              column: updatedDeal.column ?? targetColumn?.id ?? getDealColumnId(deal),
              column_title: targetColumn?.title || deal.column_title,
              column_data: targetColumn
                ? { ...targetColumn, ...resolveColumnSemantics(targetColumn) }
                : deal.column_data,
              is_closed: targetColumn ? resolveColumnSemantics(targetColumn).marks_done : deal.is_closed,
            } : deal
          )
        })
      }

      // Retorna o contexto com o snapshot
      return { previousDeals }
    },
    onError: (err: any, _updatedDeal, context) => {
      // Se a mutação falhar, reverte para o estado anterior
      if (context?.previousDeals) {
        queryClient.setQueryData(['crm-deals'], context.previousDeals)
      }
      const columnErrors = err?.response?.data?.column
      const message =
        (Array.isArray(columnErrors) ? columnErrors[0] : columnErrors) ||
        err?.response?.data?.detail ||
        "Erro ao mover card."
      toast.error(String(message))
    },
    onSuccess: (savedDeal) => {
      queryClient.setQueryData<Deal[]>(['crm-deals'], (old) => mergeDealCache(old, savedDeal))
      toast.success("Progresso atualizado!")
    },
    onSettled: () => {
      // Sempre invalida as queries para garantir sincronização final com o servidor (Background)
      queryClient.invalidateQueries({ queryKey: ['crm-deals'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  const addDealNote = useMutation({
    mutationFn: async ({ dealId, description }: DealNoteInput) => {
      const response = await api.post<Deal>(`/api/crm/deals/${dealId}/notes/`, { description })
      return response.data
    },
    onSuccess: (savedDeal) => {
      queryClient.setQueryData<Deal[]>(['crm-deals'], (old) => mergeDealCache(old, savedDeal))
      toast.success("Atualização publicada!")
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.description
      const message =
        (Array.isArray(detail) ? detail[0] : detail) ||
        err?.response?.data?.detail ||
        "Não foi possível publicar a atualização."
      toast.error(String(message))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-deals'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  return {
    pipelines,
    deals,
    contacts,
    isLoading: isLoadingPipelines || isLoadingDeals,
    createDeal,
    updateDeal,
    addDealNote
  }
}
