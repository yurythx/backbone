#!/bin/bash
# ============================================================
# BACKBONE — Script de Deploy (Cloudflare Tunnel)
# ============================================================
# Uso:
#   ./scripts/deploy.sh
#
# Variáveis de controle:
#   SKIP_BACKUP=1   — pula o backup antes do deploy
#   SKIP_SEED=1     — pula os seeds de dados
#   COMPOSE_FILE=docker-compose.prod.yml  (padrão)
# ============================================================

set -Eeuo pipefail
trap 'echo -e "\033[0;31mErro na linha $LINENO. Abortando.\033[0m"' ERR

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.prod}"

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Backbone — Deploy para Produção    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"

# ── Verificar Docker Compose ──────────────────────────────────
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
else
  echo -e "${RED}[ERRO] Docker Compose não encontrado. Instale docker compose v2.${NC}"
  exit 1
fi

# ── Verificar arquivos obrigatórios ───────────────────────────
if [ ! -f "$COMPOSE_FILE" ]; then
  echo -e "${RED}[ERRO] Compose file '$COMPOSE_FILE' não encontrado.${NC}"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}[ERRO] Arquivo '$ENV_FILE' não encontrado.${NC}"
  echo -e "${YELLOW}Crie-o com: cp .env.prod.example .env.prod${NC}"
  exit 1
fi

# Validar sintaxe do compose
"${COMPOSE_CMD[@]}" config >/dev/null

# ── Validação de Variáveis Críticas ───────────────────────────
REDIS_URL=$(grep -E '^REDIS_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' || echo "")
if [[ -n "$REDIS_URL" && "$REDIS_URL" == *"@redis"* && "$REDIS_URL" != *":@redis"* ]]; then
  if [[ "$REDIS_URL" != *":http"* && "$REDIS_URL" != *"redis://:"* ]]; then
    echo -e "${REDI}[AVISO] Sua REDIS_URL parece estar sem o ':' antes da senha.${NC}"
    echo -e "${YELLOW}O formato correto é: redis://:SENHA@redis:6379/0${NC}"
  fi
fi

# ── Passo 0: Backup ───────────────────────────────────────────
BACKUP_FILE="./backups/backup_$(date +%F_%H-%M-%S).sql"
mkdir -p ./backups

if [ "${SKIP_BACKUP:-0}" != "1" ]; then
  echo -e "${YELLOW}[Passo 0] Criando backup do banco em ${BACKUP_FILE}...${NC}"
  DB_RUNNING=$("${COMPOSE_CMD[@]}" ps -q db 2>/dev/null || echo "")
  if [ -n "$DB_RUNNING" ]; then
    # Obtém usuário e banco do .env.prod
    DB_USER=$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2 | tr -d '"' || echo "backbone_user")
    DB_NAME=$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2 | tr -d '"' || echo "backbone_prod")
    "${COMPOSE_CMD[@]}" exec -T db pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE" || true
    echo -e "${GREEN}✓ Backup concluído: ${BACKUP_FILE}${NC}"
  else
    echo -e "${YELLOW}⚠ Banco não está rodando. Pulando backup.${NC}"
  fi
else
  echo -e "${YELLOW}⚠ Backup pulado (SKIP_BACKUP=1).${NC}"
fi

# ── Passo 1: Pull do código ───────────────────────────────────
echo -e "${BLUE}[Passo 1] Puxando código mais recente do Git...${NC}"
git pull origin main

# ── Passo 2: Build e (re)start ────────────────────────────────
echo -e "${BLUE}[Passo 2] Build e start dos containers...${NC}"
"${COMPOSE_CMD[@]}" build --no-cache backend frontend

echo -e "${YELLOW}[Ajuste] Corrigindo permissões de volumes (pode pedir senha sudo)...${NC}"
# Criar pastas se não existirem
mkdir -p ./staticfiles ./media ./backups
# Forçar permissão 1000 (usuário app do container)
sudo chown -R 1000:1000 ./staticfiles ./media ./backups 2>/dev/null || echo "Aviso: Não foi possível mudar dono via sudo, tentando chmod..."
sudo chmod -R 775 ./staticfiles ./media ./backups 2>/dev/null || chmod -R 775 ./staticfiles ./media ./backups || true

"${COMPOSE_CMD[@]}" up -d --remove-orphans

# ── Passo 3: Migrações e static ───────────────────────────────
echo -e "${BLUE}[Passo 3] Aguardando backend ficar saudável...${NC}"
for i in $(seq 1 30); do
  if curl -sf http://localhost:8005/api/core/health/ >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend pronto!${NC}"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo -e "${RED}[ERRO] Backend não ficou saudável após 60s. Verifique os logs:${NC}"
    echo -e "  docker compose -f $COMPOSE_FILE logs backend --tail=50"
    exit 1
  fi
  echo "  aguardando... ($i/30)"
  sleep 2
done

echo -e "${BLUE}[Passo 3.1] Rodando migrações...${NC}"
"${COMPOSE_CMD[@]}" exec -T backend python manage.py migrate --noinput || "${COMPOSE_CMD[@]}" exec -T backend python manage.py migrate --noinput --fake-initial

echo -e "${BLUE}[Passo 3.2] Coletando arquivos estáticos...${NC}"
"${COMPOSE_CMD[@]}" exec -T backend python manage.py collectstatic --noinput

echo -e "${BLUE}[Passo 3.3] Verificações de deploy do Django...${NC}"
"${COMPOSE_CMD[@]}" exec -T backend python manage.py check --deploy || true

# ── Passo 4: Seeds ────────────────────────────────────────────
if [ "${SKIP_SEED:-0}" != "1" ]; then
  echo -e "${BLUE}[Passo 4] Seedando dados iniciais...${NC}"
  "${COMPOSE_CMD[@]}" exec -T backend python manage.py seed_system || true
  "${COMPOSE_CMD[@]}" exec -T backend python manage.py seed_cms    || true
  "${COMPOSE_CMD[@]}" exec -T backend python manage.py seed_pages  || true
  echo -e "${GREEN}✓ Seeds concluídos.${NC}"
else
  echo -e "${YELLOW}⚠ Seeds pulados (SKIP_SEED=1).${NC}"
fi

# ── Passo 5: Limpeza de imagens antigas ───────────────────────
echo -e "${BLUE}[Passo 5] Limpando imagens Docker antigas...${NC}"
docker image prune -f

# ── Resumo ────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Deploy concluído com sucesso!    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "  Backend:  http://localhost:8005/api/core/health/"
echo -e "  Frontend: http://localhost:3005"
echo -e ""
echo -e "  Logs:     docker compose -f $COMPOSE_FILE logs -f"
echo -e "  Status:   docker compose -f $COMPOSE_FILE ps"
echo ""

exit 0
