"use client"

import { PageHeader } from "@/components/ui/page-header"
import { TransactionList } from "@/features/finance/transaction-list"

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Controle suas receitas e despesas."
      />
      
      <TransactionList />
    </div>
  )
}
