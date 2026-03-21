"use client"

import { useState } from "react"
import { PageHeader } from "@/components/ui/page-header"
import { ModuleGuard } from "@/components/module-guard"
import { useCRM } from "./use-crm"
import { KanbanBoard } from "./kanban-board"
import { CreateDealModal } from "./create-deal-modal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { LayoutGrid, List } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CRMPage() {
  const { pipelines, isLoading } = useCRM()
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null)
  const [view, setView] = useState<"kanban" | "list">("kanban")

  // Seleciona o primeiro pipeline por padrão
  const currentPipeline = selectedPipelineId 
    ? pipelines.find(p => p.id === selectedPipelineId) 
    : pipelines[0]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[600px] w-full" />
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

            <CreateDealModal />
          </div>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as "kanban" | "list")} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="glass p-1">
              <TabsTrigger value="kanban" className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" /> Kanban
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" /> Tabela
              </TabsTrigger>
            </TabsList>
          </div>

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
             {/* Futura implementação de Tabela Rica estilo Monday */}
             <div className="p-12 text-center glass rounded-3xl opacity-50">
               Visualização de Tabela em escala...
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </ModuleGuard>
  )
}
