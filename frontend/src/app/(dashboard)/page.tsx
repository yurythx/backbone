"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Users, FileText, MessageSquare, CreditCard, Shield, Zap, Layout, Code } from "lucide-react"
import { DjangoHero } from "@/components/dashboard/django-hero"
import { FeatureCard } from "@/components/dashboard/feature-card"
import { ModuleCard } from "@/components/dashboard/module-card"
import { H2, P } from "@/components/ui/typography"

export default function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [users, articles, contacts] = await Promise.all([
        api.get('/api/accounts/users/').catch(() => ({ data: [] })),
        api.get('/api/articles/articles/').catch(() => ({ data: [] })),
        api.get('/api/messenger/contacts/').catch(() => ({ data: [] }))
      ])
      return {
        users: users.data.length,
        articles: articles.data.length,
        contacts: contacts.data.length,
      }
    }
  })

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section - The "WOW" factor */}
      <div className="-mx-8 -mt-8">
        <DjangoHero
          title="Backbone SaaS"
          subtitle="A plataforma modular escalável para perfeccionistas com prazos, inspirada na excelência do ecossistema Django."
          ctaText="Explorar CMS"
          ctaHref="/cms"
          secondaryCtaText="Minha Conta"
          secondaryCtaHref="/settings"
        />
      </div>

      <div className="container mx-auto px-6 space-y-20">
        {/* Core Features - Why choose us? */}
        <section className="space-y-12">
          <div className="text-center space-y-4">
            <H2 className="border-none text-3xl lg:text-4xl">Arquitetura de Elite</H2>
            <P className="text-muted-foreground max-w-2xl mx-auto text-lg mt-0">
              Construído sobre pilares de segurança, performance e flexibilidade extrema.
            </P>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              title="Multi-tenancy Isolado"
              description="Dados e branding totalmente isolados por empresa, garantindo segurança e privacidade em nível máximo."
              icon={Shield}
            />
            <FeatureCard
              title="Design System Atômico"
              description="Interface baseada em componentes reutilizáveis e temas dinâmicos que se adaptam à identidade da sua marca."
              icon={Layout}
            />
            <FeatureCard
              title="API-First"
              description="Backend Django robusto com endpoints documentados, prontos para integração com qualquer plataforma."
              icon={Code}
            />
          </div>
        </section>

        {/* Modules Grid - Access points */}
        <section className="space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <H2 className="border-none">Módulos do Ecossistema</H2>
              <P className="text-muted-foreground mt-0">Gerencie todos os aspectos do seu negócio em um só lugar.</P>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ModuleCard
              title="Artigos"
              description="Gestão de postagens, blog e central de ajuda."
              href="/artigos"
              icon={FileText}
            />
            <ModuleCard
              title="CMS (Páginas)"
              description="Gerencie as páginas institucionais do seu portal."
              href="/cms"
              icon={Layout}
            />
            <ModuleCard
              title="Messenger"
              description="Comunicação em tempo real via WebSockets."
              href="/messenger"
              icon={MessageSquare}
            />
            <ModuleCard
              title="Administração"
              description="Controle de usuários e configurações globais."
              href="/admin"
              icon={Users}
            />
          </div>
        </section>

        {/* Stats Section - Quick overview */}
        <section className="bg-primary/5 rounded-3xl p-12 border border-primary/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 text-center">
            <div className="space-y-2">
              <div className="text-5xl font-extrabold text-primary">{stats?.users || 0}</div>
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Usuários Ativos</div>
            </div>
            <div className="space-y-2">
              <div className="text-5xl font-extrabold text-primary">{stats?.articles || 0}</div>
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Artigos Gerados</div>
            </div>
            <div className="space-y-2">
              <div className="text-5xl font-extrabold text-primary">{stats?.contacts || 0}</div>
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Contatos</div>
            </div>
            <div className="space-y-2">
              <div className="text-5xl font-extrabold text-primary">99.9%</div>
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Uptime Garantido</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

