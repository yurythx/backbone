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
trap 'error_handler $LINENO' ERR

# ── Cores e Estilos ──────────────────────────────────────────
RESET='\033[0m'
BOLD='\033[1m'
RED='\033[38;5;196m'
GREEN='\033[38;5;46m'
YELLOW='\033[38;5;226m'
BLUE='\033[38;5;39m'
MAGENTA='\033[38;5;201m'
CYAN='\033[38;5;51m'
GRAY='\033[38;5;240m'
WHITE='\033[38;5;15m'

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.prod}"
LOG_FILE="./deploy_$(date +%F).log"
TOTAL_STEPS=6
CURRENT_STEP=0

# ── Funções Auxiliares ───────────────────────────────────────

# Banner inicial
show_banner() {
    clear
    echo -e "${MAGENTA}${BOLD}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                                                            ║"
    echo "║              🚀  BACKBONE DEPLOY SYSTEM  🚀                ║"
    echo "║                                                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${RESET}"
    echo -e "${GRAY}  📅 Data: $(date)${RESET}"
    echo -e "${GRAY}  📂 Ambiente: ${ENV_FILE}${RESET}"
    echo -e "${GRAY}  📝 Log: ${LOG_FILE}${RESET}"
    echo ""
}

# Barra de progresso
progress_bar() {
    local percent=$1
    local width=50
    local filled=$((percent * width / 100))
    local empty=$((width - filled))
    
    printf "\r${BLUE}["
    printf "%${filled}s" '' | tr ' ' '█'
    printf "%${empty}s" '' | tr ' ' '░'
    printf "] ${percent}%%${RESET}"
}

# Cabeçalho da etapa
step_header() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    local title="$1"
    local percent=$((CURRENT_STEP * 100 / TOTAL_STEPS))
    
    echo ""
    echo -e "${BOLD}${CYAN}▶ ETAPA ${CURRENT_STEP}/${TOTAL_STEPS}: ${title}${RESET}"
    progress_bar "$percent"
    echo ""
}

# Spinner de carregamento
spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Check de sucesso
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✔ Sucesso${RESET}"
    else
        echo -e "${RED}✘ Falha${RESET}"
        exit 1
    fi
}

error_handler() {
    echo -e "\n${RED}❌ Erro na linha $1. Abortando deploy.${RESET}"
    exit 1
}

# ── Início do Script ─────────────────────────────────────────

show_banner
exec > >(tee -a "${LOG_FILE}") 2>&1

# ── Verificar Docker Compose ──────────────────────────────────
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
else
  echo -e "${RED}[ERRO] Docker Compose não encontrado. Instale docker compose v2.${RESET}"
  exit 1
fi

# ── Verificar arquivos obrigatórios ───────────────────────────
if [ ! -f "$COMPOSE_FILE" ]; then
  echo -e "${RED}[ERRO] Compose file '$COMPOSE_FILE' não encontrado.${RESET}"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}[ERRO] Arquivo '$ENV_FILE' não encontrado.${RESET}"
  echo -e "${YELLOW}Crie-o com: cp .env.prod.example .env.prod${RESET}"
  exit 1
fi

# ── Passo 1: Backup ───────────────────────────────────────────
step_header "Backup do Banco de Dados"

BACKUP_FILE="./backups/backup_$(date +%F_%H-%M-%S).sql"
mkdir -p ./backups

if [ "${SKIP_BACKUP:-0}" != "1" ]; then
  echo -n "Criando backup em ${BACKUP_FILE}..."
  
  DB_RUNNING=$("${COMPOSE_CMD[@]}" ps -q db 2>/dev/null || echo "")
  if [ -n "$DB_RUNNING" ]; then
    DB_USER=$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2 | tr -d '"' || echo "backbone_user")
    DB_NAME=$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2 | tr -d '"' || echo "backbone_prod")
    "${COMPOSE_CMD[@]}" exec -T db pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE" || true
    check_status
  else
    echo -e "${YELLOW}⚠ Banco parado. Pulando.${RESET}"
  fi
else
  echo -e "${YELLOW}⚠ Backup pulado (SKIP_BACKUP=1).${RESET}"
fi

# ── Passo 2: Git Pull ─────────────────────────────────────────
step_header "Atualizando Código Fonte"

echo -n "Executando git pull origin main..."
git pull origin main >/dev/null 2>&1 &
spinner $!
check_status

# ── Passo 3: Build ────────────────────────────────────────────
step_header "Construindo Containers"

echo "Build e start dos containers (isso pode demorar)..."
"${COMPOSE_CMD[@]}" build --no-cache backend frontend >/dev/null 2>&1 &
spinner $!
check_status

echo -n "Ajustando permissões..."
mkdir -p ./staticfiles ./media ./backups
sudo chown -R 1000:1000 ./staticfiles ./media ./backups 2>/dev/null || true
sudo chmod -R 775 ./staticfiles ./media ./backups 2>/dev/null || true
check_status

echo -n "Reiniciando serviços..."
"${COMPOSE_CMD[@]}" up -d --remove-orphans >/dev/null 2>&1 &
spinner $!
check_status

# ── Passo 4: Health Check ─────────────────────────────────────
step_header "Verificando Saúde do Sistema"

echo "Aguardando backend iniciar..."
for i in $(seq 1 30); do
  printf "\rTentativa $i/30..."
  if curl -sf http://localhost:8005/api/core/health/ >/dev/null 2>&1; then
    echo -e "\n${GREEN}✔ Backend online!${RESET}"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo -e "\n${RED}✘ Backend não respondeu após 60s.${RESET}"
    exit 1
  fi
  sleep 2
done

# ── Passo 5: Migrações e Estáticos ────────────────────────────
step_header "Configuração do Django"

echo -n "Aplicando migrações..."
"${COMPOSE_CMD[@]}" exec -T backend python manage.py migrate --noinput >/dev/null 2>&1 || "${COMPOSE_CMD[@]}" exec -T backend python manage.py migrate --noinput --fake-initial >/dev/null 2>&1 &
spinner $!
check_status

echo -n "Coletando arquivos estáticos..."
"${COMPOSE_CMD[@]}" exec -T backend python manage.py collectstatic --noinput --clear >/dev/null 2>&1 &
spinner $!
check_status

echo -n "Verificações de segurança..."
"${COMPOSE_CMD[@]}" exec -T backend python manage.py check --deploy >/dev/null 2>&1 || true
check_status

# ── Passo 6: Seeds ────────────────────────────────────────────
step_header "Finalização e Seeds"

if [ "${SKIP_SEED:-0}" != "1" ]; then
  echo -n "Executando seeds..."
  (
    "${COMPOSE_CMD[@]}" exec -T backend python manage.py seed_system || true
    "${COMPOSE_CMD[@]}" exec -T backend python manage.py seed_cms    || true
    "${COMPOSE_CMD[@]}" exec -T backend python manage.py seed_pages  || true
    "${COMPOSE_CMD[@]}" exec -T backend python manage.py fix_production_domain || true
  ) >/dev/null 2>&1 &
  spinner $!
  check_status
else
  echo -e "${YELLOW}⚠ Seeds pulados.${RESET}"
fi

echo -n "Limpando imagens antigas..."
docker image prune -f >/dev/null 2>&1 &
spinner $!
check_status

# ── Resumo Final ──────────────────────────────────────────────
progress_bar 100
echo ""
echo ""
echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${GREEN}${BOLD}║           ✅  DEPLOY CONCLUÍDO COM SUCESSO!  ✅            ║${RESET}"
echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  🌍 Backend:  ${BLUE}http://localhost:8005/api/core/health/${RESET}"
echo -e "  💻 Frontend: ${BLUE}http://localhost:3005${RESET}"
echo -e "  📝 Log:      ${GRAY}${LOG_FILE}${RESET}"
echo ""
exit 0
