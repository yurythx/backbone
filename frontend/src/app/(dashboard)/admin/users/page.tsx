"use client"

import { DashboardShell } from "@/components/layout/dashboard-shell"
import { UserList } from "@/features/users/user-list"

export default function UsersPage() {
    return (
        <DashboardShell>
            <div className="max-w-5xl mx-auto py-8">
                <UserList />
            </div>
        </DashboardShell>
    )
}
