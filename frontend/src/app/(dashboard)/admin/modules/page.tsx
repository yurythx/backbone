"use client"

import { ModuleList } from "@/features/admin/module-list"

export default function ModulesPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Module Management</h2>
      <p className="text-muted-foreground">Enable or disable features for your organization.</p>
      <ModuleList />
    </div>
  )
}
