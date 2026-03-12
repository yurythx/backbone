"use client"

import { Protected } from "@/components/auth/protected"
import dynamic from "next/dynamic"
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton"

const UserList = dynamic(
    () => import("@/features/users/user-list").then((m) => m.UserList),
    {
        ssr: false,
        loading: () => (
            <div className="space-y-4" role="status" aria-live="polite" aria-label="Carregando usuários">
                <Skeleton className="h-10 w-72 rounded-xl" />
                <div className="rounded-2xl border border-primary/5 bg-card/30 p-4 shadow-sm">
                    <TableSkeleton rows={7} columns={5} />
                </div>
            </div>
        ),
    }
)

export default function UsersPage() {
    return (
        <Protected requiredPermissions={['admin.user_manage']}>
            <div className="max-w-5xl mx-auto py-8">
                <UserList />
            </div>
        </Protected>
    )
}
