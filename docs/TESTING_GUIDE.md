# 🧪 Guia de Testes - Sprint 1 e 2

**Data**: 2026-02-01  
**Versão**: Sprint 1 Completo + Sprint 2 Iniciado

---

## ✅ CHECKLIST DE TESTES

### 📦 1. Verificar Arquivos Criados

```bash
# Backend
ls -la backend/shared_kernel/validators.py
ls -la backend/apps/core/health.py
ls -la backend/requirements.txt

# Frontend
ls -la frontend/src/components/error-boundary.tsx
ls -la frontend/src/app/error.tsx
ls -la frontend/src/lib/toast-helpers.ts
ls -la frontend/src/components/ui/skeleton.tsx
ls -la frontend/src/components/ui/spinner.tsx

# DevOps
ls -la docker-compose.prod.yml
ls -la nginx/nginx.conf
ls -la docs/SSL_SETUP.md

# Documentação
ls -la IMPLEMENTATION_PLAN.md
ls -la CHECKLIST.md
ls -la GUIA_INICIO.md
ls -la README_SISTEMA.md
ls -la MAPA_VISUAL.md
```

**Resultado Esperado**: Todos os arquivos devem existir ✅

---

### 🔍 2. Verificar Sintaxe Python

```bash
# Validar sintaxe dos arquivos Python modificados
cd backend

# Validators
python -m py_compile shared_kernel/validators.py

# Health check
python -m py_compile apps/core/health.py

# Models
python -m py_compile apps/articles/models.py
python -m py_compile apps/core/models.py
python -m py_compile apps/messenger/models.py

# Settings
python -m py_compile config/settings.py
```

**Resultado Esperado**: Nenhum erro de sintaxe ✅

---

### 🎨 3. Verificar Sintaxe TypeScript/React

```bash
cd frontend

# Verificar se compila sem erros
npm run type-check || tsc --noEmit

# Listar arquivos criados
ls src/components/error-boundary.tsx
ls src/app/error.tsx
ls src/lib/toast-helpers.ts
ls src/components/ui/skeleton.tsx
ls src/components/ui/spinner.tsx
```

**Resultado Esperado**: Sem erros de tipo ✅

---

### 🐍 4. Testes Backend (se Docker estiver rodando)

```bash
cd backend

# 1. Verificar imports
python manage.py check

# 2. Criar migrations (se necessário)
python manage.py makemigrations

# 3. Rodar migrations
python manage.py migrate

# 4. Testar health check
curl http://localhost:8005/health/
# Deve retornar JSON com status de todos os serviços

# 5. Testar validators (no Django shell)
python manage.py shell
```

No shell:
```python
from shared_kernel.validators import validate_image
from django.core.files.uploadedfile import SimpleUploadedFile

# Testar validação (deve funcionar)
print("✅ Validators importados com sucesso")
exit()
```

**Resultado Esperado**: 
- `manage.py check`: System check identified no issues ✅
- Health check retorna status de PostgreSQL, Redis, MinIO ✅
- Validators importam sem erro ✅

---

### ⚛️ 5. Testes Frontend (se estiver rodando)

```bash
cd frontend

# Build de produção (teste final)
npm run build

# Se build passar, tudo está OK
```

**Resultado Esperado**: Build completa sem erros ✅

---

### 🔒 6. Verificar Configurações de Segurança

#### Backend Settings
```bash
cd backend
cat config/settings.py | grep -A 5 "CORS_ALLOW_ALL_ORIGINS"
cat config/settings.py | grep -A 3 "DEFAULT_THROTTLE_RATES"
```

**Verificar**:
- ✅ CORS é condicional (if DEBUG)
- ✅ Rate limiting: tenant=1000/day, anon=100/day

#### Nginx Config
```bash
cat nginx/nginx.conf | grep -A 2 "ssl_protocols"
cat nginx/nginx.conf | grep "X-Frame-Options"
```

**Verificar**:
- ✅ TLS 1.2/1.3 apenas
- ✅ Security headers presentes

---

### 📝 7. Verificar Git

```bash
# Ver todos os commits
git log --oneline -n 20

# Ver arquivos modificados
git status

# Ver branch atual
git branch
```

**Resultado Esperado**:
- Branch: `sprint-1/correcoes-criticas` ✅
- 15-16 commits desde início ✅
- Working directory limpo (ou apenas CHECKLIST.md pendente) ✅

---

### 🚀 8. Teste de Integração (OPCIONAL - se Docker estiver rodando)

```bash
# Subir todos os serviços
docker-compose up -d

# Esperar 30 segundos
sleep 30

# Verificar que todos estão rodando
docker-compose ps

# Testar health check completo
curl -s http://localhost:8005/health/ | python -m json.tool

# Verificar logs
docker-compose logs backend | tail -20
docker-compose logs frontend | tail -20

# Derrubar serviços
docker-compose down
```

**Resultado Esperado**:
- Todos os containers rodando ✅
- Health check retorna status=healthy ✅
- Logs sem erros críticos ✅

---

## 🎯 TESTES RÁPIDOS (Sem Docker)

Se não quiser rodar Docker, execute estes testes mínimos:

### Teste 1: Sintaxe Python
```bash
cd backend
python -c "import config.settings; print('✅ Settings OK')"
python -c "from shared_kernel.validators import validate_image; print('✅ Validators OK')"
python -c "from apps.core.health import health_check; print('✅ Health check OK')"
```

### Teste 2: Verificar Dependências
```bash
cd backend
cat requirements.txt | grep python-magic
# Deve mostrar: python-magic>=0.4.27 ✅
```

### Teste 3: Git Status
```bash
git status
git log --oneline -5
# Ver últimos 5 commits ✅
```

---

## 📊 RESULTADOS ESPERADOS

### ✅ Tudo OK se:
1. Todos os arquivos existem
2. Sintaxe Python e TypeScript sem erros
3. Git mostra 15+ commits organizados
4. Configurações de segurança corretas
5. Health check funciona (se Docker rodando)

### ⚠️ Problemas Comuns

#### "ModuleNotFoundError: No module named 'magic'"
**Solução**: Instalar python-magic
```bash
pip install python-magic
```

#### "Cannot find module 'lucide-react'"
**Solução**: Instalar dependências frontend
```bash
cd frontend
npm install
```

#### "Docker container not running"
**Solução**: Iniciar Docker
```bash
docker-compose up -d
```

---

## 🔄 DEPOIS DOS TESTES

### Se Tudo OK ✅
1. Atualizar CHECKLIST.md
2. Commit final do Sprint 1
3. Merge para main (ou continuar Sprint 2)
4. Tag de release (opcional)

### Se Houver Problemas ❌
1. Documentar erro encontrado
2. Corrigir problema
3. Re-testar
4. Commit da correção

---

## 📋 CHECKLIST FINAL

Antes de continuar para Sprint 2:

- [ ] Todos os arquivos criados existem
- [ ] Sintaxe Python válida
- [ ] Sintaxe TypeScript válida
- [ ] Git status limpo
- [ ] Configurações de segurança verificadas
- [ ] Health check testado (se possível)
- [ ] README atualizado (se necessário)
- [ ] CHECKLIST.md atualizado

---

## 🎉 APÓS TESTES COMPLETOS

Execute:
```bash
# 1. Atualizar CHECKLIST
# (marcar testes como concluídos)

# 2. Commit de atualização
git add CHECKLIST.md
git commit -m "docs: Sprint 1 tested and verified ✅"

# 3. Ver resumo
git log --oneline --graph -n 10
```

**Pronto para continuar! 🚀**
