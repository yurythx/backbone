# 🎯 Guia de Início Rápido - Implementação Backbone

**Data**: 2026-02-01  
**Objetivo**: Começar a implementação de forma organizada e eficiente

---

## 🚦 PASSO A PASSO PARA COMEÇAR

### 1️⃣ Preparação do Ambiente (30 minutos)

```bash
# 1. Verificar que Docker está rodando
docker --version
docker-compose --version

# 2. Subir todos os serviços
cd c:/Users/allle/OneDrive/Área\ de\ Trabalho/Projetos/backbone
docker-compose up -d

# 3. Verificar que todos estão rodando
docker-compose ps

# 4. Verificar logs
docker-compose logs -f backend
docker-compose logs -f frontend

# 5. Acessar aplicação
# Backend: http://localhost:8005
# Frontend: http://localhost:3005
# MinIO: http://localhost:9001
```

**✅ Checklist de Verificação:**
- [ ] PostgreSQL rodando (porta 5432)
- [ ] Redis rodando (porta 6379)
- [ ] MinIO rodando (portas 9000, 9001)
- [ ] Backend rodando (porta 8005)
- [ ] Frontend rodando (porta 3005)
- [ ] Consegue fazer login no frontend

---

### 2️⃣ Criar Branch para Sprint 1 (5 minutos)

```bash
# Garantir que está na main/master
git checkout main
git pull origin main

# Criar branch para Sprint 1
git checkout -b sprint-1/correcoes-criticas

# Verificar branch atual
git branch
```

---

### 3️⃣ Primeira Tarefa: CORR-001 (5 minutos)

**Tarefa mais simples para começar:**

```bash
# Abrir arquivo
code backend/config/settings.py
```

**O que fazer:**
- Ir para linhas 2-3
- Remover um dos `import os` duplicados
- Salvar arquivo

**Testar:**
```bash
# Restartar backend
docker-compose restart backend

# Verificar que não há erros
docker-compose logs backend
```

**Commitar:**
```bash
git add backend/config/settings.py
git commit -m "fix(backend): remove duplicate os import [CORR-001]"
```

**Atualizar checklist:**
- Abrir `CHECKLIST.md`
- Marcar `[x]` na tarefa CORR-001
- Preencher data de conclusão
- Salvar

---

### 4️⃣ Segunda Tarefa: CORR-002 (30 minutos)

**CORS Condicional:**

Editar `backend/config/settings.py`:

```python
# Linha 109 - ANTES:
CORS_ALLOW_ALL_ORIGINS = True # Temporário para dev

# Linha 109 - DEPOIS:
# CORS Configuration - Conditional by environment
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True  # Allow all in development
else:
    CORS_ALLOW_ALL_ORIGINS = False
    # Only allow specific origins in production
    CORS_ALLOWED_ORIGINS = env.list(
        "CORS_ALLOWED_ORIGINS", 
        default=[
            "https://yourdomain.com",
            "https://www.yourdomain.com"
        ]
    )
```

**Testar:**
```bash
docker-compose restart backend
# Verificar que ainda funciona no frontend
```

**Commitar:**
```bash
git add backend/config/settings.py
git commit -m "fix(security): implement conditional CORS by environment [CORR-002]"
```

**Atualizar checklist:**
- Marcar `[x]` na tarefa CORR-002

---

### 5️⃣ Terceira Tarefa: CORR-003 (20 minutos)

**Gerar Secret Key Segura:**

```bash
# Entrar no container do backend
docker-compose exec backend bash

# Gerar nova secret key
python manage.py shell
>>> from django.core.management.utils import get_random_secret_key
>>> print(get_random_secret_key())
>>> exit()

# Sair do container
exit
```

**Copiar a key gerada e atualizar `.env`:**

```bash
# Editar .env
code backend/.env

# Substituir:
SECRET_KEY=sua-nova-secret-key-aqui-muito-longa-e-segura
```

**⚠️ IMPORTANTE:**
- Também atualizar `.env.example` com uma nota
- NÃO commitar o `.env` real
- Documentar no README

**Commitar:**
```bash
git add backend/.env.example
git add README.md  # se documentou
git commit -m "security(backend): generate secure secret key [CORR-003]"
```

---

### 6️⃣ Workflow Recomendado

**Padrão para cada tarefa:**

1. **Ler descrição** no CHECKLIST.md
2. **Criar sub-branch** (opcional): `git checkout -b corr-004-rate-limiting`
3. **Implementar** a solução
4. **Testar** localmente
5. **Escrever/atualizar testes** se aplicável
6. **Commitar** com mensagem descritiva
7. **Marcar checkbox** no CHECKLIST.md
8. **Push** para remote
9. **Próxima tarefa**

---

## 📋 PADRÕES E CONVENÇÕES

### Commits

Use Conventional Commits:

```bash
# Correções
git commit -m "fix(backend): description [CORR-XXX]"
git commit -m "fix(frontend): description [CORR-XXX]"

# Implementações
git commit -m "feat(backend): description [IMPL-XXX]"
git commit -m "feat(frontend): description [IMPL-XXX]"

# Melhorias
git commit -m "perf(backend): description [MELHORIA-XXX]"
git commit -m "refactor(backend): description [MELHORIA-XXX]"

# Testes
git commit -m "test(backend): description"

# Documentação
git commit -m "docs: description"
```

### Branches

```bash
# Sprints
sprint-1/correcoes-criticas
sprint-2/seguranca-estabilidade
sprint-3/ux-essencial

# Features individuais (opcional)
feature/IMPL-005-rich-editor
fix/CORR-008-error-boundary
```

### Pull Requests

**Título:** `[Sprint 1] Correções Críticas - Parte 1`

**Descrição:**
```markdown
## 📝 Resumo
Implementação de correções críticas do Sprint 1

## ✅ Tarefas Completadas
- [x] CORR-001: Import duplicado removido
- [x] CORR-002: CORS condicional
- [x] CORR-003: Secret key segura
- [x] CORR-004: Rate limiting ajustado

## 🧪 Como Testar
1. docker-compose up -d
2. Acessar http://localhost:3005
3. Verificar que login funciona
4. Verificar logs sem erros

## 📸 Screenshots
(adicionar se relevante)

## 📚 Documentação Atualizada
- [x] CHECKLIST.md
- [x] README.md (se aplicável)
```

---

## 🎯 PRIORIZAÇÃO DENTRO DO SPRINT 1

### Ordem Sugerida (Do mais fácil ao mais complexo):

1. ✅ **CORR-001** (5 min) - Import duplicado ← **COMECE AQUI**
2. ✅ **CORR-003** (20 min) - Secret key
3. ✅ **CORR-004** (15 min) - Rate limiting
4. ✅ **CORR-002** (30 min) - CORS
5. ⚡ **CORR-009** (4 horas) - Loading states
6. ⚡ **CORR-008** (2 horas) - Error boundary
7. 🔥 **CORR-005** (3 horas) - File upload validation
8. 🔥 **CORR-013** (4 horas) - SSL/HTTPS

**Estimativa total**: ~14 horas de trabalho

---

## 💡 DICAS IMPORTANTES

### 1. Commits Frequentes
Faça commits pequenos e frequentes. Melhor 10 commits pequenos que 1 commit gigante.

### 2. Teste Sempre
Antes de marcar como completo:
- [ ] Funciona localmente
- [ ] Não quebrou nada
- [ ] Backend logs sem erro
- [ ] Frontend sem console errors

### 3. Documente Decisões
Se algo não ficou claro ou você tomou uma decisão técnica, adicione comentário no código ou atualize documentação.

### 4. Peça Ajuda
Se travar em algo por mais de 1 hora, documente o problema e peça ajuda.

### 5. Balance entre Velocidade e Qualidade
Não precisa ser perfeito, mas precisa funcionar bem. Pode sempre refatorar depois.

---

## 🆘 TROUBLESHOOTING COMUM

### Docker Não Inicia
```bash
# Limpar containers e volumes
docker-compose down -v
docker-compose up -d --build
```

### Migrações com Erro
```bash
docker-compose exec backend python manage.py migrate --fake-initial
```

### Frontend Não Compila
```bash
# Limpar node_modules e reinstalar
docker-compose exec frontend rm -rf node_modules .next
docker-compose exec frontend npm install
docker-compose restart frontend
```

### Redis Connection Error
```bash
docker-compose restart redis
docker-compose restart backend
```

### Port Already in Use
```bash
# Verificar o que está usando a porta
netstat -ano | findstr :8005
netstat -ano | findstr :3005

# Matar processo ou mudar porta no docker-compose.yml
```

---

## 📊 TRACKING DE PROGRESSO

### Ao Final de Cada Dia

Atualize o `CHECKLIST.md`:
- Marque tarefas concluídas
- Preencha datas
- Anote bloqueios/problemas

### Ao Final de Cada Sprint

1. **Atualizar progresso** no README.md
2. **Tag de release**: `git tag sprint-1 -m "Sprint 1: Correções Críticas"`
3. **Merge para main**: Create PR → Review → Merge
4. **Deploy em staging** e teste
5. **Retrospectiva**: O que foi bem? O que pode melhorar?

---

## 🎓 RECURSOS DE APRENDIZADO

### Se Não Conhece Algo

- **Django**: https://docs.djangoproject.com/
- **Next.js**: https://nextjs.org/docs
- **Docker**: https://docs.docker.com/
- **TypeScript**: https://www.typescriptlang.org/docs/
- **TailwindCSS**: https://tailwindcss.com/docs

### Ferramentas Úteis

- **VS Code Extensions**:
  - Python
  - Django
  - ESLint
  - Prettier
  - Docker
  - GitLens

- **Chrome Extensions**:
  - React DevTools
  - Redux DevTools (se usar)

---

## ✅ CHECKLIST PRÉ-INÍCIO

Antes de começar o Sprint 1:

- [ ] Li o IMPLEMENTATION_PLAN.md completo
- [ ] Li o CHECKLIST.md do Sprint 1
- [ ] Ambiente de desenvolvimento funcionando
- [ ] Entendi a arquitetura do projeto
- [ ] Configurei Git corretamente
- [ ] Criei branch sprint-1
- [ ] Sei onde pedir ajuda se travar

---

## 🚀 ESTÁ PRONTO PARA COMEÇAR?

**Comando para começar:**

```bash
# 1. Garantir que está tudo atualizado
git checkout main
git pull origin main

# 2. Criar branch
git checkout -b sprint-1/correcoes-criticas

# 3. Abrir VS Code
code .

# 4. Abrir CHECKLIST.md lado a lado com código

# 5. Começar pela CORR-001 (mais fácil)
```

---

**💪 Você consegue! Vamos fazer acontecer!**

Lembre-se: progresso > perfeição. Vamos iterar e melhorar continuamente.

Qualquer dúvida, consulte:
- `IMPLEMENTATION_PLAN.md` - Visão geral
- `CHECKLIST.md` - Tarefas detalhadas
- `DOCUMENTACAO.md` - Arquitetura técnica
- `README.md` - Setup e deploy
