"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { OnChangeFn, SortingState, VisibilityState } from "@tanstack/react-table"
import { PageHeader } from "@/components/ui/page-header"
import { ModuleGuard } from "@/components/module-guard"
import { CRMSavedView, CRMViewMode, useCRM } from "./use-crm"
import dynamic from "next/dynamic"
import { KanbanSkeleton } from "./kanban-skeleton"

const KanbanBoard = dynamic(() => import("./kanban-board").then(m => m.KanbanBoard), { 
  ssr: false, 
  loading: () => <KanbanSkeleton />
})

import { CreateDealModal } from "./create-deal-modal"
import { ColumnGovernanceSheet } from "./column-governance-sheet"
import { CRMTableView } from "./crm-table-view"
import { CRMPipelineOverview, PipelineOverviewData } from "./crm-pipeline-overview"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { LayoutGrid, List, PanelsTopLeft } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/axios"
import { toast } from "sonner"

const DEFAULT_CRM_FILTERS = {
  stageFilter: "all",
  priorityFilter: "all" as const,
  ownerFilter: "all",
  titleSearch: "",
}

function normalizeSavedViewSorting(sorting: CRMSavedView["sorting"] | undefined): SortingState {
  if (!Array.isArray(sorting)) return []
  return sorting
    .filter((item): item is { id: string; desc: boolean } => typeof item?.id === "string")
    .map((item) => ({ id: item.id, desc: Boolean(item.desc) }))
}

function normalizeSavedViewVisibility(columnVisibility: CRMSavedView["column_visibility"] | undefined): VisibilityState {
  if (!columnVisibility || typeof columnVisibility !== "object" || Array.isArray(columnVisibility)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(columnVisibility).map(([key, value]) => [key, Boolean(value)])
  )
}

function normalizeSavedViewsResponse(data: CRMSavedView[] | { results?: CRMSavedView[] } | undefined) {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.results)) return data.results
  return []
}

export default function CRMPage() {
  const { pipelines, deals, isLoading } = useCRM()
  const queryClient = useQueryClient()
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null)
  const [view, setView] = useState<CRMViewMode>("kanban")
  const [selectedSavedViewId, setSelectedSavedViewId] = useState<number | null>(null)
  const [savedViewName, setSavedViewName] = useState("")
  const [stageFilter, setStageFilter] = useState(DEFAULT_CRM_FILTERS.stageFilter)
  const [priorityFilter, setPriorityFilter] = useState<typeof DEFAULT_CRM_FILTERS.priorityFilter>(DEFAULT_CRM_FILTERS.priorityFilter)
  const [ownerFilter, setOwnerFilter] = useState(DEFAULT_CRM_FILTERS.ownerFilter)
  const [titleSearch, setTitleSearch] = useState(DEFAULT_CRM_FILTERS.titleSearch)
  const [tableSorting, setTableSorting] = useState<SortingState>([])
  const [tableColumnVisibility, setTableColumnVisibility] = useState<VisibilityState>({})

  // Seleciona o primeiro pipeline por padrão
  const currentPipeline = selectedPipelineId 
    ? pipelines.find(p => p.id === selectedPipelineId) 
    : pipelines[0]

  const resetViewState = () => {
    setView("kanban")
    setStageFilter(DEFAULT_CRM_FILTERS.stageFilter)
    setPriorityFilter(DEFAULT_CRM_FILTERS.priorityFilter)
    setOwnerFilter(DEFAULT_CRM_FILTERS.ownerFilter)
    setTitleSearch(DEFAULT_CRM_FILTERS.titleSearch)
    setTableSorting([])
    setTableColumnVisibility({})
  }

  const applySavedView = (savedView: CRMSavedView) => {
    setSelectedSavedViewId(savedView.id)
    setSavedViewName(savedView.name)
    setView(savedView.view_mode)
    setStageFilter(savedView.filters?.stageFilter || DEFAULT_CRM_FILTERS.stageFilter)
    setPriorityFilter((savedView.filters?.priorityFilter as typeof DEFAULT_CRM_FILTERS.priorityFilter) || DEFAULT_CRM_FILTERS.priorityFilter)
    setOwnerFilter(savedView.filters?.ownerFilter || DEFAULT_CRM_FILTERS.ownerFilter)
    setTitleSearch(savedView.filters?.titleSearch || DEFAULT_CRM_FILTERS.titleSearch)
    setTableSorting(normalizeSavedViewSorting(savedView.sorting))
    setTableColumnVisibility(normalizeSavedViewVisibility(savedView.column_visibility))
  }

  const buildSavedViewPayload = (name: string) => ({
    pipeline: currentPipeline?.id,
    name,
    view_mode: view,
    filters: {
      stageFilter,
      priorityFilter,
      ownerFilter,
      titleSearch,
    },
    sorting: tableSorting,
    column_visibility: tableColumnVisibility,
  })

  const { data: pipelineOverview, isLoading: isLoadingOverview } = useQuery({
    queryKey: ["crm-pipeline-overview", currentPipeline?.id],
    enabled: Boolean(currentPipeline?.id),
    queryFn: async () => {
      const response = await api.get<PipelineOverviewData>(`/api/crm/pipelines/${currentPipeline?.id}/overview/`)
      return response.data
    },
  })

  const { data: savedViews = [], isLoading: isLoadingSavedViews } = useQuery({
    queryKey: ["crm-saved-views", currentPipeline?.id],
    enabled: Boolean(currentPipeline?.id),
    queryFn: async () => {
      const response = await api.get<CRMSavedView[] | { results?: CRMSavedView[] }>(`/api/crm/saved-views/?pipeline_id=${currentPipeline?.id}`)
      return normalizeSavedViewsResponse(response.data)
    },
  })

  useEffect(() => {
    if (!currentPipeline?.id) {
      setSelectedSavedViewId(null)
      setSavedViewName("")
      resetViewState()
      return
    }

    const currentSelected = savedViews.find((item) => item.id === selectedSavedViewId)
    if (currentSelected) {
      setSavedViewName(currentSelected.name)
      return
    }

    const defaultSavedView = savedViews.find((item) => item.is_default)
    if (defaultSavedView) {
      applySavedView(defaultSavedView)
      return
    }

    setSelectedSavedViewId(null)
    setSavedViewName("")
    resetViewState()
  }, [currentPipeline?.id, savedViews, selectedSavedViewId])

  const createSavedView = useMutation({
    mutationFn: async () => {
      if (!currentPipeline?.id || !savedViewName.trim()) {
        throw new Error("Defina um nome para salvar a vista.")
      }

      const response = await api.post<CRMSavedView>("/api/crm/saved-views/", buildSavedViewPayload(savedViewName.trim()))
      return response.data
    },
    onSuccess: (savedView) => {
      queryClient.invalidateQueries({ queryKey: ["crm-saved-views", currentPipeline?.id] })
      applySavedView(savedView)
      toast.success("Vista salva com sucesso!")
    },
    onError: () => {
      toast.error("Não foi possível salvar a vista.")
    },
  })

  const updateSavedView = useMutation({
    mutationFn: async (extraPayload?: Partial<CRMSavedView>) => {
      if (!selectedSavedViewId || !savedViewName.trim()) {
        throw new Error("Selecione uma vista salva para atualizar.")
      }

      const response = await api.patch<CRMSavedView>(
        `/api/crm/saved-views/${selectedSavedViewId}/`,
        {
          ...buildSavedViewPayload(savedViewName.trim()),
          ...extraPayload,
        }
      )
      return response.data
    },
    onSuccess: (savedView) => {
      queryClient.invalidateQueries({ queryKey: ["crm-saved-views", currentPipeline?.id] })
      applySavedView(savedView)
      toast.success("Vista atualizada com sucesso!")
    },
    onError: () => {
      toast.error("Não foi possível atualizar a vista.")
    },
  })

  const deleteSavedView = useMutation({
    mutationFn: async () => {
      if (!selectedSavedViewId) {
        throw new Error("Selecione uma vista salva para remover.")
      }
      await api.delete(`/api/crm/saved-views/${selectedSavedViewId}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-saved-views", currentPipeline?.id] })
      setSelectedSavedViewId(null)
      setSavedViewName("")
      toast.success("Vista removida com sucesso!")
    },
    onError: () => {
      toast.error("Não foi possível remover a vista.")
    },
  })

  const handleTableSortingChange: OnChangeFn<SortingState> = (updater) => {
    setTableSorting((current) => (typeof updater === "function" ? updater(current) : updater))
  }

  const handleTableVisibilityChange: OnChangeFn<VisibilityState> = (updater) => {
    setTableColumnVisibility((current) => (typeof updater === "function" ? updater(current) : updater))
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div className="space-y-2">
             <Skeleton className="h-10 w-64 rounded-2xl" />
             <Skeleton className="h-4 w-96 rounded-lg" />
           </div>
           <Skeleton className="h-10 w-48 rounded-xl" />
        </div>
        <KanbanSkeleton />
      </div>
    )
  }

  return (
    <ModuleGuard moduleCode="crm">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <PageHeader
            title="CRM & Atendimento"
            description="Gerencie seus leads e chamados de TI em tempo real."
          />
          
          <div className="flex items-center gap-2">
            <Select 
              value={currentPipeline?.id.toString()} 
              onValueChange={(val) => setSelectedPipelineId(parseInt(val))}
            >
              <SelectTrigger className="w-[200px] glass">
                <SelectValue placeholder="Selecione o Fluxo" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {currentPipeline ? <ColumnGovernanceSheet pipeline={currentPipeline} deals={deals} /> : null}
            <CreateDealModal pipeline={currentPipeline} />
          </div>
        </div>

        {currentPipeline && (
          <div className="rounded-3xl border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Vistas salvas</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Salve combinacoes de aba, filtros, ordenacao e colunas visiveis por pipeline.
                </p>
              </div>

              <div className="flex flex-1 flex-col gap-2 xl:max-w-4xl xl:flex-row xl:items-center xl:justify-end">
                <Select
                  value={selectedSavedViewId ? selectedSavedViewId.toString() : "none"}
                  onValueChange={(value) => {
                    if (value === "none") {
                      setSelectedSavedViewId(null)
                      setSavedViewName("")
                      resetViewState()
                      return
                    }

                    const savedView = savedViews.find((item) => item.id.toString() === value)
                    if (savedView) {
                      applySavedView(savedView)
                    }
                  }}
                >
                  <SelectTrigger className="w-full xl:w-[240px]">
                    <SelectValue placeholder={isLoadingSavedViews ? "Carregando vistas..." : "Selecione uma vista"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vista salva</SelectItem>
                    {savedViews.map((savedView) => (
                      <SelectItem key={savedView.id} value={savedView.id.toString()}>
                        {savedView.is_default ? `${savedView.name} (padrão)` : savedView.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={savedViewName}
                  onChange={(event) => setSavedViewName(event.target.value)}
                  placeholder="Nome da vista"
                  className="w-full xl:w-[240px]"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => createSavedView.mutate()}
                    disabled={!currentPipeline || !savedViewName.trim() || createSavedView.isPending}
                  >
                    Salvar nova
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateSavedView.mutate()}
                    disabled={!selectedSavedViewId || !savedViewName.trim() || updateSavedView.isPending}
                  >
                    Atualizar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateSavedView.mutate({ is_default: true })}
                    disabled={!selectedSavedViewId || updateSavedView.isPending}
                  >
                    Definir padrão
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => deleteSavedView.mutate()}
                    disabled={!selectedSavedViewId || deleteSavedView.isPending}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Tabs value={view} onValueChange={(v) => setView(v as CRMViewMode)} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="glass p-1">
              <TabsTrigger value="kanban" className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" /> Kanban
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" /> Tabela
              </TabsTrigger>
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <PanelsTopLeft className="h-4 w-4" /> Visão Geral
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="m-0">
            {currentPipeline ? (
              <CRMPipelineOverview
                pipeline={currentPipeline}
                deals={deals}
                overview={pipelineOverview}
                isLoading={isLoadingOverview}
              />
            ) : (
              <div className="h-[320px] flex items-center justify-center border-2 border-dashed rounded-3xl opacity-50">
                Nenhum pipeline configurado.
              </div>
            )}
          </TabsContent>

          <TabsContent value="kanban" className="m-0">
            {currentPipeline ? (
              <KanbanBoard pipeline={currentPipeline} />
            ) : (
              <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-3xl opacity-50">
                Nenhum pipeline configurado.
              </div>
            )}
          </TabsContent>

          <TabsContent value="list" className="m-0">
            {currentPipeline ? (
              <CRMTableView
                pipeline={currentPipeline}
                stageFilter={stageFilter}
                priorityFilter={priorityFilter}
                ownerFilter={ownerFilter}
                titleSearch={titleSearch}
                sorting={tableSorting}
                columnVisibility={tableColumnVisibility}
                onStageFilterChange={setStageFilter}
                onPriorityFilterChange={setPriorityFilter}
                onOwnerFilterChange={setOwnerFilter}
                onTitleSearchChange={setTitleSearch}
                onSortingChange={handleTableSortingChange}
                onColumnVisibilityChange={handleTableVisibilityChange}
              />
            ) : (
              <div className="h-[320px] flex items-center justify-center border-2 border-dashed rounded-3xl opacity-50">
                Nenhum pipeline configurado.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ModuleGuard>
  )
}
