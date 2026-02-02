# Documentação de Handoff para Frontend (Backbone SaaS)

Este documento contém todas as informações necessárias para o desenvolvimento do frontend do projeto Backbone, incluindo autenticação, estrutura da API, regras de negócio e comunicação em tempo real (WebSockets).

---

## 1. Visão Geral
O Backbone é um sistema SaaS Multi-tenant. O frontend deve ser capaz de:
1. Identificar a empresa (Tenant) atual.
2. Autenticar usuários via JWT.
3. Consumir APIs RESTful.
4. Conectar em WebSockets para chat e presença em tempo real.

---

## 2. Autenticação e Tenant

### 2.1 Identificação do Tenant
Todas as requisições para a API devem identificar a empresa.
- **Header**: `X-Company-Slug: <slug-da-empresa>`
- **Exemplo**: `X-Company-Slug: company-a`

### 2.2 Login (JWT)
- **Endpoint**: `POST /api/token/`
- **Body**: `{ "username": "...", "password": "..." }`
- **Response**:
  ```json
  {
    "access": "eyJ0eX...",
    "refresh": "eyJ0eX..."
  }
  ```
- **Uso**: Adicionar header `Authorization: Bearer <access_token>` em todas as requisições protegidas.

### 2.3 Refresh Token
- **Endpoint**: `POST /api/token/refresh/`
- **Body**: `{ "refresh": "<refresh_token>" }`

---

## 3. Módulo Messenger (Chat Real-time)

Este é o módulo mais complexo, envolvendo API REST e WebSockets.

### 3.1 Regras de Visibilidade (Business Rules)
O frontend deve respeitar estritamente quem o usuário pode ver na lista de contatos:
1.  **Superusuário / Staff**: Vê **todos** os usuários da empresa (exceto ele mesmo).
2.  **Usuário Comum**: Vê **apenas** usuários que pertencem aos mesmos grupos que ele.
    - Se o usuário não estiver em nenhum grupo, sua lista de contatos estará vazia.
    - O backend já filtra isso automaticamente no endpoint de contatos.

### 3.2 Status Online (Presença)
O sistema possui rastreamento permanente de status online/offline.
- **Online**: Usuário conectado ao WebSocket de presença.
- **Offline**: Usuário desconectado.

### 3.3 Endpoints REST (Messenger)

#### Listar Contatos (com status online inicial)
- **GET** `/api/messenger/contacts/`
- **Retorno**:
  ```json
  [
    {
      "id": 1,
      "username": "alice",
      "email": "alice@example.com",
      "is_online": true  // Status atual (snapshot)
    }
  ]
  ```

#### Listar Conversas
- **GET** `/api/messenger/conversations/`
- **Retorno**: Lista de conversas onde o usuário participa.

#### Enviar Mensagem (REST)
- **POST** `/api/messenger/conversations/<id>/send_message/`
- **Body**: `{ "content": "Olá!" }`
- **Nota**: O envio via REST dispara eventos no WebSocket, mas mensagens também podem ser enviadas via WS (a definir na implementação futura). Por enquanto, use REST para enviar e WS para receber.

### 3.4 WebSockets (Real-time)

**URL Base**: `ws://<host>/ws/`
**Autenticação**: Passar token na Query String: `?token=<access_token>`

#### A. Canal de Presença (Global da Empresa)
- **URL**: `ws/presence/`
- **Função**: Receber atualizações de quem entrou/saiu.
- **Eventos Recebidos**:
  ```json
  {
    "type": "user.status",
    "user_id": 123,
    "status": "online" // ou "offline"
  }
  ```
- **Lógica Front**: Ao receber este evento, atualizar o ícone de status na lista de contatos.

#### B. Canal de Chat (Por Conversa)
- **URL**: `ws/chat/<room_name>/` (Onde `room_name` é geralmente `chat_<conversation_id>`)
- **Função**: Receber mensagens em tempo real.
- **Eventos Recebidos**:
  ```json
  {
    "message": "Olá!",
    "sender": "alice"
  }
  ```

---

## 4. Estrutura de Dados (TypeScript Interfaces)

Sugestão de interfaces para o Frontend:

```typescript
// Usuário / Contato
interface Contact {
  id: number;
  username: string;
  email: string;
  is_online: boolean; // Preenchido via API e atualizado via WS
}

// Mensagem
interface Message {
  id: number;
  content: string;
  sender: number; // ID do usuário
  created_at: string; // ISO Date
}

// Conversa
interface Conversation {
  id: number;
  participants: Contact[];
  last_message?: Message;
}

// Evento de Presença (WebSocket)
interface PresenceEvent {
  type: 'user.status';
  user_id: number;
  status: 'online' | 'offline';
}
```

---

## 5. OpenAPI Schema

Um arquivo completo da especificação da API foi gerado em `docs/schema.yaml`. Você pode importá-lo no Postman ou usar geradores de código (como `openapi-typescript-codegen`) para criar os serviços do frontend automaticamente.

---

## 6. Checklist de Implementação Frontend

1.  [ ] **Setup Axios**: Configurar interceptors para injetar `Authorization` e `X-Company-Slug`.
2.  [ ] **Auth Provider**: Gerenciar estado de login e refresh token automático.
3.  [ ] **WebSocket Provider**:
    - Conectar no `ws/presence/` assim que logar.
    - Manter mapa de status `{ [userId]: 'online' | 'offline' }`.
4.  [ ] **Tela de Chat**:
    - Sidebar: Lista de contatos (filtrada pela API) + Indicador de Status.
    - Área Principal: Lista de mensagens + Input.
    - Ao abrir conversa, conectar no `ws/chat/<id>/`.

---

## 7. Observações Finais
- **Erros 403 Forbidden**: Geralmente significam falta de acesso ao módulo (verifique `HasModuleAccess`) ou tentativa de acessar dados de outro grupo/empresa.
- **Timezone**: O backend opera em UTC. O frontend deve converter para hora local ao exibir.

---

## 8. Exemplos Práticos para o Frontend

### 8.1 Interceptors com Axios

```ts
import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  const slug = localStorage.getItem('company_slug') || 'blackbone'
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['X-Company-Slug'] = slug
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      // opcional: tentar refresh token
      // redirecionar para login
    }
    if (err.response?.status === 403) {
      // módulo desativado ou acesso negado
    }
    return Promise.reject(err)
  }
)
```

### 8.2 Uso dos Endpoints (Messenger)

```ts
// listar conversas
const { data: conversations } = await api.get('/api/messenger/conversations/')

// enviar mensagem
await api.post(`/api/messenger/conversations/${conversationId}/send_message/`, {
  content: 'Olá!',
})

// listar mensagens com paginação temporal
const ts = new Date().toISOString()
const { data: messages } = await api.get(`/api/messenger/conversations/${conversationId}/messages/?before=${ts}`)

// marcar mensagem como lida
await api.post(`/api/messenger/messages/${messageId}/mark_read/`)
```

### 8.3 Conexão WebSocket (Chat)

```ts
const token = localStorage.getItem('access_token')
const ws = new WebSocket(`ws://localhost:8000/ws/chat/${conversationId}/?token=${token}`)

ws.onopen = () => {
  console.log('WS connected')
}

ws.onmessage = (event) => {
  const payload = JSON.parse(event.data)
  // payload: { message, sender }
}

ws.onclose = () => {
  console.log('WS closed, try to reconnect...')
}
```

### 8.4 Gerando Cliente a partir do OpenAPI

Opcional: usar `openapi-typescript-codegen` para gerar tipos e serviços.

```bash
npx openapi-typescript-codegen --input ./backend/docs/schema.yaml --output ./frontend/src/api
```

Depois, importe os serviços gerados no frontend e use com os interceptors configurados.
