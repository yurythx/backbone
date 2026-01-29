# Backbone SaaS - Backend API

Este repositório contém a API Backend do ecossistema SaaS BlackBone. O sistema é construído com Django, Django Rest Framework (DRF) e Django Channels, utilizando uma arquitetura multi-tenant isolada logicamente.

## 🚀 Como Iniciar

### Pré-requisitos
*   Python 3.12+
*   Redis (Obrigatório para WebSockets/Channels e Cache)
*   PostgreSQL (Recomendado) ou SQLite (Dev)

### Instalação

1.  **Ambiente Virtual**:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate  # Windows
    ```

2.  **Dependências**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Variáveis de Ambiente**:
    Copie o `.env.example` para `.env` e configure o banco de dados e Redis.

4.  **Banco de Dados e Dados Iniciais**:
    ```bash
    python manage.py migrate
    python manage.py seed_data  # Cria empresas, planos e usuários padrão
    ```

5.  **Executar Servidor**:
    ```bash
    python manage.py runserver
    ```

---

## 🔑 Autenticação e Multi-tenancy (Regras de Negócio)

O sistema segue um modelo de isolamento lógico onde **cada requisição deve identificar explicitamente o tenant (empresa)**.

### 1. Headers Obrigatórios
O Frontend **DEVE** enviar os seguintes headers em todas as requisições autenticadas (exceto login/registro):

| Header | Valor | Descrição |
| :--- | :--- | :--- |
| `Authorization` | `Bearer <access_token>` | Token JWT obtido no login. |
| `X-Company-Slug` | `<company_slug>` | Slug da empresa atual (ex: `blackbone`, `ironminds`). |

> **Regra de Negócio**: Se o header `X-Company-Slug` não for enviado, a API retornará **404 Not Found** ou **403 Forbidden**, pois o sistema não saberá qual banco de dados lógico consultar.

### 2. Login e Seleção de Contexto
1.  O usuário faz login (`/api/accounts/token/`) sem contexto de tenant.
2.  O backend retorna o Token JWT e, opcionalmente, a lista de empresas do usuário (se for multi-empresa) ou sua empresa padrão.
3.  O Frontend armazena o `company_slug` e o injeta no header `X-Company-Slug` para as chamadas subsequentes.

---

## 📦 Módulos e Permissões

O sistema é modular. Empresas contratam "Planos" que dão acesso a "Módulos" (Features).

### Verificação de Acesso (Backend)
Toda View de módulo (ex: `ArticlesViewSet`, `MessengerViewSet`) é protegida pela permissão `HasModuleAccess`.

*   **Fluxo**:
    1.  API recebe requisição para `/api/articles/`.
    2.  Verifica header `X-Company-Slug`.
    3.  Verifica na tabela `TenantModule` se o módulo `articles` está ativo para esta empresa.
    4.  **Se Inativo**: Retorna `403 Forbidden`.
    5.  **Frontend**: Deve capturar o 403 e mostrar mensagem "Módulo não contratado" ou redirecionar para upgrade.

---

## 💬 WebSockets (Messenger)

O chat em tempo real possui regras específicas de autenticação devido limitações do protocolo WS no browser.

### Conexão
*   **URL**: `ws://localhost:8000/ws/chat/<conversation_id>/?token=<jwt_access_token>`
*   **Auth**: Token passado via Query Param (`?token=...`).

### Regras de Segurança WS
1.  **Participação**: O usuário só conecta se for participante da `conversation_id`.
2.  **Anti-Spoofing**: O backend ignora o campo `sender` enviado pelo front. A mensagem sempre será assinada com o usuário do token JWT.

---

## 🛠️ Dados de Desenvolvimento (Seed Data)

Ao rodar `python manage.py seed_data`, o sistema cria o seguinte cenário:

### Empresas (Tenants)
1.  **BlackBone HQ** (slug: `blackbone`)
    *   Plano: **Pro** (Todos os módulos ativos: Pages, Articles, Messenger).
    *   Admin: `admin_blackbone` / `password123`
2.  **IronMinds Ltd** (slug: `ironminds`)
    *   Plano: **Basic** (Apenas Pages e Articles. **Sem Messenger**).
    *   Admin: `admin_ironminds` / `password123`

> **Teste de Integração**: Tente acessar o módulo Messenger logado como `admin_ironminds`. A API deve retornar 403.

---

## 📚 Documentação da API

Com o servidor rodando, acesse a documentação interativa para ver todos os endpoints e schemas JSON:

*   **Swagger UI**: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
*   **ReDoc**: [http://localhost:8000/api/redoc/](http://localhost:8000/api/redoc/)

---

## ⚠️ Checklist para o Frontend

1.  [ ] **Interceptor Axios/Fetch**: Configurar para injetar `X-Company-Slug` automaticamente.
2.  [ ] **Tratamento de Erros**:
    *   `401`: Refresh Token.
    *   `403`: Verificar se é erro de permissão ou módulo inativo.
3.  [ ] **WebSocket**: Implementar reconexão automática e passar token na URL.
4.  [ ] **Uploads**: Usar as URLs completas retornadas pela API (abstração de S3/Local).

---

## 📂 Estrutura Principal

*   `apps/core`: Modelos base (Company), Health Check.
*   `apps/accounts`: Usuários customizados, Auth.
*   `apps/module_manager`: Lógica de ativação/desativação de módulos.
*   `apps/messenger`: Chat real-time (HTTP + WS).
*   `shared_kernel`: Middlewares (Tenant, Logging), Utils.
