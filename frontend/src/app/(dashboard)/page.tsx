"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Users, FileText, MessageSquare, CreditCard, Shield, Zap, Layout, Code } from "lucide-react"
import { DjangoHero } from "@/components/dashboard/django-hero"
import { FeatureCard } from "@/components/dashboard/feature-card"
import { ModuleCard } from "@/components/dashboard/module-card"
import { AnalyticsChart } from "@/components/dashboard/analytics-chart"
import { H2, P } from "@/components/ui/typography"
import { SlideUp, FadeIn } from "@/components/ui/motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard"
import { Company } from "@/types"

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/api/core/dashboard/stats/')
      return res.data
    }
  })

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['current-company'],
    queryFn: async () => {
      const res = await api.get<Company>('/api/core/companies/current/')
      return res.data
    }
  })

  if (statsLoading || companyLoading) return null

  return (
    <div className="space-y-12 pb-20">
      {!company?.onboarding_completed && <OnboardingWizard />}

      {/* Hero Section - The "WOW" factor */}
      <div className="-mx-8 -mt-8">
        <DjangoHero
          title={`Bem-vindo ao ${stats?.counters?.users?.total > 0 ? 'seu' : ''} Backbone`}
          subtitle="Sua central de inteligência para gestão de conteúdo, comunicação e crescimento escalável."
          ctaText="Publicar Artigo"
          ctaHref="/artigos"
          secondaryCtaText="Ver Analytics"
          secondaryCtaHref="#analytics-section"
        />
      </div>

      <div className="container mx-auto px-6 space-y-16">

        {/* Quick Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SlideUp delay={0.1}>
            <StatItem
              title="Usuários Ativos"
              value={stats?.counters?.users?.total || 0}
              growth={stats?.counters?.users?.growth}
              icon={Users}
            />
          </SlideUp>
          <SlideUp delay={0.2}>
            <StatItem
              title="Conteúdo Publicado"
              value={stats?.counters?.articles?.published || 0}
              growth={stats?.counters?.articles?.growth}
              icon={FileText}
            />
          </SlideUp>
          <SlideUp delay={0.3}>
            <StatItem
              title="Status do Sistema"
              value={stats?.system_status?.api_uptime || "100%"}
              label="API Uptime"
              icon={Zap}
              isStatus
            />
          </SlideUp>
        </section>

        {/* Analytics Section */}
        <section id="analytics-section" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <FadeIn delay={0.4} className="lg:col-span-2">
            <AnalyticsChart data={stats?.charts?.views_series || []} title="Tráfego de Conteúdo (30d)" />
          </FadeIn>
          <div className="space-y-6">
            <SlideUp delay={0.5}>
              <div className="p-6 rounded-2xl glass-morphism border-primary/10 shadow-sm bg-primary/5">
                <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-4">Módulos Ativos</h3>
                <div className="space-y-3">
                  <ActiveModule title="CMS" status="Active" icon={Layout} />
                  <ActiveModule title="Artigos" status="Active" icon={FileText} />
                  <ActiveModule title="Messenger" status="Active" icon={MessageSquare} />
                  <ActiveModule title="API Hub" status="Stable" icon={Code} />
                </div>
              </div>
            </SlideUp>
            <SlideUp delay={0.6}>
              <div className="p-6 rounded-2xl border bg-background/90 shadow-inner">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2 text-center">Armazenamento</h3>
                <div className="text-2xl font-bold text-center text-foreground">{stats?.system_status?.storage_used || "1.2GB"}</div>
              </div>
            </SlideUp>
          </div>
        </section>

        {/* Main Content Split: Activity vs Categories */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          {/* Recent Activity */}
          <FadeIn delay={0.7} className="space-y-6">
            <div className="flex items-center justify-between">
              <H2 className="border-none text-2xl font-bold">Atividade Recente</H2>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" asChild>
                <Link href="/admin/audit">Ver todas</Link>
              </Button>
            </div>
            <div className="rounded-2xl border bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
              <div className="divide-y divide-border/50">
                {(stats?.recent_activity || []).map((log: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="h-2 w-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                      <div>
                        <div className="text-sm font-medium flex items-center gap-2">
                          <span className="text-primary font-bold">{String(log.action).toUpperCase()}</span>
                          <span className="text-muted-foreground">•</span>
                          <span>{log.resource}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Realizado por <span className="text-foreground font-semibold">{log.user?.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
                {(!stats?.recent_activity || stats.recent_activity.length === 0) && (
                  <div className="p-12 text-center text-muted-foreground">Nenhuma atividade detectada nas últimas 24h.</div>
                )}
              </div>
            </div>
          </FadeIn>

          {/* Popular Categories */}
          <SlideUp delay={0.8} className="space-y-6">
            <H2 className="border-none text-2xl font-bold">Distribuição de Conteúdo</H2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(stats?.charts?.categories || []).map((cat: any, i: number) => (
                <div key={i} className="p-4 rounded-xl border bg-background hover:border-primary/30 transition-all flex items-center justify-between group">
                  <div>
                    <div className="text-xs font-bold text-muted-foreground uppercase mb-1">{cat.name}</div>
                    <div className="text-2xl font-bold text-foreground">{cat.article_count}</div>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                    <FileText className="h-5 w-5" />
                  </div>
                </div>
              ))}
            </div>
          </SlideUp>
        </div>
      </div>
    </div>
  )
}

function StatItem({ title, value, growth, icon: Icon, isStatus, label }: any) {
  return (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-500 border-border/50">
      <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon size={80} />
      </div>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">{title}</CardDescription>
        <CardTitle className="text-4xl font-black tracking-tight flex items-baseline gap-2">
          {value}
          {growth !== undefined && (
            <span className={cn(
              "text-xs font-bold px-1.5 py-0.5 rounded-md",
              growth >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
            )}>
              {growth >= 0 ? '+' : ''}{growth}%
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <P className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0">
          {isStatus ? label : "Referência ao mês anterior"}
        </P>
      </CardContent>
    </Card>
  )
}

function ActiveModule({ title, status, icon: Icon }: any) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-md bg-foreground/5 flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary">{status}</span>
    </div>
  )
}

