# 📝 Guia de Deploy - Backbone SaaS com Cloudflare Tunnel

## 🎯 Visão Geral

Deploy simplificado do Backbone em produção usando **Cloudflare Tunnel** para SSL/HTTPS.

**Arquitetura**:
- ✅ Cloudflare Tunnel → Backend (8005) + Frontend (3005)
- ✅ WhiteNoise serve arquivos estáticos
- ✅ Sem Nginx (menos overhead!)

---

## 📋 Pré-requisitos

1. **Servidor Ubuntu 22.04 LTS**:
   - Docker & Docker Compose instalados
   - 2GB RAM mínimo (4GB recomendado)
   - 20GB disco

2. **Cloudflare Account**:
   - Domínio configurado no Cloudflare
   - Cloudflare Tunnel criado

3. **Variáveis de Ambiente**:
   - Copiar `.env.example` para `.env`
   - Configurar todas as variáveis obrigatórias

---

## 🚀 Passo 1: Configurar Cloudflare Tunnel

### 1.1 Instalar cloudflared

```bash
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### 1.2 Autenticar

```bash
cloudflared tunnel login
```

### 1.3 Criar Tunnel

```bash
cloudflared tunnel create backbone-prod
```

Anote o **Tunnel ID** gerado (ex: `abc123-def456-ghi789`).

### 1.4 Configurar DNS

No **Cloudflare Dashboard** → DNS → Add Record:

```
Type: CNAME
Name: @ (ou subdomain desejado)
Target: {TUNNEL_ID}.cfargotunnel.com
Proxied: Yes (ícone laranja ativado)
```

### 1.5 Criar arquivo de configuração

```bash
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

**Conteúdo** (substitua `seudominio.com` e `{TUNNEL_ID}`):

```yaml
tunnel: {TUNNEL_ID}
credentials-file: /root/.cloudflared/{TUNNEL_ID}.json

ingress:
  # Backend API
  - hostname: seudominio.com
    path: ^/api(/.*)?$
    service: http://localhost:8005
  
  # Django Admin
  - hostname: seudominio.com
    path: ^/admin(/.*)?$
    service: http://localhost:8005
  
  # WebSocket (Chat)
  - hostname: seudominio.com
    path: ^/ws(/.*)?$
    service: http://localhost:8005
  
  # Arquivos estáticos (WhiteNoise)
  - hostname: seudominio.com
    path: ^/static(/.*)?$
    service: http://localhost:8005
  
  # Media files
  - hostname: seudominio.com
    path: ^/media(/.*)?$
    service: http://localhost:8005
  
  # Health check
  - hostname: seudominio.com
    path: ^/health(/.*)?$
    service: http://localhost:8005
  
  # Frontend (Next.js) - catch-all
  - hostname: seudominio.com
    service: http://localhost:3005
  
  # Fallback 404
  - service: http_status:404
```

### 1.6 Instalar como Serviço

```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

### 1.7 Verificar Status

```bash
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -f
```

---

## 🐳 Passo 2: Deploy da Aplicação

### 2.1 Clonar Repositório

```bash
git clone https://github.com/seu-usuario/backbone.git
cd backbone
```

### 2.2 Configurar Variáveis de Ambiente

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

**Variáveis OBRIGATÓRIAS**:

```bash
# Django
DEBUG=False
SECRET_KEY=GERE_UM_SECRET_KEY_FORTE_AQUI_50_CARACTERES
ALLOWED_HOSTS=seudominio.com,www.seudominio.com
CSRF_TRUSTED_ORIGINS=https://seudominio.com,https://www.seudominio.com
CORS_ALLOWED_ORIGINS=https://seudominio.com

# Database
DATABASE_URL=postgres://postgres:SENHA_FORTE_AQUI@db:5432/backbone_db
POSTGRES_DB=backbone_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=SENHA_FORTE_AQUI

# Redis
REDIS_URL=redis://redis:6379/0

# MinIO
USE_S3=True
AWS_S3_ENDPOINT_URL=http://minio:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=SENHA_MINIO_FORTE_AQUI
AWS_STORAGE_BUCKET_NAME=backbone-media
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=SENHA_MINIO_FORTE_AQUI

# Frontend
NEXT_PUBLIC_API_URL=https://seudominio.com/api
```

> 💡 **Gerar SECRET_KEY**:
> ```bash
> docker-compose -f docker-compose.prod.yml run --rm backend python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
> ```

### 2.3 Build e Start

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

Aguarde ~5-10 minutos para o build completo.

### 2.4 Verificar Containers

```bash
docker-compose -f docker-compose.prod.yml ps
```

Todos devem estar **Up** e **healthy**.

### 2.5 Rodar Migrações

```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

### 2.6 Criar Superusuário

```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

### 2.7 Popular Dados Iniciais

```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py seed_plans
```

---

## ✅ Passo 3: Verificação

### 3.1 Health Check Local

```bash
curl http://localhost:8005/api/core/health/
```

Deve retornar:

```json
{
  "status": "healthy",
  "database": "ok",
  "redis": "ok",
  "minio": "ok"
}
```

### 3.2 Acessar pela Internet

- **Site**: https://seudominio.com
- **Admin**: https://seudominio.com/admin
- **API Docs**: https://seudominio.com/api/schema/swagger-ui/
- **Health**: https://seudominio.com/health/

---

## 📊 Monitoramento

### Logs em Tempo Real

```bash
# Todos os containers
docker-compose -f docker-compose.prod.yml logs -f

# Backend apenas
docker-compose -f docker-compose.prod.yml logs -f backend

# Cloudflare Tunnel
sudo journalctl -u cloudflared -f
```

### Status dos Serviços

```bash
# Docker
docker-compose -f docker-compose.prod.yml ps

# Cloudflare
sudo systemctl status cloudflared
```

---

## 🔄 Atualizações

### Atualizar Código

```bash
cd backbone
git pull origin main
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

### Restart Rápido

```bash
docker-compose -f docker-compose.prod.yml restart
```

---

## 🔐 Segurança

### Firewall (UFW)

```bash
# Permitir SSH
sudo ufw allow 22/tcp

# Negar tudo exceto SSH
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Ativar
sudo ufw enable
```

> ⚠️ **IMPORTANTE**: Não exponha portas 8005 e 3005 publicamente. Cloudflare Tunnel acessa via localhost.

### Headers de Segurança

WhiteNoise adiciona automaticamente:
- `X-Content-Type-Options: nosniff`
- Cache headers otimizados

Django settings já possui:
- `SECURE_BROWSER_XSS_FILTER`
- `X_FRAME_OPTIONS`
- CSP Middleware

### Rate Limiting

Configurado no backend:
- **Tenant**: 1000 requests/day
- **Anon**: 100 requests/day

Cloudflare adiciona:
- DDoS protection
- Bot detection
- WAF (Web Application Firewall)

---

## 🗄️ Backup

### Backup Manual do Banco

```bash
docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres backbone_db > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
cat backup_20260206.sql | docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres backbone_db
```

### Backup MinIO (Mídia)

```bash
docker-compose -f docker-compose.prod.yml exec minio mc mirror /data/backbone-media ./backup_media/
```

---

## 🆘 Troubleshooting

### Cloudflare não conecta

```bash
# Verificar logs
sudo journalctl -u cloudflared -n 50

# Restart
sudo systemctl restart cloudflared

# Info do tunnel
cloudflared tunnel info {TUNNEL_ID}
```

### 502 Bad Gateway

```bash
# Verificar se backend está rodando
docker-compose -f docker-compose.prod.yml ps backend

# Logs
docker-compose -f docker-compose.prod.yml logs backend --tail=100

# Restart
docker-compose -f docker-compose.prod.yml restart backend
```

### Banco de dados corrompido

```bash
# Acessar PostgreSQL
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -d backbone_db

# Verificar integridade
\dt  # Listar tabelas
SELECT COUNT(*) FROM core_company;  # Testar query
```

### Frontend não carrega

```bash
# Verificar logs
docker-compose -f docker-compose.prod.yml logs frontend

# Rebuild
docker-compose -f docker-compose.prod.yml up -d --build frontend
```

---

## 📞 Performance Tips

### 1. Habilitar Cloudflare Cache

No Cloudflare Dashboard → Caching:
- **Cache Level**: Standard
- **Browser Cache TTL**: Respect Existing Headers
- **Always Online**: On

### 2. Minify Assets

No Cloudflare Dashboard → Speed → Optimization:
- ✅ Auto Minify (HTML, CSS, JS)
- ✅ Brotli compression

### 3. Database Tuning

Para produção com tráfego alto, ajuste PostgreSQL:

```bash
# backend/docker-compose.prod.yml
db:
  environment:
    POSTGRES_SHARED_BUFFERS: 256MB
    POSTGRES_EFFECTIVE_CACHE_SIZE: 1GB
    POSTGRES_MAX_CONNECTIONS: 100
```

---

## 📚 Recursos

- **Cloudflare Tunnel Docs**: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **WhiteNoise Docs**: http://whitenoise.evans.io/
- **Django Deployment**: https://docs.djangoproject.com/en/4.2/howto/deployment/

---

**🎉 Pronto! Seu Backbone está rodando em produção de forma segura e otimizada!**
