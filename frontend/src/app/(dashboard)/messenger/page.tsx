"use client"

import { MessengerView } from "@/features/messenger/messenger-view"
import { ModuleGuard } from "@/components/module-guard"

export default function MessengerPage() {
  return (
    <ModuleGuard moduleCode="messenger">
      <div className="h-[calc(100vh-6rem)]">
        <MessengerView />
      </div>
    </ModuleGuard>
  )
}
