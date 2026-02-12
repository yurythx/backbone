# Exemplos de Configuração - LDAP

Exemplos práticos de configuração para diferentes servidores LDAP.

## 🏢 Active Directory (Microsoft)

### Configuração Básica

```json
{
  "enabled": true,
  "server_uri": "ldap://ad.empresa.com:389",
  "bind_dn": "CN=Service Account,CN=Users,DC=empresa,DC=com",
  "bind_password": "senha_servico",
  "user_search_base": "CN=Users,DC=empresa,DC=com",
  "user_search_filter": "(sAMAccountName=%(user)s)",
  "attr_username": "sAMAccountName",
  "attr_email": "mail",
  "attr_first_name": "givenName",
  "attr_last_name": "sn",
  "use_tls": false
}
```

### Com TLS/SSL

```json
{
  "enabled": true,
  "server_uri": "ldaps://ad.empresa.com:636",
  "bind_dn": "CN=LDAP Service,OU=Service Accounts,DC=empresa,DC=com",
  "bind_password": "senha_segura",
  "user_search_base": "OU=Employees,DC=empresa,DC=com",
  "user_search_filter": "(sAMAccountName=%(user)s)",
  "attr_username": "sAMAccountName",
  "attr_email": "mail",
  "attr_first_name": "givenName",
  "attr_last_name": "sn",
  "use_tls": true
}
```

### Com Grupo Obrigatório

```json
{
  "enabled": true,
  "server_uri": "ldap://ad.empresa.com:389",
  "bind_dn": "CN=Service Account,CN=Users,DC=empresa,DC=com",
  "bind_password": "senha_servico",
  "user_search_base": "DC=empresa,DC=com",
  "user_search_filter": "(sAMAccountName=%(user)s)",
  "attr_username": "sAMAccountName",
  "attr_email": "mail",
  "attr_first_name": "givenName",
  "attr_last_name": "sn",
  "use_tls": false,
  "require_group": "CN=App Users,OU=Groups,DC=empresa,DC=com"
}
```

---

## 🐧 OpenLDAP

### Configuração Básica

```json
{
  "enabled": true,
  "server_uri": "ldap://ldap.empresa.com:389",
  "bind_dn": "cn=admin,dc=empresa,dc=com",
  "bind_password": "senha_admin",
  "user_search_base": "ou=people,dc=empresa,dc=com",
  "user_search_filter": "(uid=%(user)s)",
  "attr_username": "uid",
  "attr_email": "mail",
  "attr_first_name": "givenName",
  "attr_last_name": "sn",
  "use_tls": false
}
```

### Com StartTLS

```json
{
  "enabled": true,
  "server_uri": "ldap://ldap.empresa.com:389",
  "bind_dn": "cn=readonly,dc=empresa,dc=com",
  "bind_password": "senha_readonly",
  "user_search_base": "ou=users,dc=empresa,dc=com",
  "user_search_filter": "(uid=%(user)s)",
  "attr_username": "uid",
  "attr_email": "mail",
  "attr_first_name": "givenName",
  "attr_last_name": "sn",
  "use_tls": true
}
```

### Múltiplas OUs

```json
{
  "enabled": true,
  "server_uri": "ldap://ldap.empresa.com:389",
  "bind_dn": "cn=admin,dc=empresa,dc=com",
  "bind_password": "senha_admin",
  "user_search_base": "dc=empresa,dc=com",
  "user_search_filter": "(uid=%(user)s)",
  "attr_username": "uid",
  "attr_email": "mail",
  "attr_first_name": "givenName",
  "attr_last_name": "sn",
  "use_tls": false
}
```

---

## 🧪 Servidor de Testes Público

### ForumSys

Servidor LDAP público para testes:

```json
{
  "enabled": true,
  "server_uri": "ldap://ldap.forumsys.com:389",
  "bind_dn": "cn=read-only-admin,dc=example,dc=com",
  "bind_password": "password",
  "user_search_base": "dc=example,dc=com",
  "user_search_filter": "(uid=%(user)s)",
  "attr_username": "uid",
  "attr_email": "mail",
  "attr_first_name": "givenName",
  "attr_last_name": "sn",
  "use_tls": false
}
```

**Usuários de teste disponíveis:**
- `einstein` / `password`
- `newton` / `password`
- `galieleo` / `password`
- `tesla` / `password`
- `riemann` / `password`

---

## 🐳 Docker - OpenLDAP Local

### 1. Iniciar Servidor

```bash
docker run -d \
  --name openldap \
  -p 389:389 \
  -e LDAP_ORGANISATION="Empresa" \
  -e LDAP_DOMAIN="empresa.com" \
  -e LDAP_ADMIN_PASSWORD="admin_password" \
  osixia/openldap:latest
```

### 2. Popular com Usuários

```bash
# Criar arquivo users.ldif
cat > users.ldif << 'EOF'
dn: ou=people,dc=empresa,dc=com
objectClass: organizationalUnit
ou: people

dn: uid=joao,ou=people,dc=empresa,dc=com
objectClass: inetOrgPerson
uid: joao
cn: João Silva
sn: Silva
givenName: João
mail: joao@empresa.com
userPassword: senha123

dn: uid=maria,ou=people,dc=empresa,dc=com
objectClass: inetOrgPerson
uid: maria
cn: Maria Santos
sn: Santos
givenName: Maria
mail: maria@empresa.com
userPassword: senha456
EOF

# Adicionar ao LDAP
docker exec openldap ldapadd -x -D "cn=admin,dc=empresa,dc=com" \
  -w admin_password -f /tmp/users.ldif
```

### 3. Configurar no Backbone

```json
{
  "enabled": true,
  "server_uri": "ldap://localhost:389",
  "bind_dn": "cn=admin,dc=empresa,dc=com",
  "bind_password": "admin_password",
  "user_search_base": "ou=people,dc=empresa,dc=com",
  "user_search_filter": "(uid=%(user)s)",
  "attr_username": "uid",
  "attr_email": "mail",
  "attr_first_name": "givenName",
  "attr_last_name": "sn",
  "use_tls": false
}
```

---

## 🔐 Cenários Avançados

### 1. Apenas Administradores

Permitir apenas usuários do grupo "admins":

```json
{
  "enabled": true,
  "server_uri": "ldap://ldap.empresa.com:389",
  "bind_dn": "cn=admin,dc=empresa,dc=com",
  "bind_password": "senha_admin",
  "user_search_base": "ou=people,dc=empresa,dc=com",
  "user_search_filter": "(uid=%(user)s)",
  "attr_username": "uid",
  "attr_email": "mail",
  "attr_first_name": "givenName",
  "attr_last_name": "sn",
  "require_group": "cn=admins,ou=groups,dc=empresa,dc=com"
}
```

### 2. Filtro Customizado

Apenas usuários ativos:

```json
{
  "enabled": true,
  "server_uri": "ldap://ad.empresa.com:389",
  "bind_dn": "CN=Service Account,CN=Users,DC=empresa,DC=com",
  "bind_password": "senha_servico",
  "user_search_base": "DC=empresa,DC=com",
  "user_search_filter": "(&(sAMAccountName=%(user)s)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))",
  "attr_username": "sAMAccountName",
  "attr_email": "mail",
  "attr_first_name": "givenName",
  "attr_last_name": "sn"
}
```

> 📝 O filtro acima exclui contas desabilitadas no AD.

### 3. Múltiplos Domínios (Active Directory)

```json
{
  "enabled": true,
  "server_uri": "ldap://dc1.empresa.com:389 ldap://dc2.empresa.com:389",
  "bind_dn": "CN=Service Account,CN=Users,DC=empresa,DC=com",
  "bind_password": "senha_servico",
  "user_search_base": "DC=empresa,DC=com",
  "user_search_filter": "(sAMAccountName=%(user)s)",
  "attr_username": "sAMAccountName",
  "attr_email": "mail",
  "attr_first_name": "givenName",
  "attr_last_name": "sn"
}
```

---

## 🧪 Testando a Configuração

### Via ldapsearch

```bash
# OpenLDAP
ldapsearch -x -H ldap://ldap.empresa.com:389 \
  -D "cn=admin,dc=empresa,dc=com" \
  -w senha_admin \
  -b "ou=people,dc=empresa,dc=com" \
  "(uid=joao)"

# Active Directory
ldapsearch -x -H ldap://ad.empresa.com:389 \
  -D "CN=Service Account,CN=Users,DC=empresa,DC=com" \
  -w senha_servico \
  -b "DC=empresa,DC=com" \
  "(sAMAccountName=joao)"
```

### Via Python

```python
from ldap3 import Server, Connection, ALL

# Conectar
server = Server('ldap://ldap.empresa.com:389', get_info=ALL)
conn = Connection(server, 'cn=admin,dc=empresa,dc=com', 'senha_admin')
conn.bind()

# Buscar usuário
conn.search('ou=people,dc=empresa,dc=com', '(uid=joao)', attributes=['*'])
print(conn.entries[0])

# Verificar grupo
conn.search('cn=admins,ou=groups,dc=empresa,dc=com', '(member=uid=joao,ou=people,dc=empresa,dc=com)')
print(f"É admin: {len(conn.entries) > 0}")
```

---

## 📋 Checklist de Configuração

- [ ] Server URI correto e acessível
- [ ] Bind DN com permissões de leitura
- [ ] User Search Base correto
- [ ] Filtro de busca testado com ldapsearch
- [ ] Atributos mapeados corretamente
- [ ] TLS configurado se necessário
- [ ] Grupo obrigatório (se aplicável) existe
- [ ] Conexão testada via interface web
- [ ] Login de teste bem-sucedido

---

## 🔗 Links Relacionados

- [Setup Guide](setup-guide.md)
- [Troubleshooting](troubleshooting.md)
- [API Reference](api-reference.md)
