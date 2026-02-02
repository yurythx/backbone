"use client"

import { DashboardShell } from "@/components/layout/dashboard-shell"
import { RoleList } from "@/features/roles/role-list"

export default function RolesPage() {
    return (
        <DashboardShell>
            <div className="max-w-5xl mx-auto py-8">
                <RoleList />
            </div>
        </DashboardShell>
    )
}
