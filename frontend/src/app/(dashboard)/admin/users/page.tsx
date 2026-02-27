"use client"

import { UserList } from "@/features/users/user-list"
import { Protected } from "@/components/auth/protected"

export default function UsersPage() {
    return (
        <Protected requireStaff>
            <div className="max-w-5xl mx-auto py-8">
                <UserList />
            </div>
        </Protected>
    )
}
