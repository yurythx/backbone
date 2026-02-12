import { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Play, Music, FileVideo, Cloud, Database, MessageCircle, Settings, Workflow, Shield, Wrench, Server, BookOpen, LayoutTemplate } from "lucide-react"
import Link from "next/link"

import { Header } from "@/components/layout/header"

export const metadata: Metadata = {
  title: "Backbone Services - Central de Serviços",
  description: "Acesse todos os serviços e aplicações disponíveis no backbone. Organizados por categorias com descrições detalhadas e acesso direto.",
  keywords: ["serviços", "backbone", "aplicações", "dashboard", "infraestrutura"],
  authors: [{ name: "Backbone Team" }],
  robots: "index, follow",
  openGraph: {
    title: "Backbone Services - Ecossistema de Serviços",
    description: "Central de serviços e aplicações do backbone.",
    type: "website",
    locale: "pt_BR"
  }
}

export const viewport = {
  width: "device-width",
  initialScale: 1
}

interface Service {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  category: string
  status: "online" | "offline" | "maintenance"
  url: string
  features: string[]
  color: string
}

const services: Service[] = [
  {
    id: "backbone-articles",
    name: "Central de Artigos",
    description: "Base de conhecimento com guias, tutoriais e documentações técnicas.",
    icon: BookOpen,
    category: "Conhecimento",
    status: "online",
    url: "/artigos",
    features: ["Tutoriais", "Documentação", "Guias", "Artigos Técnicos"],
    color: "from-blue-600 to-indigo-600"
  },
  {
    id: "backbone-messenger",
    name: "Backbone Messenger",
    description: "Plataforma de comunicação integrada para chat em tempo real.",
    icon: MessageCircle,
    category: "Comunicação",
    status: "online",
    url: "/messenger",
    features: ["Chat em tempo real", "Grupos", "Anexos", "Histórico"],
    color: "from-green-500 to-emerald-500"
  },
  {
    id: "backbone-cms",
    name: "Criador de Páginas",
    description: "Ferramenta visual para criação e gestão de páginas web personalizadas.",
    icon: LayoutTemplate,
    category: "Produtividade",
    status: "online",
    url: "/cms",
    features: ["Drag & Drop", "Templates", "Responsivo", "SEO Otimizado"],
    color: "from-purple-500 to-violet-500"
  },
  {
    id: "jellyfin",
    name: "Jellyfin",
    description: "Servidor de mídia open-source que organiza, gerencia e transmite suas músicas, vídeos e fotos para qualquer dispositivo.",
    icon: Play,
    category: "Entretenimento",
    status: "online",
    url: "http://192.168.1.121:8096",
    features: ["Streaming de vídeo", "Transcodificação", "Acesso multi-dispositivo", "Biblioteca organizada"],
    color: "from-purple-500 to-pink-500"
  },
  {
    id: "komga",
    name: "Komga",
    description: "Gerenciador de bibliotecas de quadrinhos e mangás com leitor web integrado e suporte para múltiplos formatos.",
    icon: FileVideo,
    category: "Entretenimento",
    status: "online",
    url: "http://192.168.1.121:8080",
    features: ["Leitor web", "Suporte CBZ/CBR", "Metadados automáticos", "Coleções organizadas"],
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: "navdrome",
    name: "Navdrome",
    description: "Servidor de música moderno e compatível com Subsonic, perfeito para streaming de sua coleção musical.",
    icon: Music,
    category: "Entretenimento",
    status: "online",
    url: "http://192.168.1.121:4533",
    features: ["Streaming de música", "Compatível Subsonic", "Playlists inteligentes", "Transcodificação"],
    color: "from-green-500 to-teal-500"
  },
  {
    id: "nextcloud",
    name: "Nextcloud",
    description: "Plataforma de colaboração e compartilhamento de arquivos auto-hospedada com integração ao Samba.",
    icon: Cloud,
    category: "Produtividade",
    status: "online",
    url: "http://192.168.1.121:8081",
    features: ["Armazenamento em nuvem", "Sincronização com Samba", "Colaboração em tempo real", "Aplicativos integrados"],
    color: "from-sky-500 to-blue-500"
  },
  {
    id: "samba",
    name: "Samba",
    description: "Servidor de arquivos que permite compartilhamento de arquivos entre Windows, Linux e macOS na rede local.",
    icon: Server,
    category: "Infraestrutura",
    status: "online",
    url: "smb://192.168.1.121",
    features: ["Compartilhamento de arquivos", "Acesso multiplataforma", "Integração com Nextcloud", "Permissões granulares"],
    color: "from-orange-500 to-red-500"
  },
  {
    id: "minio",
    name: "MinIO",
    description: "Armazenamento de objetos compatível com S3, ideal para backups e armazenamento de dados do sistema.",
    icon: Database,
    category: "Infraestrutura",
    status: "online",
    url: "http://192.168.1.121:9001",
    features: ["API S3 compatível", "Alta performance", "Escalabilidade", "Criptografia integrada"],
    color: "from-red-500 to-pink-500"
  },
  {
    id: "redis",
    name: "Redis",
    description: "Banco de dados em memória usado para cache, filas e gerenciamento de sessões do sistema.",
    icon: Database,
    category: "Infraestrutura",
    status: "online",
    url: "redis://192.168.1.121:6379",
    features: ["Cache em memória", "Filas de processamento", "Sessões rápidas", "Pub/Sub messaging"],
    color: "from-rose-500 to-red-500"
  },
  {
    id: "evolution-api",
    name: "Evolution API",
    description: "API para integração com WhatsApp Business, permitindo automação de mensagens e atendimento.",
    icon: MessageCircle,
    category: "Comunicação",
    status: "online",
    url: "http://192.168.1.121:8082",
    features: ["WhatsApp Business", "API REST", "Webhooks", "Multi-instância"],
    color: "from-emerald-500 to-green-500"
  },
  {
    id: "chatwoot",
    name: "Chatwoot",
    description: "Plataforma de atendimento ao cliente com chat ao vivo, tickets e integração com múltiplos canais.",
    icon: MessageCircle,
    category: "Comunicação",
    status: "online",
    url: "http://192.168.1.121:3000",
    features: ["Chat ao vivo", "Gestão de tickets", "Multi-canal", "Analytics de atendimento"],
    color: "from-violet-500 to-purple-500"
  },
  {
    id: "portainer",
    name: "Portainer",
    description: "Interface de gerenciamento para Docker, facilitando a administração de containers e serviços.",
    icon: Settings,
    category: "Gerenciamento",
    status: "online",
    url: "http://192.168.1.121:9443",
    features: ["Gestão de containers", "Dashboard visual", "Stacks e serviços", "Monitoramento"],
    color: "from-indigo-500 to-blue-500"
  },
  {
    id: "n8n",
    name: "n8n",
    description: "Plataforma de automação de workflows que conecta diferentes serviços e automatiza tarefas.",
    icon: Workflow,
    category: "Automação",
    status: "online",
    url: "http://192.168.1.121:5678",
    features: ["Automação de workflows", "Integrações nativas", "Webhook triggers", "Code nodes"],
    color: "from-yellow-500 to-orange-500"
  },
  {
    id: "zabbix",
    name: "Zabbix",
    description: "Sistema de monitoramento de infraestrutura que acompanha o desempenho e disponibilidade dos serviços.",
    icon: Shield,
    category: "Monitoramento",
    status: "online",
    url: "http://192.168.1.121:8083",
    features: ["Monitoramento de serviços", "Alertas automáticos", "Dashboards customizados", "Relatórios detalhados"],
    color: "from-blue-600 to-indigo-600"
  },
  {
    id: "glpi",
    name: "GLPI",
    description: "Sistema de gerenciamento de ativos de TI e help desk para controle de inventário e suporte técnico.",
    icon: Wrench,
    category: "Gerenciamento",
    status: "online",
    url: "http://192.168.1.121:8084",
    features: ["Gestão de ativos", "Help desk", "Inventário de TI", "Relatórios técnicos"],
    color: "from-teal-500 to-cyan-500"
  }
]

const categories = ["Todos", "Conhecimento", "Entretenimento", "Produtividade", "Infraestrutura", "Comunicação", "Gerenciamento", "Automação", "Monitoramento"]

export default function ServicesLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20"></div>
        <div className="container mx-auto px-6 relative">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Ecossistema de Serviços
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Acesse todos os serviços e aplicações disponíveis no backbone. 
              Organizados por categorias com descrições detalhadas e acesso direto.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm text-muted-foreground">{services.filter(s => s.status === "online").length} serviços online</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span className="text-sm text-muted-foreground">{categories.length - 1} categorias</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className={`h-2 bg-gradient-to-r ${service.color} rounded-t-lg`}></div>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${service.color} text-white group-hover:scale-110 transition-transform`}>
                    <service.icon className="h-6 w-6" />
                  </div>
                  <Badge variant={service.status === "online" ? "default" : "destructive"} className="text-xs">
                    {service.status === "online" ? "Online" : "Offline"}
                  </Badge>
                </div>
                <CardTitle className="text-lg font-bold mt-4">{service.name}</CardTitle>
                <CardDescription className="text-sm">{service.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destaques</p>
                  <div className="flex flex-wrap gap-1">
                    {service.features.slice(0, 2).map((feature, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {service.features.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{service.features.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Badge variant="outline" className="text-xs">
                    {service.category}
                  </Badge>
                  <Link href={service.url} target={service.url.startsWith('http') ? "_blank" : undefined} rel={service.url.startsWith('http') ? "noopener noreferrer" : undefined}>
                    <Button
                      size="sm"
                      className="group/btn"
                      disabled={service.status !== "online"}
                    >
                      Acessar
                      <ExternalLink className="h-3 w-3 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background/50">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Backbone Services - Todos os serviços em um único lugar
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-muted-foreground">Online</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                <span className="text-xs text-muted-foreground">Manutenção</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500"></div>
                <span className="text-xs text-muted-foreground">Offline</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}