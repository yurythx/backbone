# 🦴 Backbone - Plataforma SaaS Multi-Tenant

> Plataforma SaaS white-label de nível empresarial com CMS integrado, licenciamento e suporte a múltiplos tenants (clientes).

---

## 🚀 Início Rápido (Deploy Oficial)

A forma oficial e mais rápida de colocar o Backbone em produção é utilizando o nosso script de automação.

```bash
# 1. Clone o repositório
git clone <url_do_repositorio>
cd backbone

# 2. Configure o ambiente de produção
cp .env.prod.example .env.prod
# Edite as variáveis conforme necessário
nano .env.prod

# 3. Execute o Deploy
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 🌍 Acesso Pós-Deploy
*   **Frontend**: `https://projetoravenna.cloud`
*   **Backend API**: `https://api.projetoravenna.cloud`
*   **Admin**: `https://api.projetoravenna.cloud/admin`

Para detalhes sobre a configuração do Cloudflare Tunnel, veja o guia: [Manual Cloudflare](ops/DEPLOY_CLOUDFLARE.md)

---

## ✨ Funcionalidades

### 🏢 Multi-Tenancy & White-Label
- **Isolamento de Empresas**: Separação completa de dados por cliente.
- **Branding Personalizado**: Cores, logos, fontes e CSS/JS customizados por tenant.
- **Temas Dinâmicos**: Troca de tema em tempo real.
- **Integração Google Fonts**: Tipografia personalizada para cada empresa.

### 🧩 Gestão de Módulos (Module Manager)
- **Ativação Dinâmica**: Recursos são habilitados por tenant.
- **Isolamento de API**: Permissões bloqueiam acesso a APIs de módulos inativos (`HasModuleAccess`).

### 📝 CMS (Sistema de Gestão de Conteúdo)
- **Fluxo Editorial**: Status rigorosos (Rascunho, Pendente, Publicado, Rejeitado).
- **Controle de Versão**: Histórico e rollback com `django-reversion`.
- **Moderação**: Painel de aprovação/rejeição em lote com motivos de auditoria.
- **Otimização SEO**: Meta tags, sitemaps e portal público.

### 💼 CRM & Automação
- **Gestão Visual**: Pipeline de vendas/tickets em Kanban.
- **Automação de Calendário**: Sincronização automática de prazos de negócios com o módulo de calendário.
- **Notificações**: Alertas para proprietários em mudanças de estágio.

### 💰 Financeiro & Folha de Pagamento
- **Controle Financeiro**: Gestão de receitas, despesas e relatórios.
- **Folha de Pagamento (Payroll)**: Processamento de salários, cálculos de 13º e férias.

### 👥 Gestão de Usuários
- **Autenticação Segura**: JWT em cookies HttpOnly.
- **Autenticação LDAP**: Integração corporativa multi-tenant.
- **RBAC (Controle de Acesso)**: Permissões granulares baseadas em papéis, com suporte a wildcard (`*`).
- **Onboarding**: Fluxo guiado para novas empresas.

### 💳 Licenciamento & Monetização
- **Planos em Camadas**: Free, Pro e Enterprise.
- **Gating de Funcionalidades**: Controle de acesso a módulos via middleware.
- **Gestão de Licenças**: Rastreamento de assinaturas.

### 💬 Comunicação
- **Messenger**: Chat em tempo real via WebSockets.
- **Notificações Push**: Suporte a notificações VAPID no navegador.
- **Webhooks**: Integrações baseadas em eventos.

---

## 🏗️ Stack Tecnológica

| Camada | Tecnologia |
|-------|------------|
| **Backend** | Django 5.0, Django REST Framework |
| **Frontend** | Next.js 15, React 19, TypeScript |
| **Banco de Dados** | PostgreSQL 16 |
| **Cache & Broker** | Redis 7 |
| **Storage** | MinIO (padrão S3) |
| **Fila de Tarefas** | Celery |
| **WebSockets** | Django Channels (Daphne) |
| **Infra** | Docker, Cloudflare Tunnel |

---

## 📂 Estrutura do Projeto

```
backbone/
├── backend/                 # API Django (Python)
│   ├── apps/               # Aplicações específicas
│   ├── config/             # Configurações globais (settings)
│   └── requirements.txt    # Dependências
├── frontend/               # Aplicação Next.js (TypeScript)
│   ├── src/
│   │   ├── app/            # App Router
│   │   └── components/     # Componentes UI
├── docs/                   # Documentação técnica e de produto
├── scripts/                # Scripts de automação (Deploy, Backup)
└── docker-compose.prod.yml # Orquestração oficial de produção
```

---

## 🔧 Desenvolvimento Local

Se você deseja rodar o projeto para desenvolvimento:

```bash
# Usando Docker Compose de Dev
docker-compose up -d --build

# Backend disponível em: http://localhost:8005
# Frontend disponível em: http://localhost:3005
```

---

## 🧪 Testes

```bash
# Testes do Backend
cd backend
pytest

# Testes do Frontend
cd frontend
npm test
```

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

**Desenvolvido com ❤️ para aplicações SaaS modernas.**
