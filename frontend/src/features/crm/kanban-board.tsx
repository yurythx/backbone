"use client"

import { useCRM, Pipeline, Deal } from "./use-crm"
import { Card } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Calendar, MoreHorizontal, User } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface KanbanBoardProps {
  pipeline: Pipeline
}

export function KanbanBoard({ pipeline }: KanbanBoardProps) {
  const { deals, updateDeal } = useCRM()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, stageId: number) => {
    e.preventDefault()
    const dealIdStr = e.dataTransfer.getData("dealId")
    const dealId = parseInt(dealIdStr)

    // Atualiza o card para o novo estágio
    if (dealId) {
      await updateDeal.mutateAsync({ id: dealId, stage: stageId })
    }
  }

  return (
    <ScrollArea className="w-full pb-6">
      <div className="flex gap-6 min-h-[700px] p-1">
        <AnimatePresence mode="popLayout">
          {pipeline.stages.map((stage) => (
            <div 
              key={stage.id} 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              className="flex flex-col w-[320px] bg-muted/20 border border-primary/5 rounded-3xl p-4 gap-4 glass group"
            >
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-2">
                   <h3 className="font-semibold text-sm uppercase tracking-wider">{stage.name}</h3>
                   <Badge variant="outline" className="rounded-full px-2 py-0 h-5 bg-card/50">
                     {deals.filter(d => d.stage === stage.id).length}
                   </Badge>
                </div>
                <MoreHorizontal className="h-4 w-4 opacity-0 group-hover:opacity-100 cursor-pointer" />
              </div>

              <div className="flex flex-col gap-3 min-h-[500px]">
                {deals
                  .filter((deal) => deal.stage === stage.id)
                  .map((deal) => (
                    <DealCard key={deal.id} deal={deal} />
                  ))}
              </div>
            </div>
          ))}
        </AnimatePresence>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}

function DealCard({ deal }: { deal: Deal }) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("dealId", deal.id.toString())
  }

  const priorityColors = {
    LOW: "bg-green-500/10 text-green-600 border-green-500/20",
    MEDIUM: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    HIGH: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    URGENT: "bg-red-500/10 text-red-600 border-red-500/20 shadow-sm shadow-red-500/5",
  }

  const isCompleted = deal.stage_name === "Concluído"

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
      >
        <Card className={`p-4 shadow-sm hover:shadow-xl transition-all border-primary/5 hover:border-primary/20 group relative overflow-hidden glass-card ${isCompleted ? 'grayscale-[0.5]' : ''}`}>
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
              <Badge className={`text-[10px] uppercase font-bold shrink-0 ${priorityColors[deal.priority]}`}>
                {deal.priority}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
               <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/10">
                 <User className="h-3.5 w-3.5 text-primary" />
               </div>
               <span className="truncate">{deal.contact_name}</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              {deal.closing_date && (
                <div className={`flex items-center gap-2 text-[11px] font-bold py-1 px-2 rounded-lg ${
                  new Date(deal.closing_date) < new Date() && !isCompleted ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-primary/70 bg-primary/5'
                }`}>
                   <Calendar className="h-3 w-3" />
                   {format(new Date(deal.closing_date), "dd 'de' MMM", { locale: ptBR })}
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
