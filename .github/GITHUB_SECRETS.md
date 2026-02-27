# GitHub Secrets — Configuração para CI/CD

Acesse: **Settings → Secrets and variables → Actions** no repositório do GitHub.

---

## Secrets obrigatórios para Deploy (`deploy.yml`)

| Secret | Descrição | Como obter |
|--------|-----------|------------|
| `DEPLOY_HOST` | IP ou hostname do servidor de produção | Painel do seu VPS/servidor |
| `DEPLOY_USER` | Usuário SSH (ex: `backbone`, `ubuntu`, `root`) | Configurado no servidor |
| `DEPLOY_SSH_KEY` | Chave SSH privada (conteúdo do `~/.ssh/id_ed25519`) | `cat ~/.ssh/id_ed25519` |
| `DEPLOY_PORT` | Porta SSH (opcional, padrão: `22`) | `/etc/ssh/sshd_config` |
| `DEPLOY_PATH` | Caminho do projeto no servidor (ex: `/opt/backbone`) | Onde você fez o `git clone` |

### Gerar par de chaves SSH para deploy

```bash
# No seu computador local:
ssh-keygen -t ed25519 -C "backbone-github-deploy" -f ~/.ssh/backbone_deploy

# Copiar chave pública para o servidor:
ssh-copy-id -i ~/.ssh/backbone_deploy.pub usuario@seu-servidor

# O valor de DEPLOY_SSH_KEY é o conteúdo da chave PRIVADA:
cat ~/.ssh/backbone_deploy
```

---

## Secrets para E2E Tests (opcionais)

| Secret | Descrição |
|--------|-----------|
| `E2E_USERNAME` | Usuário de teste no banco de dados |
| `E2E_PASSWORD` | Senha do usuário de teste |
| `E2E_COMPANY_SLUG` | Slug da empresa de teste |

---

## Environment protection (recomendado)

Configure o environment `production` com reviewer obrigatório:

1. Acesse **Settings → Environments → New environment**
2. Nome: `production`
3. Marque **Required reviewers** e adicione você mesmo
4. Isso garante que o deploy só acontece após aprovação manual

---

## Checklist pré-primeiro-deploy

- [ ] Servidor tem Docker e Docker Compose instalados
- [ ] Repositório foi clonado em `DEPLOY_PATH`
- [ ] Arquivo `.env.prod` existe em `DEPLOY_PATH` com todos os valores
- [ ] `docker compose -f docker-compose.prod.yml up -d` já foi executado manualmente ao menos uma vez
- [ ] `python manage.py migrate_smtp_passwords` foi executado (se havia senhas SMTP)
- [ ] Migrations `0010` e `0012` foram aplicadas com backup anterior
