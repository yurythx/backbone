# Troubleshooting - LDAP

Guia de soluções para problemas comuns com autenticação LDAP.

## 🔍 Diagnóstico Rápido

### 1. Verificar Health Check

```bash
curl http://localhost:8000/api/core/ldap-health/

# Se status != "healthy", veja detalhes em "details"
```

### 2. Verificar Logs

```bash
# Logs do Django
tail -f logs/django.log | grep LDAP

# Ou no console
python manage.py runserver
```

### 3. Testar Conexão Manual

No Django shell:

```python
python manage.py shell

>>> from apps.core.models import LDAPConfig
>>> from apps.core.ldap_utils import test_ldap_connection
>>> 
>>> config = LDAPConfig.objects.first()
>>> success, message = test_ldap_connection(config)
>>> print(message)
```

---

## ❌ Problemas Comuns

### 1. "Server URI não configurado"

**Erro:**
```
❌ Server URI não configurado. Configure o endereço do servidor LDAP.
```

**Solução:**
- Preencha o campo "Server URI"
- Formato: `ldap://servidor:389` ou `ldaps://servidor:636`

---

### 2. "Servidor LDAP não acessível"

**Erro:**
```
❌ Servidor LDAP não acessível.
URI: ldap://ldap.empresa.com:389
```

**Possíveis causas:**

#### A) Servidor está down
```bash
# Testar conectividade
ping ldap.empresa.com
telnet ldap.empresa.com 389
```

#### B) Firewall bloqueando
- Verificar firewall da rede
- Verificar firewall do servidor
- Portas padrão: 389 (LDAP), 636 (LDAPS)

#### C) URI incorreto
```bash
# Incorreto
ldap://ldap.empresa.com      # Faltando porta
ldap//ldap.empresa.com:389    # Faltando ':'

# Correto
ldap://ldap.empresa.com:389
```

---

### 3. "Credenciais do Bind DN inválidas"

**Erro:**
```
❌ Credenciais do Bind DN inválidas.
Verifique:
- Bind DN: cn=admin,dc=empresa,dc=com
- Senha está correta
```

**Soluções:**

#### A) Verificar DN correto
```bash
# Testar com ldapsearch
ldapsearch -x -H ldap://ldap.empresa.com:389 \
  -D "cn=admin,dc=empresa,dc=com" \
  -W -b "dc=empresa,dc=com"
```

#### B) Senha incorreta
- Reconectar e digitar senha novamente
- Verificar caps lock
- Caracteres especiais podem precisar escape

#### C) Conta expirada/desabilitada
- Verificar no servidor LDAP se conta está ativa

---

### 4. "Erro ao buscar em User Search Base"

**Erro:**
```
❌ Erro ao buscar em 'ou=users,dc=empresa,dc=com'
Verifique se o User Search Base está correto.
```

**Soluções:**

#### A) Base DN incorreto
```bash
# Descobrir base DN correto
ldapsearch -x -H ldap://ldap.empresa.com:389 \
  -D "cn=admin,dc=empresa,dc=com" -W \
  -b "" -s base namingContexts
```

#### B) Bind DN sem permissão
- Bind DN precisa ter permissão de leitura na base
- Testar com conta administrativa

---

### 5. "Filtro de busca inválido"

**Erro:**
```
❌ Filtro de busca inválido.
O filtro deve conter '%(user)s' como placeholder.
```

**Solução:**

```bash
# Incorreto
(uid=testuser)      # Sem placeholder
(uid=%s)            # Placeholder errado

# Correto
(uid=%(user)s)
(sAMAccountName=%(user)s)  # Para AD
```

---

### 6. "Usuário não encontrado no LDAP"

**Erro (nos logs):**
```
WARNING User joao not found in LDAP
```

**Soluções:**

#### A) Username incorreto
- Usuário digitou username errado
- Verificar se username existe no LDAP

#### B) Filtro de busca errado
```bash
# Para OpenLDAP
(uid=%(user)s)

# Para Active Directory
(sAMAccountName=%(user)s)
```

#### C) Usuário em outra OU
```bash
# Busca recursiva na base
ou=usuarios,dc=empresa,dc=com

# Se usuários em múltiplas OUs, use base mais alta
dc=empresa,dc=com
```

---

### 7. "Usuário não está no grupo obrigatório"

**Erro (nos logs):**
```
WARNING User joao not in required group cn=admins,ou=groups,dc=empresa,dc=com
```

**Soluções:**

#### A) Adicionar usuário ao grupo
No servidor LDAP, adicionar usuário ao grupo especificado.

#### B) Verificar DN do grupo
```bash
# Listar grupos
ldapsearch -x -H ldap://ldap.empresa.com:389 \
  -D "cn=admin,dc=empresa,dc=com" -W \
  -b "ou=groups,dc=empresa,dc=com" \
  "(objectClass=groupOfNames)"
```

#### C) Remover requisito de grupo
Se não precisa do grupo obrigatório, deixe campo vazio.

---

### 8. "TLS connection failed"

**Erro:**
```
❌ TLS handshake failed
```

**Soluções:**

#### A) Servidor não suporta TLS
- Desmarque "Use TLS"
- Ou use LDAPS: `ldaps://servidor:636`

#### B) Certificado inválido
```python
# Em desenvolvimento, pode ignorar (NÃO EM PRODUÇÃO!)
import ldap
ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)
```

---

### 9. "Login LDAP funciona mas usuário não é criado"

**Verificar:**

#### A) Logs do Django
```bash
tail -f logs/django.log | grep "Created user"
```

#### B) Atributos faltando
```python
# Mapeamento correto?
attr_username: uid
attr_email: mail
attr_first_name: givenName
attr_last_name: sn
```

#### C) Erro no banco de dados
- Verificar logs de erro do Django
- Verificar constraints da tabela User

---

### 10. "Timeout na conexão"

**Erro:**
```
LDAPException: Connection timeout
```

**Soluções:**

#### A) Aumentar timeout
```python
# Em ldap_utils.py ou ldap_backend.py
conn = Connection(
    server,
    user=bind_dn,
    password=bind_password,
    connect_timeout=10  # Aumentar de 5 para 10
)
```

#### B) Problema de rede
- Verificar latência de rede
- Testar com ping

---

## 🔧 Ferramentas de Diagnóstico

### ldapsearch (linha de comando)

```bash
# Testar conexão básica
ldapsearch -x -H ldap://servidor:389 -b "dc=empresa,dc=com"

# Com autenticação
ldapsearch -x -H ldap://servidor:389 \
  -D "cn=admin,dc=empresa,dc=com" -W \
  -b "dc=empresa,dc=com"

# Buscar usuário específico
ldapsearch -x -H ldap://servidor:389 \
  -D "cn=admin,dc=empresa,dc=com" -W \
  -b "dc=empresa,dc=com" \
  "(uid=joao)"
```

### Apache Directory Studio

GUI para navegar e testar LDAP:
- https://directory.apache.org/studio/

### Python LDAP Client

```python
from ldap3 import Server, Connection, ALL

server = Server('ldap://ldap.empresa.com:389', get_info=ALL)
conn = Connection(server, 'cn=admin,dc=empresa,dc=com', 'senha')
conn.bind()

# Buscar usuário
conn.search('dc=empresa,dc=com', '(uid=joao)')
print(conn.entries)
```

---

## 📊 Checklist de Debug

- [ ] Health check retornando "healthy"?
- [ ] Server URI correto e acessível?
- [ ] Bind DN e senha corretos?
- [ ] User Search Base correto?
- [ ] Filtro de busca com `%(user)s`?
- [ ] Atributos mapeados corretamente?
- [ ] TLS configurado se necessário?
- [ ] Firewall permitindo conexões?
- [ ] Logs do Django sem erros?
- [ ] Teste manual com ldapsearch funciona?

---

## 🆘 Ainda com Problemas?

1. **Habilitar debug máximo:**
   ```python
   # settings.py
   LOGGING = {
       'loggers': {
           'apps.core.ldap_backend': {
               'level': 'DEBUG',
           },
       },
   }
   ```

2. **Testar com servidor público:**
   ```
   Server: ldap://ldap.forumsys.com:389
   Bind DN: cn=read-only-admin,dc=example,dc=com
   Password: password
   Base: dc=example,dc=com
   Filter: (uid=%(user)s)
   Username de teste: einstein
   ```

3. **Consultar documentação:**
   - [Setup Guide](setup-guide.md)
   - [API Reference](api-reference.md)
   - [Examples](examples.md)
