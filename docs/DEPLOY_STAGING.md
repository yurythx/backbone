# Deploy em Staging (Guia Prático)

Este guia descreve como realizar o deployment da versão **SaaS Validation** em um servidor de homologação (Staging).

## Pré-requisitos
*   Servidor Ubuntu 22.04+ (Recomendado: 4GB RAM, 2 vCPU)
*   Docker & Docker Compose instalados
*   Domínio apontado para o IP do servidor (ex: `staging.backbone.io`)
*   Git instalado

## 1. Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto no servidor com os seguintes valores (ajuste conforme necessário):

```env
# Database
POSTGRES_DB=backbone_staging
POSTGRES_USER=staging_user
POSTGRES_PASSWORD=staging_secure_pass

# Django
DEBUG=False
SECRET_KEY=sua-chave-secreta-muito-segura-gerada-com-openssl
ALLOWED_HOSTS=staging.backbone.io,localhost
CORS_ALLOWED_ORIGINS=https://staging.backbone.io

# MinIO (Uploads)
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=admin_password
AWS_ACCESS_KEY_ID=admin
AWS_SECRET_ACCESS_KEY=admin_password
AWS_STORAGE_BUCKET_NAME=backbone-media
AWS_S3_ENDPOINT_URL=https://staging.backbone.io/minio  # Ajustar Nginx se exposto

# Frontend
NEXT_PUBLIC_API_URL=https://staging.backbone.io
```

## 2. Deploy Inicial (Cold Start)
Execute o script de deploy incluso:

```bash
chmod +x deploy.sh
./deploy.sh
```

O script fará:
1.  `git pull`: Baixa código atualizado.
2.  `docker-compose build`: Reconstrói imagens otimizadas.
3.  `migrate`: Aplica migrações no banco.
4.  `collectstatic`: Reúne arquivos CSS/JS para o Nginx servir.

## 3. SSL (HTTPS)
O `docker-compose.prod.yml` espera certificados em `./nginx/ssl`.
Para ambiente de staging rápido, você pode usar **Certbot** na máquina host proxying para o container, ou configurar o Certbot dentro do container Nginx (mais complexo).

**Sugestão (Manual Rápido):**
1.  Instale Nginx na máquina host.
2.  Use Certbot para gerar SSL na host.
3.  Configure Proxy Pass para `localhost:80` (onde o docker escuta).

## 4. Verificação
Acesse `https://staging.backbone.io/admin` e verifique se o login funciona.
Acesse `https://staging.backbone.io/health/` para ver o status do backend.
