"use client"

import { useCRM, Pipeline, Deal, getColumnTransitionGuard, getDealColumnMeta, getPipelineColumns, isDealDone, isDealInColumn, resolveColumnSemantics } from "./use-crm"
import { Card } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Calendar, MoreHorizontal, User } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { DealDetailsModal } from "./deal-details-modal"
import { getDeadlineMeta, getProgressMeta, getProgressValue, isCriticalDeal } from "./crm-visuals"
import { toast } from "sonner"

interface KanbanBoardProps {
  pipeline: Pipeline
}

export function KanbanBoard({ pipeline }: KanbanBoardProps) {
  const { deals, updateDeal } = useCRM()
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const columns = useMemo(() => getPipelineColumns(pipeline), [pipeline])

  const columnSummaryById = useMemo(() => {
    const summaryById = new Map<number, { total: number; overdue: number; averageProgress: number }>()

    columns.forEach((column) => {
      const stageDeals = deals.filter((deal) => isDealInColumn(deal, column))
      let overdue = 0
      let progressSum = 0

      stageDeals.forEach((deal) => {
        const isCompleted = isDealDone(deal, [pipeline])
        const deadline = getDeadlineMeta(deal.closing_date, isCompleted)
        if (deadline.risk === "overdue") overdue += 1
        progressSum += getProgressValue(deal)
      })

      summaryById.set(column.id, {
        total: stageDeals.length,
        overdue,
        averageProgress: stageDeals.length ? Math.round(progressSum / stageDeals.length) : 0,
      })
    })

    return summaryById
  }, [columns, deals])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, columnId: number) => {
    e.preventDefault()
    const dealIdStr = e.dataTransfer.getData("dealId")
    const dealId = parseInt(dealIdStr)
    const draggedDeal = deals.find((deal) => deal.id === dealId)
    const targetColumn = columns.find((column) => column.id === columnId)
    const targetColumnSemantics = resolveColumnSemantics(targetColumn)
    const requiresScheduling =
      targetColumn && (targetColumnSemantics.requires_schedule || targetColumnSemantics.requires_assignee)

    // Atualiza o card para o novo estágio
    if (dealId && draggedDeal && targetColumn) {
      const guard = getColumnTransitionGuard(draggedDeal, targetColumn, deals, [pipeline])
      if (!guard.allowed) {
        toast.error(guard.reason || "Movimento não permitido para esta coluna.")
        return
      }

      await updateDeal.mutateAsync({
        id: dealId,
        column: targetColumn.id,
        data_agendamento: requiresScheduling
          ? draggedDeal?.data_agendamento || draggedDeal?.closing_date || new Date().toISOString()
          : draggedDeal?.data_agendamento,
        tecnico_responsavel: requiresScheduling
          ? draggedDeal?.tecnico_responsavel || draggedDeal?.owner
          : draggedDeal?.tecnico_responsavel,
      })
    }
  }

  return (
    <ScrollArea className="w-full pb-6">
      <div className="flex gap-6 min-h-[700px] p-1">
        <AnimatePresence mode="popLayout">
          {columns.map((column) => {
            const summary = columnSummaryById.get(column.id) ?? { total: 0, overdue: 0, averageProgress: 0 }
            const semantics = resolveColumnSemantics(column)

            return (
              <div
                key={column.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
                data-stage-id={column.legacy_stage ?? column.id}
                data-column-id={column.id}
                className="flex flex-col w-[320px] bg-muted/20 border border-primary/5 rounded-3xl p-4 gap-4 glass group"
              >
                <div className="space-y-2 px-2 mb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm uppercase tracking-wider">{column.title}</h3>
                      <Badge variant="outline" className="rounded-full px-2 py-0 h-5 bg-card/50">
                        {summary.total}
                      </Badge>
                    </div>
                    <MoreHorizontal className="h-4 w-4 opacity-0 group-hover:opacity-100 cursor-pointer" />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {semantics.wip_limit ? (
                      <Badge variant="outline" className={summary.total >= semantics.wip_limit ? "border-amber-300 bg-amber-50 text-amber-800" : ""}>
                        WIP {summary.total}/{semantics.wip_limit}
                      </Badge>
                    ) : null}
                    <div className="flex-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${summary.averageProgress}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {summary.averageProgress}%
                    </span>

                    {summary.overdue > 0 && (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-200">
                        {summary.overdue} vencido{summary.overdue === 1 ? "" : "s"}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 min-h-[500px]">
                  {deals
                    .filter((deal) => isDealInColumn(deal, column))
                    .map((deal) => (
                      <DealCard key={deal.id} deal={deal} onClick={() => setSelectedDeal(deal)} />
                    ))}
                </div>
              </div>
            )
          })}
        </AnimatePresence>
      </div>
      <ScrollBar orientation="horizontal" />

      {selectedDeal && (
        <DealDetailsModal 
          deal={selectedDeal} 
          open={!!selectedDeal} 
          onOpenChange={(open) => !open && setSelectedDeal(null)} 
        />
      )}
    </ScrollArea>
  )
}

function DealCard({ deal, onClick }: { deal: Deal, onClick?: () => void }) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("dealId", deal.id.toString())
  }

  const priorityColors = {
    LOW: "bg-green-500/10 text-green-600 border-green-500/20",
    MEDIUM: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    HIGH: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    URGENT: "bg-red-500/10 text-red-600 border-red-500/20 shadow-sm shadow-red-500/5",
  }

  const isCompleted = isDealDone(deal)
  const deadlineMeta = getDeadlineMeta(deal.closing_date, isCompleted)
  const progress = getProgressValue(deal)
  const progressMeta = getProgressMeta(progress)
  const isCritical = isCriticalDeal(deal)
  const currentColumnMeta = getDealColumnMeta(deal)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4, rotate: 1 }}
      className={`cursor-move ${isCompleted ? 'opacity-60' : ''}`}
    >
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={onClick}
        data-deal-id={deal.id}
      >
        <Card
          className={cn(
            "p-4 shadow-sm hover:shadow-xl transition-all border-primary/5 hover:border-primary/20 group relative overflow-hidden glass-card",
            isCompleted && "grayscale-[0.5]",
            isCritical && "border-rose-300 bg-rose-50/40 shadow-lg shadow-rose-500/10"
          )}
        >
          {/* Prioridade em destaque lateral */}
          <div className={`absolute top-0 left-0 w-1 h-full ${
              deal.priority === 'URGENT' ? 'bg-red-500' : 
              deal.priority === 'HIGH' ? 'bg-orange-500' :
              deal.priority === 'MEDIUM' ? 'bg-blue-500' : 'bg-green-500'
          }`} />

          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h4 className={`font-bold text-[15px] leading-tight line-clamp-2 ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                {deal.title}
              </h4>
              <div className="flex flex-col items-end gap-1">
                <Badge className={`text-[10px] uppercase font-bold shrink-0 ${priorityColors[deal.priority]}`}>
                  {deal.priority}
                </Badge>
                {currentColumnMeta.column_kind === "planned" && (
                  <Badge className="text-[10px] uppercase font-bold shrink-0 border-violet-300 bg-violet-100 text-violet-800">
                    Planejado
                  </Badge>
                )}
                {isCritical && (
                  <Badge className="text-[10px] uppercase font-bold shrink-0 border-rose-300 bg-rose-100 text-rose-800">
                    Crítico
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
               <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/10">
                 <User className="h-3.5 w-3.5 text-primary" />
               </div>
               <span className="truncate">{deal.contact_name}</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Badge className={cn("text-[10px] font-bold", progressMeta.badgeClassName)}>
                  {progress}%
                </Badge>
                <span className="text-[11px] font-semibold text-muted-foreground">progresso</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn("h-full rounded-full transition-all", progressMeta.barClassName)}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {deal.closing_date && (
                <div className={cn("flex items-center gap-2 text-[11px] font-bold py-1 px-2 rounded-lg", deadlineMeta.pillClassName)}>
                   <Calendar className="h-3 w-3" />
                   {format(new Date(deal.closing_date), "dd 'de' MMM", { locale: ptBR })}
                </div>
              )}
              
              {deadlineMeta.risk === "overdue" && (
                <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Vencido
                </div>
              )}
              {deadlineMeta.risk === "today" && (
                <div className="text-[11px] font-bold text-orange-700">
                  Vence hoje
                </div>
              )}
              {deadlineMeta.risk === "near" && (
                <div className="text-[11px] font-bold text-amber-700">
                  Perto do prazo
                </div>
              )}

              {isCompleted && (
                <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-600 border-green-500/20">
                  FINALIZADO
                </Badge>
              )}
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  )
}
