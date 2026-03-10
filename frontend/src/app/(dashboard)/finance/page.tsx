"use client"

import { PageHeader } from "@/components/ui/page-header"
import { TransactionList } from "@/features/finance/transaction-list"
import { ModuleGuard } from "@/components/module-guard"
import { Protected } from "@/components/auth/protected"

export default function FinancePage() {
  return (
    <Protected requiredPermissions={['finance.view_financial']}>
      <ModuleGuard moduleCode="finance">
        <div className="space-y-6">
          <PageHeader
            title="Financeiro"
            description="Controle suas receitas e despesas."
          />
          
          <TransactionList />
        </div>
      </ModuleGuard>
    </Protected>
  )
}
