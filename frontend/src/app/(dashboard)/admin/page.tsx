"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { UserList } from "@/features/admin/user-list"
import { UserForm } from "@/features/admin/user-form"
import { User, TenantModule } from "@/types"
import { PageHeader } from "@/components/ui/page-header"
import { StatsCard } from "@/components/ui/stats-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  UserPlus,
  Activity,
  Database,
  ShieldCheck,
  LayoutGrid,
  FileText
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"

export default function AdminPage() {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/api/core/dashboard-stats/')
      return res.data
    },
    refetchInterval: 30000 // Refresh every 30s
  })

  const handleCreate = () => {
    setSelectedUser(null)
    setView('create')
  }

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setView('edit')
  }

  const handleSuccess = () => {
    setView('list')
    setSelectedUser(null)
  }

  const handleCancel = () => {
    setView('list')
    setSelectedUser(null)
  }

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Command Center"
        description="Monitoramento centralizado e inteligência administrativa."
      >
        {view === 'list' && (
          <Button onClick={handleCreate} className="shadow-lg shadow-primary/20">
            <UserPlus className="mr-2 h-4 w-4" /> Novo Usuário
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total de Usuários"
          value={stats?.counters?.users?.total ?? 0}
          icon={Users}
          isLoading={statsLoading}
          trend={stats?.counters?.users?.growth ? {
            value: stats.counters.users.growth,
            label: "crescimento",
            isPositive: true
          } : undefined}
        />
        <StatsCard
          title="Artigos Publicados"
          value={stats?.counters?.articles?.published ?? 0}
          icon={FileText}
          isLoading={statsLoading}
          description={`${stats?.counters?.articles?.total ?? 0} artigos no total`}
        />
        <StatsCard
          title="Saúde do Sistema"
          value={stats?.system_status?.api_uptime ?? "100%"}
          icon={Activity}
          isLoading={statsLoading}
          description="Todos os serviços operacionais"
        />
        <StatsCard
          title="Armazenamento"
          value={stats?.system_status?.storage_used ?? "0GB"}
          icon={Database}
          isLoading={statsLoading}
          description={`Backup: ${stats?.system_status?.last_backup ? new Date(stats.system_status.last_backup).toLocaleTimeString() : 'Recent'}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          <Tabs defaultValue="management" className="space-y-6">
            <TabsList className="bg-muted/50 p-1 rounded-2xl border w-full justify-start md:w-auto">
              <TabsTrigger value="management" className="rounded-xl px-6">
                <ShieldCheck className="mr-2 h-4 w-4" /> Usuários
              </TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-xl px-6">
                <Activity className="mr-2 h-4 w-4" /> Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="management" className="mt-0">
              <div className="glass-morphism rounded-3xl p-6 border shadow-sm">
                {view === 'list' ? (
                  <UserList onCreate={handleCreate} onEdit={handleEdit} />
                ) : (
                  <UserForm
                    initialData={selectedUser}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-0">
              <AnalyticsChart
                title="Tráfego de Artigos"
                data={stats?.charts?.views_series || []}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar Activity Feed */}
        <aside className="space-y-6">
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="font-bold text-lg tracking-tight">Atividade Recente</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary animate-pulse">Live</span>
          </div>
          <div className="max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
            <ActivityTimeline activities={stats?.recent_activity || []} />
          </div>
        </aside>
      </div>
    </div>
  )
}
