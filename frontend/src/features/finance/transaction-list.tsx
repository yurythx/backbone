"use client"

import { useMemo, useState } from "react"
import { useFinance, Transaction } from "./use-finance"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { endOfMonth, endOfWeek, format, parseISO, startOfWeek } from "date-fns"
import { ptBR } from "date-fns/locale"

const transactionSchema = z.object({
  description: z.string().min(1, "Descrição obrigatória"),
  amount: z.string().min(1, "Valor obrigatório"),
  type: z.enum(["in", "out"]),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]),
  due_date: z.string(),
  competence_date: z.string(),
  category: z.string().optional(), // ID as string for Select
})

type TransactionFormValues = z.infer<typeof transactionSchema>

export function TransactionList() {
  const now = useMemo(() => new Date(), [])
  const [periodMode, setPeriodMode] = useState<'week' | 'month' | 'semester' | 'year'>('month')
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1)
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(now.getMonth() < 6 ? 1 : 2)
  const [selectedWeekDate, setSelectedWeekDate] = useState<string>(() => format(now, "yyyy-MM-dd"))

  const range = useMemo(() => {
    if (periodMode === 'week') {
      const base = parseISO(selectedWeekDate)
      const start = startOfWeek(base, { weekStartsOn: 1 })
      const end = endOfWeek(base, { weekStartsOn: 1 })
      return { start, end }
    }
    if (periodMode === 'month') {
      const start = new Date(selectedYear, selectedMonth - 1, 1)
      const end = endOfMonth(start)
      return { start, end }
    }
    if (periodMode === 'semester') {
      const start = new Date(selectedYear, selectedSemester === 1 ? 0 : 6, 1)
      const end = endOfMonth(new Date(selectedYear, selectedSemester === 1 ? 5 : 11, 1))
      return { start, end }
    }
    const start = new Date(selectedYear, 0, 1)
    const end = new Date(selectedYear, 11, 31)
    return { start, end }
  }, [periodMode, selectedMonth, selectedSemester, selectedWeekDate, selectedYear])

  const rangeStart = useMemo(() => format(range.start, "yyyy-MM-dd"), [range.start])
  const rangeEnd = useMemo(() => format(range.end, "yyyy-MM-dd"), [range.end])

  const { transactions, categories, isLoading, createCategory, createTransaction, updateTransaction, deleteTransaction } = useFinance({
    start: rangeStart,
    end: rangeEnd,
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)

  const categoryForm = useForm<{ name: string; color: string }>({
    defaultValues: {
      name: "",
      color: "#000000",
    }
  })

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: "",
      amount: "",
      type: "out",
      status: "pending",
      due_date: format(new Date(), "yyyy-MM-dd"),
      competence_date: format(new Date(), "yyyy-MM-dd"),
    }
  })

  const handleCreate = () => {
    setSelectedTransaction(null)
    form.reset({
      description: "",
      amount: "",
      type: "out",
      status: "pending",
      due_date: format(new Date(), "yyyy-MM-dd"),
      competence_date: format(new Date(), "yyyy-MM-dd"),
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    form.reset({
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      status: transaction.status,
      due_date: transaction.due_date,
      competence_date: transaction.competence_date,
      category: transaction.category?.toString()
    })
    setIsDialogOpen(true)
  }

  const onSubmit = async (data: TransactionFormValues) => {
    try {
      const payload = {
        ...data,
        category: data.category ? parseInt(data.category) : undefined
      }

      if (selectedTransaction) {
        await updateTransaction.mutateAsync({ id: selectedTransaction.id, ...payload })
      } else {
        await createTransaction.mutateAsync(payload)
      }
      setIsDialogOpen(false)
    } catch (error) {
      // Error handled in hook
    }
  }

  // Calculate totals
  const filteredTransactions = useMemo(() => {
    const start = range.start.getTime()
    const end = range.end.getTime()
    return transactions.filter((t) => {
      const dt = new Date(t.competence_date).getTime()
      return dt >= start && dt <= end
    })
  }, [range.end, range.start, transactions])

  const totalIn = filteredTransactions
    .filter(t => t.type === 'in' && t.status === 'paid')
    .reduce((acc, curr) => acc + parseFloat(curr.amount), 0)
    
  const totalOut = filteredTransactions
    .filter(t => t.type === 'out' && t.status === 'paid')
    .reduce((acc, curr) => acc + parseFloat(curr.amount), 0)

  const balance = totalIn - totalOut

  const sharedCategories = useMemo(() => categories.filter(c => c.is_shared !== false), [categories])
  const personalCategories = useMemo(() => categories.filter(c => c.is_shared === false), [categories])

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-1.5">
                <span className="text-sm font-medium">Período</span>
                <Select value={periodMode} onValueChange={(v) => setPeriodMode(v as 'week' | 'month' | 'semester' | 'year')}>
                  <SelectTrigger className="w-full md:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Semanal</SelectItem>
                    <SelectItem value="month">Mensal</SelectItem>
                    <SelectItem value="semester">Semestral</SelectItem>
                    <SelectItem value="year">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {periodMode === 'week' && (
                <div className="grid gap-1.5">
                  <span className="text-sm font-medium">Semana</span>
                  <Input
                    type="date"
                    value={selectedWeekDate}
                    onChange={(e) => setSelectedWeekDate(e.target.value)}
                    className="w-full md:w-44"
                  />
                </div>
              )}

              {periodMode === 'month' && (
                <div className="grid gap-1.5">
                  <span className="text-sm font-medium">Mês</span>
                  <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                    <SelectTrigger className="w-full md:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }).map((_, idx) => {
                        const m = idx + 1
                        const label = format(new Date(2020, idx, 1), "MMMM", { locale: ptBR })
                        return (
                          <SelectItem key={m} value={String(m)}>
                            {label.charAt(0).toUpperCase() + label.slice(1)}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {periodMode === 'semester' && (
                <div className="grid gap-1.5">
                  <span className="text-sm font-medium">Semestre</span>
                  <Select value={String(selectedSemester)} onValueChange={(v) => setSelectedSemester((Number(v) as 1 | 2) || 1)}>
                    <SelectTrigger className="w-full md:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1º Semestre</SelectItem>
                      <SelectItem value="2">2º Semestre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {periodMode !== 'week' && (
                <div className="grid gap-1.5">
                  <span className="text-sm font-medium">Ano</span>
                  <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-full md:w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 6 }).map((_, idx) => {
                        const y = now.getFullYear() - 2 + idx
                        return (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              {format(range.start, "dd/MM/yyyy")} — {format(range.end, "dd/MM/yyyy")}
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas (Realizado)</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIn)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total recebido</p>
          </CardContent>
        </Card>
        
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas (Realizado)</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOut)}
            </div>
             <p className="text-xs text-muted-foreground mt-1">Total pago</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
            </div>
             <p className="text-xs text-muted-foreground mt-1">Em caixa</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transações</CardTitle>
          <Button onClick={handleCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Transação
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                      Nenhuma transação encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{transaction.description}</TableCell>
                      <TableCell>
                        {transaction.category_details ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" 
                                style={{ backgroundColor: transaction.category_details.color + '20', color: transaction.category_details.color }}>
                            {transaction.category_details.name}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{format(new Date(transaction.due_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <StatusBadge status={transaction.status} />
                      </TableCell>
                      <TableCell className={`text-right font-medium ${transaction.type === 'in' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {transaction.type === 'in' ? '+' : '-'} 
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(transaction.amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(transaction)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteTransaction.mutate(transaction.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Form */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTransaction ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
            <DialogDescription className="sr-only">
              Formulário de criação e edição de transações financeiras.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Pagamento AWS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="in">Receita</SelectItem>
                          <SelectItem value="out">Despesa</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vencimento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="paid">Pago</SelectItem>
                          <SelectItem value="overdue">Atrasado</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="competence_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Competência</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-end justify-between gap-2">
                        <FormLabel>Categoria</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            categoryForm.reset({ name: "", color: "#000000" })
                            setIsCategoryDialogOpen(true)
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Nova categoria
                        </Button>
                      </div>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sharedCategories.length > 0 && (
                            <SelectItem value="__shared__" disabled>
                              Empresa
                            </SelectItem>
                          )}
                          {sharedCategories.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                            </SelectItem>
                          ))}
                          {personalCategories.length > 0 && (
                            <SelectItem value="__personal__" disabled>
                              Minhas
                            </SelectItem>
                          )}
                          {personalCategories.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
            <DialogDescription className="sr-only">Criar categoria pessoal.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={categoryForm.handleSubmit(async (values) => {
              const created = await createCategory.mutateAsync({ name: values.name, color: values.color })
              form.setValue("category", String(created.id), { shouldDirty: true })
              setIsCategoryDialogOpen(false)
            })}
          >
            <div className="grid gap-2">
              <FormLabel>Nome</FormLabel>
              <Input {...categoryForm.register("name", { required: true })} placeholder="Ex: Pessoal" />
            </div>
            <div className="grid gap-2">
              <FormLabel>Cor</FormLabel>
              <Input type="color" {...categoryForm.register("color", { required: true })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createCategory.isPending}>
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  }
  
  const labels: Record<string, string> = {
    pending: "Pendente",
    paid: "Pago",
    overdue: "Atrasado",
    cancelled: "Cancelado",
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  )
}

function DollarSignIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}
