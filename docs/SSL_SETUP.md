# SSL/HTTPS Setup for Backbone SaaS

Este guia explica como configurar SSL/HTTPS em produção usando Let's Encrypt.

## 🔐 Pré-requisitos

1. **Domínio configurado**: Aponte seu domínio para o servidor
   - Crie registro A apontando para o IP do servidor
   - Exemplo: `yourdomain.com` → `123.456.789.0`

2. **Portas abertas no firewall**:
   ```bash
   # Permitir HTTP e HTTPS
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw reload
   ```

3. **Docker e Docker Compose instalados**

## 📝 Passo a Passo

### 1. Atualizar Configuração do Nginx

Edite `nginx/nginx.conf` e substitua `yourdomain.com` pelo seu domínio real:

```bash
# Procure por:
server_name yourdomain.com www.yourdomain.com;

# Substitua por:
server_name seudominio.com www.seudominio.com;
```

### 2. Obter Certificado SSL com Certbot

#### Opção A: Usando Certbot no host (Recomendado)

```bash
# Instalar Certbot
sudo apt update
sudo apt install certbot

# Parar nginx se estiver rodando
docker-compose -f docker-compose.prod.yml down nginx

# Obter certificado
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email your@email.com \
  --agree-tos \
  --no-eff-email

# Certificados estarão em:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

#### Opção B: Usando Docker com Certbot

```bash
# Criar diretório para certificados
mkdir -p nginx/ssl
mkdir -p nginx/certbot

# Rodar certbot container
docker run -it --rm \
  -v $(pwd)/nginx/ssl:/etc/letsencrypt \
  -v $(pwd)/nginx/certbot:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email your@email.com \
  --agree-tos \
  --no-eff-email
```

### 3. Copiar Certificados para o Projeto

Se usou Opção A (Certbot no host):

```bash
# Criar diretório SSL
mkdir -p nginx/ssl

# Copiar certificados
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Ajustar permissões
sudo chmod 644 nginx/ssl/fullchain.pem
sudo chmod 600 nginx/ssl/privkey.pem
```

### 4. Configurar Variáveis de Ambiente

Edite `.env.prod`:

```bash
# Domain
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# CORS
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Frontend
NEXT_PUBLIC_API_URL=https://yourdomain.com/api

# Security
DEBUG=False
SECRET_KEY=your-super-secret-key-here  # Generate a new one!
```

### 5. Iniciar em Produção

```bash
# Build e start
docker-compose -f docker-compose.prod.yml up -d --build

# Verificar logs
docker-compose -f docker-compose.prod.yml logs -f nginx

# Testar SSL
curl -I https://yourdomain.com
```

### 6. Renovação Automática (Importante!)

Let's Encrypt certificados expiram em 90 dias. Configure renovação automática:

#### Criar script de renovação

```bash
# Criar arquivo: scripts/renew-ssl.sh
#!/bin/bash
certbot renew --quiet --deploy-hook "docker-compose -f /path/to/docker-compose.prod.yml restart nginx"
```

#### Adicionar ao cron

```bash
# Editar crontab
crontab -e

# Adicionar linha (roda todo dia às 2:00 AM)
0 2 * * * /path/to/scripts/renew-ssl.sh
```

## 🔒 Hardening de Segurança

### 1. Ativar HSTS

Depois de confirmar que SSL está funcionando, descomente em `nginx/nginx.conf`:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 2. Testar Configuração SSL

```bash
# SSL Labs Test
https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com

# Mozilla Observatory
https://observatory.mozilla.org/
```

### 3. Atualizar CSP (Content Security Policy)

Ajuste conforme suas necessidades em `nginx/nginx.conf`:

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
```

## 🧪 Testes

### Verificar certificado

```bash
# Ver informações do certificado
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Verificar expiração
echo | openssl s_client -connect yourdomain.com:443 -servername yourdomain.com 2>/dev/null | openssl x509 -noout -dates
```

### Verificar headers de segurança

```bash
curl -I https://yourdomain.com | grep -i "strict-transport-security\|x-frame-options\|x-content-type-options"
```

### Testar redirect HTTP → HTTPS

```bash
curl -I http://yourdomain.com
# Deve retornar: HTTP/1.1 301 Moved Permanently
# Location: https://yourdomain.com/
```

## 📊 Monitoramento

### Logs do Nginx

```bash
# Access log
docker-compose -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/access.log

# Error log
docker-compose -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/error.log
```

### Health Check

```bash
# Backend
curl https://yourdomain.com/health/

# SSL status
curl -I https://yourdomain.com
```

## ⚠️ Troubleshooting

### Certificado não encontrado

```bash
# Verificar se certificados existem
ls -la nginx/ssl/

# Se não existirem, rodar certbot novamente
```

### Nginx não inicia

```bash
# Testar configuração
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# Ver logs detalhados
docker-compose -f docker-compose.prod.yml logs nginx
```

### "Too many redirects"

Verifique se o proxy está passando os headers corretos:
```nginx
proxy_set_header X-Forwarded-Proto $scheme;
```

## 📚 Referências

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Security Headers Reference](https://securityheaders.com/)

---

## ✅ Checklist de Produção

- [ ] Domínio configurado e apontando para servidor
- [ ] Portas 80 e 443 abertas no firewall
- [ ] Certificado SSL obtido e instalado
- [ ] Nginx configurado com domínio correto
- [ ] Variáveis de ambiente atualizadas
- [ ] DEBUG=False em produção
- [ ] SECRET_KEY única e forte
- [ ] ALLOWED_HOSTS configurado
- [ ] CORS_ALLOWED_ORIGINS configurado
- [ ] Renovação automática de SSL configurada
- [ ] HSTS ativado
- [ ] Headers de segurança testados
- [ ] SSL testado (SSL Labs A+)
- [ ] Redirect HTTP → HTTPS funcionando
- [ ] Logs configurados e monitorados

---

**🎉 Parabêns! Seu Backbone SaaS está rodando com SSL/HTTPS em produção!**
