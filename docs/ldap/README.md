# Autenticação LDAP Multi-Tenant

Sistema completo de autenticação LDAP para aplicações multi-tenant, permitindo que cada empresa configure seu próprio servidor LDAP de forma independente e segura.

## 📋 Visão Geral

Este módulo adiciona suporte a autenticação LDAP ao Backbone, permitindo:

- ✅ **Configuração por empresa** - Cada tenant pode ter seu próprio servidor LDAP
- ✅ **Autenticação automática** - Usuários LDAP são criados/atualizados automaticamente
- ✅ **Fallback seguro** - Se LDAP falhar, usa autenticação padrão
- ✅ **Interface web** - Configuração completa via admin panel
- ✅ **Teste de conexão** - Valide configurações antes de salvar
- ✅ **Segurança** - Senhas criptografadas, validação robusta

## 🚀 Quick Start

### 1. Instalação

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configuração

```bash
# Gerar chave de criptografia
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Adicionar ao .env
FIELD_ENCRYPTION_KEY=<chave-gerada>
```

### 3. Migração

```bash
python manage.py migrate
```

### 4. Configurar LDAP

Acesse `/admin/ldap` e configure:
- Server URI (ex: `ldap://ldap.empresa.com:389`)
- Bind DN e senha
- Base de busca de usuários
- Mapeamento de atributos

### 5. Testar

Clique em **"Testar Conexão"** antes de salvar!

## 📚 Documentação

- **[Guia de Setup](setup-guide.md)** - Instalação passo a passo
- **[Troubleshooting](troubleshooting.md)** - Problemas comuns e soluções
- **[Referência da API](api-reference.md)** - Endpoints e exemplos
- **[Exemplos de Configuração](examples.md)** - Active Directory, OpenLDAP, etc.

## 🏗️ Arquitetura

```
┌─────────────┐
│   Frontend  │
│  (Next.js)  │
└──────┬──────┘
       │ REST API
       ▼
┌─────────────┐     ┌──────────────┐
│   Django    │────▶│ LDAP Server  │
│   Backend   │     │ (AD/OpenLDAP)│
└──────┬──────┘     └──────────────┘
       │
       ▼
┌─────────────┐
│  PostgreSQL │
│  (Configs)  │
└─────────────┘
```

## 🔒 Segurança

- **Criptografia**: Senhas LDAP são criptografadas com Fernet
- **Validação**: Campos obrigatórios são validados antes de salvar
- **TLS**: Suporte a LDAPS e StartTLS
- **Isolamento**: Cada empresa tem sua própria configuração
- **Auditoria**: Logs detalhados de autenticação

## 📊 API Endpoints

```http
GET    /api/core/ldap-config/              # Listar configurações
POST   /api/core/ldap-config/              # Criar configuração
GET    /api/core/ldap-config/{id}/         # Obter configuração
PUT    /api/core/ldap-config/{id}/         # Atualizar configuração
DELETE /api/core/ldap-config/{id}/         # Deletar configuração
POST   /api/core/ldap-config/{id}/test_connection/  # Testar conexão
GET    /api/core/ldap-health/              # Health check
```

## 🧪 Testes

```bash
# Executar todos os testes LDAP
python manage.py test apps.core.tests.test_ldap

# Com cobertura
coverage run --source='apps.core' manage.py test apps.core.tests.test_ldap
coverage report
```

## 🆘 Suporte

- **Problemas?** Consulte [Troubleshooting](troubleshooting.md)
- **Logs:** Verifique logs do Django para detalhes
- **Health Check:** `GET /api/core/ldap-health/`

## 📝 Changelog

### v1.0.0 (2026-02-12)
- ✅ Implementação inicial
- ✅ Suporte multi-tenant
- ✅ Interface web completa
- ✅ 17 testes automatizados (100% passing)
- ✅ Documentação completa
