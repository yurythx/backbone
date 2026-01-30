# Documentação Técnica - Sistema Backbone

Este documento detalha o funcionamento, as regras de negócio e o processo de implantação do ecossistema Backbone.

---

## 🏛️ Arquitetura do Sistema

O Backbone é uma plataforma **SaaS Multi-tenant** de arquitetura modular, composta pelos seguintes pilares:

### Stack Tecnológica
- **Backend**: Python (Django & Django Rest Framework)
- **Frontend**: React (Next.js 14) com Tailwind CSS
- **Banco de Dados**: PostgreSQL 16
- **Comunicação em Tempo Real**: WebSockets (Django Channels & Redis)
- **Tarefas em Segundo Plano**: Celery & Celery Beat
- **Armazenamento de Mídia**: MinIO (S3-Compatible Storage)
- **Containerização**: Docker & Docker Compose

---

## 💼 Regras de Negócio Core

### 1. Multi-tenancy (Multi-empresa)
O sistema isola os dados por `Company` (Empresa/Tenant). 
- Cada usuário está vinculado a uma única empresa.
- Todas as requisições API são filtradas automaticamente pelo `company_id` do usuário autenticado.
- **Domínios**: Suporta mapeamento de domínios customizados por empresa.

### 2. White-label & Branding
Cada tenant pode personalizar sua interface sem afetar os outros:
- **Logo e Ícone**: Upload dinâmico via Admin.
- **Paleta de Cores**: Seleção de temas pré-definidos (Django Green, Ocean Blue, etc.) ou definição de cor primária hexadecimal.
- **Hierarquia de Temas**: O sistema busca o tema do Usuário ➡️ Empresa ➡️ Padrão (Fallback).

### 3. Gestão Modular
As funcionalidades são vendidas como módulos. Um administrador global pode ativar/desativar módulos para cada empresa:
- **Messenger**: Chat em tempo real.
- **CMS (Pages)**: Gestão de páginas institucionais.
- **Artigos**: Blog e central de ajuda.

---

## 🚀 Guia de Deploy com Docker

Siga estes passos para subir o ambiente completo em produção ou desenvolvimento.

### Pré-requisitos
- Docker e Docker Compose instalados.
- Porta 8005 (Backend) e 3005 (Frontend) liberadas.

### Passo a Passo

1. **Configurar Variáveis de Ambiente**  
   Certifique-se de que os arquivos `.env` existem ou confira o `docker-compose.yml`.

2. **Subir os Containers**
   ```bash
   docker-compose up -d --build
   ```

3. **Executar Migrations**
   ```bash
   docker-compose exec backend python manage.py migrate
   ```

4. **Criar Superusuário (Admin Global)**
   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

5. **Acessar as Aplicações**
   - **Dashboard (Frontend)**: `http://localhost:3005`
   - **API / Admin**: `http://localhost:8005/admin`
   - **MinIO (Arquivos)**: `http://localhost:9001` (Usuário/Senha: `minioadmin`)

---

## 🔧 Manutenção e Troubleshooting

### Limpeza de Cache de Throttling
Se for bloqueado por excesso de requisições durante testes:
```bash
docker exec backbone_redis redis-cli flushall
```

### Visualizar Logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Reiniciar Serviços Críticos
```bash
docker-compose restart backend frontend
```

---

> [!IMPORTANT]
> Em produção, lembre-se de alterar a `SECRET_KEY` no Django e desativar o `DEBUG=True` para garantir a segurança dos dados.
