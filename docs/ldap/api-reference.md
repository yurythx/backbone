# Referência da API - LDAP

Documentação completa dos endpoints REST para gerenciamento de configurações LDAP.

## 🔐 Autenticação

Todos os endpoints requerem autenticação via JWT:

```http
Authorization: Bearer <seu-token-jwt>
```

## 📍 Base URL

```
http://localhost:8000/api/core/
```

---

## Endpoints

### 1. Listar Configurações LDAP

Retorna todas as configurações LDAP do tenant atual.

```http
GET /api/core/ldap-config/
```

**Resposta (200 OK):**

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "company": 1,
      "enabled": true,
      "server_uri": "ldap://ldap.empresa.com:389",
      "bind_dn": "cn=admin,dc=empresa,dc=com",
      "user_search_base": "ou=users,dc=empresa,dc=com",
      "user_search_filter": "(uid=%(user)s)",
      "attr_username": "uid",
      "attr_email": "mail",
      "attr_first_name": "givenName",
      "attr_last_name": "sn",
      "use_tls": false,
      "require_group": "",
      "admin_group_dn": "",
      "last_test_status": "success",
      "last_test_message": "✅ Conexão LDAP estabelecida com sucesso!",
      "last_test_at": "2026-02-12T14:30:00Z",
      "created_at": "2026-02-10T10:00:00Z",
      "updated_at": "2026-02-12T14:30:00Z"
    }
  ]
}
```

---

### 2. Obter Configuração Específica

Retorna detalhes de uma configuração LDAP.

```http
GET /api/core/ldap-config/{id}/
```

**Parâmetros:**
- `id` (path): ID da configuração

**Resposta (200 OK):**

```json
{
  "id": 1,
  "company": 1,
  "enabled": true,
  "server_uri": "ldap://ldap.empresa.com:389",
  ...
}
```

**Erros:**
- `404 Not Found`: Configuração não encontrada

---

### 3. Criar Configuração LDAP

Cria nova configuração LDAP para o tenant.

```http
POST /api/core/ldap-config/
Content-Type: application/json
```

**Body:**

```json
{
  "enabled": true,
  "server_uri": "ldap://ldap.empresa.com:389",
  "bind_dn": "cn=admin,dc=empresa,dc=com",
  "bind_password": "senha_secreta",
  "user_search_base": "ou=users,dc=empresa,dc=com",
  "user_search_filter": "(uid=%(user)s)",
  "attr_username": "uid",
  "attr_email": "mail",
  "attr_first_name": "givenName",
  "attr_last_name": "sn",
  "use_tls": false,
  "require_group": "",
  "admin_group_dn": ""
}
```

**Campos Obrigatórios (se `enabled=true`):**
- `server_uri`
- `bind_dn`
- `bind_password`
- `user_search_base`

**Campos Opcionais:**
- `user_search_filter` (padrão: `(uid=%(user)s)`)
- `attr_username` (padrão: `uid`)
- `attr_email` (padrão: `mail`)
- `attr_first_name` (padrão: `givenName`)
- `attr_last_name` (padrão: `sn`)
- `use_tls` (padrão: `false`)
- `require_group` (padrão: `""`)
- `admin_group_dn` (padrão: `""`)

**Resposta (201 Created):**

```json
{
  "id": 1,
  "company": 1,
  "enabled": true,
  ...
}
```

**Erros:**
- `400 Bad Request`: Validação falhou
- `409 Conflict`: Já existe configuração para este tenant

---

### 4. Atualizar Configuração LDAP

Atualiza configuração existente.

```http
PUT /api/core/ldap-config/{id}/
Content-Type: application/json
```

**Body:**

```json
{
  "enabled": true,
  "server_uri": "ldap://novo-servidor.com:389",
  "bind_dn": "cn=admin,dc=novo,dc=com",
  "bind_password": "nova_senha",
  ...
}
```

> 📝 **Nota**: `bind_password` é opcional no update. Se omitido, senha atual é mantida.

**Resposta (200 OK):**

```json
{
  "id": 1,
  "company": 1,
  "enabled": true,
  "server_uri": "ldap://novo-servidor.com:389",
  ...
}
```

**Erros:**
- `400 Bad Request`: Validação falhou
- `404 Not Found`: Configuração não encontrada

---

### 5. Deletar Configuração LDAP

Remove configuração LDAP do tenant.

```http
DELETE /api/core/ldap-config/{id}/
```

**Resposta (204 No Content)**

**Erros:**
- `404 Not Found`: Configuração não encontrada

---

### 6. Testar Conexão LDAP

Testa a conexão LDAP com as configurações atuais.

```http
POST /api/core/ldap-config/{id}/test_connection/
```

**Resposta (200 OK):**

```json
{
  "success": true,
  "message": "✅ Conexão LDAP estabelecida com sucesso!\n\nServidor: ldap://ldap.empresa.com:389\nBase de Busca: ou=users,dc=empresa,dc=com\nFiltro: (uid=%(user)s)\nTLS/SSL: Não",
  "tested_at": "2026-02-12T14:45:00Z",
  "status": "success"
}
```

**Resposta (400 Bad Request) se falhar:**

```json
{
  "success": false,
  "message": "❌ Servidor LDAP não acessível.\n\nURI: ldap://ldap.empresa.com:389\n\nVerifique:\n- O servidor está ligado e acessível\n- Firewall permite conexão\n- Porta correta (389 para LDAP, 636 para LDAPS)",
  "tested_at": "2026-02-12T14:45:00Z",
  "status": "failed"
}
```

---

### 7. Health Check LDAP

Verifica o status de todas as configurações LDAP ativas.

```http
GET /api/core/ldap-health/
```

> 📝 Endpoint público, não requer autenticação (para monitoramento).

**Resposta (200 OK):**

```json
{
  "status": "healthy",
  "total_configs": 3,
  "active_configs": 2,
  "failing_configs": 0,
  "details": [
    {
      "company": "Empresa A",
      "company_slug": "empresa-a",
      "server_uri": "ldap://ldap.empresa-a.com:389",
      "status": "up",
      "last_test": "2026-02-12T14:30:00Z"
    },
    {
      "company": "Empresa B",
      "company_slug": "empresa-b",
      "server_uri": "ldap://ldap.empresa-b.com:389",
      "status": "up",
      "last_test": "2026-02-12T14:25:00Z"
    }
  ]
}
```

**Status possíveis:**
- `healthy`: Todas as configs ativas funcionando
- `degraded`: Algumas configs falhando
- `unhealthy`: Todas as configs falhando
- `error`: Erro no health check

**Resposta (500 Internal Server Error):**

```json
{
  "status": "error",
  "error": "Mensagem de erro"
}
```

---

## 🔒 Segurança

### Campos Sensíveis

O campo `bind_password` é **write-only**:
- ✅ Pode ser enviado em POST/PUT
- ❌ Nunca é retornado em GET
- 🔐 Armazenado criptografado no banco

### Permissões

- Todos os endpoints requerem autenticação
- Usuários só podem ver/editar configs de seu próprio tenant
- Health check é público (para monitoramento externo)

---

## 📝 Exemplos Completos

### Criar e Testar Configuração

```bash
# 1. Criar configuração
curl -X POST http://localhost:8000/api/core/ldap-config/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "server_uri": "ldap://ldap.empresa.com:389",
    "bind_dn": "cn=admin,dc=empresa,dc=com",
    "bind_password": "senha123",
    "user_search_base": "ou=users,dc=empresa,dc=com",
    "user_search_filter": "(uid=%(user)s)"
  }'

# Resposta: {"id": 1, ...}

# 2. Testar conexão
curl -X POST http://localhost:8000/api/core/ldap-config/1/test_connection/ \
  -H "Authorization: Bearer $TOKEN"

# 3. Se sucesso, está pronto para uso!
```

### Atualizar Servidor

```bash
curl -X PUT http://localhost:8000/api/core/ldap-config/1/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "server_uri": "ldaps://novo-servidor.com:636",
    "use_tls": true
  }'
```

### Monitorar Saúde

```bash
# Health check
curl http://localhost:8000/api/core/ldap-health/

# Parse com jq
curl -s http://localhost:8000/api/core/ldap-health/ | jq '.status'
```

---

## 🎯 Códigos de Status HTTP

| Código | Significado |
|--------|-------------|
| 200 | OK - Sucesso |
| 201 | Created - Recurso criado |
| 204 | No Content - Deletado com sucesso |
| 400 | Bad Request - Validação falhou |
| 401 | Unauthorized - Não autenticado |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Recurso não encontrado |
| 409 | Conflict - Recurso já existe |
| 500 | Internal Server Error - Erro do servidor |

---

## 🔗 Links Relacionados

- [Setup Guide](setup-guide.md)
- [Troubleshooting](troubleshooting.md)
- [Examples](examples.md)
