"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    History,
    Search,
    Filter,
    User as UserIcon,
    Activity,
    Database,
    Info
} from "lucide-react"
import { useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export default function AuditPage() {
    const [searchTerm, setSearchTerm] = useState("")
    const [actionFilter, setActionFilter] = useState("all")

    const { data: logs, isLoading } = useQuery({
        queryKey: ['audit-logs', searchTerm, actionFilter],
        queryFn: async () => {
            let url = '/api/core/audit-logs/'
            const params = new URLSearchParams()
            if (actionFilter !== 'all') params.append('action', actionFilter)
            if (params.toString()) url += `?${params.toString()}`

            const res = await api.get(url)
            return res.data.results || res.data
        }
    })

    // Cores por tipo de ação
    const getActionBadge = (action: string) => {
        switch (action) {
            case 'create': return <Badge className="bg-green-500/10 text-green-600 border-green-200">CREATE</Badge>
            case 'update': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">UPDATE</Badge>
            case 'delete': return <Badge className="bg-red-500/10 text-red-600 border-red-200">DELETE</Badge>
            case 'login': return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200">LOGIN</Badge>
            default: return <Badge variant="outline">{action.toUpperCase()}</Badge>
        }
    }

    return (
        <DashboardShell>
            <div className="max-w-6xl mx-auto py-8 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            <History className="h-8 w-8 text-primary" />
                            Logs de Auditoria
                        </h1>
                        <p className="text-muted-foreground">Rastreie todas as atividades críticas realizadas no sistema.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Pesquisar por recurso, ID ou usuário..."
                            className="pl-11 h-12 rounded-2xl bg-card border-none shadow-sm focus-visible:ring-primary/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <select
                            className="w-full h-12 pl-11 pr-4 rounded-2xl bg-card border-none shadow-sm appearance-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                        >
                            <option value="all">Todas as Ações</option>
                            <option value="create">Criação (Create)</option>
                            <option value="update">Edição (Update)</option>
                            <option value="delete">Exclusão (Delete)</option>
                            <option value="login">Login</option>
                        </select>
                    </div>
                </div>

                <div className="rounded-3xl border bg-card overflow-hidden shadow-xl">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="py-5 pl-8">Evento</TableHead>
                                <TableHead>Usuário</TableHead>
                                <TableHead>Recurso</TableHead>
                                <TableHead>IP</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead className="text-right pr-8">Detalhes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={6} className="h-16 animate-pulse bg-muted/10" />
                                    </TableRow>
                                ))
                            ) : logs?.map((log: any) => (
                                <TableRow key={log.id} className="group hover:bg-muted/20 transition-colors">
                                    <TableCell className="py-4 pl-8">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-xl bg-background border flex items-center justify-center shadow-sm">
                                                <Activity className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            {getActionBadge(log.action)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm">{log.user_name || 'Sistema'}</span>
                                            <span className="text-[10px] text-muted-foreground">{log.user_email || 'Backbone Daemon'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Database className="h-3 w-3 text-primary/60" />
                                            <span className="text-sm font-medium">{log.resource}</span>
                                            <Badge variant="secondary" className="text-[10px] h-5 rounded-md px-1">{log.resource_id}</Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs font-mono text-muted-foreground">
                                        {log.ip_address || "Internal"}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                                        <Info className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-[300px] p-4 rounded-xl border-none shadow-2xl">
                                                    <pre className="text-[10px] overflow-auto max-h-[200px] font-mono whitespace-pre-wrap">
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && logs?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                                        Nenhum log encontrado para o filtro selecionado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </DashboardShell>
    )
}
