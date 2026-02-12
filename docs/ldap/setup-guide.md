# Guia de Setup - Autenticação LDAP

Guia completo para configurar autenticação LDAP no Backbone.

## 📋 Pré-requisitos

- Python 3.10+
- PostgreSQL
- Acesso a um servidor LDAP (Active Directory, OpenLDAP, etc.)
- Credenciais administrativas do LDAP

## 🔧 Instalação

### 1. Instalar Dependências

```bash
cd backend
pip install -r requirements.txt
```

Isso instalará:
- `ldap3>=2.9.1` - Cliente LDAP puro Python
- `cryptography>=41.0.0` - Para criptografia de senhas

### 2. Configurar Variáveis de Ambiente

```bash
# Gerar chave de criptografia
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Adicione ao `.env`:

```bash
# Obrigatório
FIELD_ENCRYPTION_KEY=<chave-gerada-acima>

# Opcional: Sentry para monitoramento
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_TRACES_SAMPLE_RATE=0.1
ENVIRONMENT=production
```

### 3. Aplicar Migrações

```bash
python manage.py migrate
```

Isso criará a tabela `core_ldapconfig`.

### 4. Verificar Instalação

```bash
# Executar testes
python manage.py test apps.core.tests.test_ldap

# Deve mostrar: OK (17 tests)
```

## ⚙️ Configuração via Interface Web

### 1. Acessar Admin Panel

Navegue para: `http://localhost:3005/admin/ldap`

### 2. Ativar LDAP

Toggle "Ativar LDAP" para ON (verde).

### 3. Configurar Servidor

#### Server URI
```
ldap://ldap.empresa.com:389   # LDAP padrão
ldaps://ldap.empresa.com:636  # LDAP sobre SSL
```

#### Bind DN e Senha
```
Bind DN: cn=admin,dc=empresa,dc=com
Senha: <senha-administrativa>
```

> ⚠️ **Importante**: Use uma conta de serviço dedicada, não sua conta pessoal!

### 4. Configurar Busca de Usuários

#### User Search Base
```
ou=users,dc=empresa,dc=com
```

#### User Search Filter
```
(uid=%(user)s)           # Para OpenLDAP
(sAMAccountName=%(user)s) # Para Active Directory
```

> 📝 O placeholder `%(user)s` será substituído pelo username na autenticação.

### 5. Mapear Atributos

Configure como os atributos LDAP mapeiam para campos do Django:

```
Username: uid (ou sAMAccountName para AD)
Email: mail
First Name: givenName
Last Name: sn
```

### 6. (Opcional) Configurações Avançadas

#### TLS/SSL
- ✅ Marque se o servidor requer StartTLS
- ✅ Ou use `ldaps://` na URI

#### Grupo Obrigatório
```
Admin Group DN: cn=admins,ou=groups,dc=empresa,dc=com
```

Apenas usuários neste grupo poderão autenticar.

### 7. Testar Conexão

**ANTES DE SALVAR**, clique em **"Testar Conexão"**!

✅ **Sucesso**: Banner verde com detalhes da conexão
❌ **Erro**: Banner vermelho com mensagem de erro específica

### 8. Salvar

Clique em **"Salvar Configuração"**.

## 🧪 Testar Autenticação

### Via Interface Web

1. Logout da conta atual
2. Tente fazer login com credenciais LDAP:
   ```
   Username: <usuario-ldap>
   Password: <senha-ldap>
   ```

### Via API

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "usuario_ldap",
    "password": "senha_ldap"
  }'
```

### Verificar Usuário Criado

```bash
python manage.py shell

>>> from apps.accounts.models import User
>>> User.objects.filter(username='usuario_ldap')
<QuerySet [<User: usuario_ldap>]>
```

## 🔍 Health Check

Verifique o status de todas as configurações LDAP:

```bash
curl http://localhost:8000/api/core/ldap-health/
```

Resposta esperada:
```json
{
  "status": "healthy",
  "total_configs": 1,
  "active_configs": 1,
  "failing_configs": 0,
  "details": [
    {
      "company": "Minha Empresa",
      "company_slug": "minha-empresa",
      "server_uri": "ldap://ldap.empresa.com:389",
      "status": "up",
      "last_test": "2026-02-12T14:30:00Z"
    }
  ]
}
```

## 📝 Logs

Os logs LDAP são gravados no console do Django:

```bash
# Sucesso
INFO ✓ LDAP login successful: joao @ empresa-a

# Falha
WARNING LDAP authentication failed for joao @ empresa-a
ERROR LDAP connection error: Server not accessible
```

## 🎯 Próximos Passos

- ✅ [Configurar exemplos específicos](examples.md)
- ✅ [Troubleshooting de problemas](troubleshooting.md)
- ✅ [Referência completa da API](api-reference.md)

## 🆘 Problemas?

Consulte [Troubleshooting](troubleshooting.md) ou revise os logs do Django.
