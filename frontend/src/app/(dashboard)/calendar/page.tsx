"use client"

import { PageHeader } from "@/components/ui/page-header"
import { CalendarView } from "@/features/calendar/calendar-view"
import { ModuleGuard } from "@/components/module-guard"

export default function CalendarPage() {
  return (
    <ModuleGuard moduleCode="calendar">
      <div className="space-y-6">
        <PageHeader
          title="Agenda"
          description="Gerencie seus eventos e compromissos."
        />
        
        <div className="min-h-[800px]">
          <CalendarView />
        </div>
      </div>
    </ModuleGuard>
  )
}
