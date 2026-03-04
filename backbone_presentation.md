# 🦴 Backbone: A Espinha Dorsal do seu SaaS Multi-Tenant

> **Uma plataforma White-Label de nível empresarial, robusta e escalável, projetada para conectar empresas, pessoas e conteúdos.**

---

## 🚀 Guia de Início Rápido: Produção em 1 Clique

O deploy do Backbone foi projetado para ser **simples, seguro e automatizado**. O ponto de partida para qualquer ambiente de produção é o nosso script de elite: `deploy.sh`.

### 🏁 Passo 0: O Coração do Ambiente (.env.prod)
Antes de rodar o script, prepare as definições do seu ecossistema.
```bash
cp .env.prod.example .env.prod
nano .env.prod
# Defina: 
#   ALLOWED_HOSTS=api.projetoravenna.cloud,projetoravenna.cloud
#   NEXT_PUBLIC_API_URL=https://api.projetoravenna.cloud
```

### ⚡ Passo 1: O Comando de Deploy
Execute a automação que cuida de tudo: backup, sincronização de código, build, migrações e seeds.
```bash
chmod +x scripts/deploy.sh
# Primeiro deploy (ignora backup inicial)
SKIP_BACKUP=1 ./scripts/deploy.sh
```

---

## 🎨 Arquitetura Visual — Jornada do Dado

Este diagrama ilustra como o tráfego flui da internet até os seus containers através do **Cloudflare Tunnel**, garantindo segurança máxima sem expor portas do servidor.

```mermaid
graph TD
    %% Estilos de Cores
    classDef cloudflare fill:#F38020,stroke:#FFF,stroke-width:2px,color:#FFF;
    classDef server fill:#2D333B,stroke:#58A6FF,stroke-width:2px,color:#FFF;
    classDef container fill:#0DB7ED,stroke:#FFF,stroke-width:1px,color:#FFF;
    classDef database fill:#336791,stroke:#FFF,stroke-width:1px,color:#FFF;

    %% Client Side
    User((🌐 Usuário Final))

    %% Cloudflare Layer
    subgraph Cloudflare_Edge ["☁️ Rede Global Cloudflare (HTTPS/WAF/DDoS)"]
        CF_DNS["DNS: *.projetoravenna.cloud"]
        CF_Tunnel["Cloudflare Tunnel (Criptografado)"]
    end

    %% On-Premise / VPS Layer
    subgraph Ubuntu_Server ["📦 Servidor de Produção (Ubuntu 22.04)"]
        CF_Daemon["cloudflared daemon"]
        
        subgraph Docker_Compose ["🐳 Docker Compose Network"]
            direction TB
            Frontend["Next.js App (Port 3005)"]
            Backend["Django/Daphne (Port 8000)"]
            DB[("PostgreSQL 16")]
            Redis["Redis 7 (Cache/WS)"]
            MinIO["MinIO (S3 Storage)"]
            Celery["Celery Workers"]
        end
    end

    %% Connections
    User -->|HTTPS| CF_DNS
    CF_DNS --> CF_Tunnel
    CF_Tunnel <==>|Túnel Seguro outbound| CF_Daemon
    
    %% Routing logic within the Tunnel
    CF_Daemon -->|api.projetoravenna.cloud| Backend
    CF_Daemon -->|projetoravenna.cloud| Frontend

    %% Internal Services
    Backend <--> DB
    Backend <--> Redis
    Backend <--> MinIO
    Celery <--> Redis
    Celery <--> DB

    %% Apply Styles
    class CF_DNS,CF_Tunnel cloudflare;
    class Ubuntu_Server server;
    class Frontend,Backend,Celery container;
    class DB,Redis,MinIO database;
```

---

## 💎 Funcionalidades Estrelares

O **Backbone** entrega uma experiência premium desde o primeiro acesso.

*   🏢 **Arquitetura Multi-Tenant**: Isolamento nativo de dados entre clientes.
*   🛡️ **Segurança Zero Trust**: Acesso via túnel seguro, sem portas 80/443 expostas.
*   🎨 **Experiência White-Label**: Personalize cores, logos e fontes em tempo real.
*   💬 **Comunicação Ativa**: Chat em tempo real e notificações Push nativas.
*   🔄 **CI/CD Integrado**: Pronto para deploy automático via GitHub Actions.

---

## 🛠️ Stack Tecnológica de Elite

| Camada | Tecnologia | Propósito |
| :--- | :--- | :--- |
| **Frontend** | `Next.js 15` | Performance SSR e SEO impecável. |
| **Backend** | `Django 5.0` | Estabilidade e segurança DRF. |
| **Tempo Real** | `Daphne/WS` | Chat e presencial instantâneos. |
| **Banco** | `Postgres 16` | Robustez e integridade de dados. |
| **Cache** | `Redis 7` | Velocidade em cache e broker Celery. |
| **Storage** | `MinIO` | Arquivos com padrão S3 integrado. |
| **Infra** | `Cloudflare` | Segurança e tunnelamento de borda. |

---

### 📬 Informações de Mantenabilidade
Toda a documentação técnica detalhada pode ser encontrada na pasta `/docs`.

**Backbone — A estrutura que suporta o seu crescimento.**
