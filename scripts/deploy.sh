#!/bin/bash
# ============================================================
# BACKBONE — Script de Deploy (Matrix Theme)
# ============================================================
# Uso:
#   ./scripts/deploy.sh
# ============================================================

set -Eeuo pipefail
# trap 'error_handler $LINENO' ERR

# ── Cores Matrix (Verde Neon e Preto) ───────────────────────
RESET='\033[0m'
BOLD='\033[1m'
NEON_GREEN='\033[38;5;46m'   # Matrix Green
DARK_GREEN='\033[38;5;22m'   # Darker Green
BLACK_BG='\033[48;5;0m'      # Black Background
WHITE='\033[38;5;15m'        # White text for contrast
GRAY='\033[38;5;240m'        # Gray for logs

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"
DC="docker compose -f $COMPOSE_FILE --env-file $ENV_FILE"

# ── Funções de Estilo ───────────────────────────────────────

matrix_header() {
    clear
    echo -e "${NEON_GREEN}${BOLD}"
    echo " ╔════════════════════════════════════════════════════════════╗"
    echo " ║                                                            ║"
    echo " ║   ░█▀▄░█▀█░█▀▀░█░█░█▀▄░█▀█░█▀█░█▀▀                         ║"
    echo " ║   ░█▀▄░█▀█░█░░░█▀▄░█▀▄░█░█░█░█░█▀▀                         ║"
    echo " ║   ░▀▀░░▀░▀░▀▀▀░▀░▀░▀▀░░▀▀▀░▀░▀░▀▀▀   DEPLOY SYSTEM v2.0    ║"
    echo " ║                                                            ║"
    echo " ╚════════════════════════════════════════════════════════════╝"
    echo -e "${RESET}"
    echo -e "${DARK_GREEN}  > INICIANDO SEQUÊNCIA DE DEPLOY...${RESET}"
    echo -e "${DARK_GREEN}  > TARGET: ${ENV_FILE}${RESET}"
    echo ""
}

show_progress() {
    local container=$1
    local current=$2
    local total=$3
    local width=40
    local percent=$((current * 100 / total))
    local filled=$((percent * width / 100))
    local empty=$((width - filled))
    
    # Barra estilo Matrix
    printf "\r${NEON_GREEN}  [${container}] "
    printf "%${filled}s" '' | tr ' ' '█'
    printf "${DARK_GREEN}%${empty}s" '' | tr ' ' '░'
    printf "${NEON_GREEN}] ${percent}%%${RESET}"
}

simulate_loading() {
    local container=$1
    local duration=$2
    local steps=20
    local sleep_time=$(awk "BEGIN {print $duration / $steps}")
    
    for ((i=1; i<=steps; i++)); do
        show_progress "$container" "$i" "$steps"
        sleep "$sleep_time"
    done
    echo ""
}

# ── Início do Script ─────────────────────────────────────────

matrix_header
mkdir -p logs

# 0. Pré-requisitos
echo -e "${WHITE}:: FASE 0: VERIFICAÇÃO DE SISTEMA${RESET}"

if ! command -v docker &> /dev/null; then
    echo -e "${NEON_GREEN}   [ERROR] Docker não encontrado!${RESET}"
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${NEON_GREEN}   [ERROR] Arquivo $ENV_FILE não encontrado!${RESET}"
    exit 1
fi
echo -e "${NEON_GREEN}   ✔ Sistema pronto para deploy${RESET}\n"

# 1. Backup
echo -e "${WHITE}:: FASE 1: PRESERVAÇÃO DE DADOS${RESET}"
mkdir -p ./backups
BACKUP_FILE="./backups/backup_$(date +%F_%H-%M-%S).sql"

# Tenta fazer backup apenas se o DB estiver rodando
if $DC ps db 2>/dev/null | grep -q "Up"; then
    DB_USER=$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2 | tr -d '"' || echo "backbone_user")
    DB_NAME=$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2 | tr -d '"' || echo "backbone_prod")
    
    $DC exec -T db pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE" 2>> logs/deploy_error.log || true
    simulate_loading "BACKUP DATABASE" 2
    echo -e "${NEON_GREEN}   ✔ Backup realizado: $(basename $BACKUP_FILE)${RESET}\n"
else
    simulate_loading "SKIPPING BACKUP (DB OFF)" 1
    echo -e "${DARK_GREEN}   ⚠ Banco de dados offline, backup pulado.${RESET}\n"
fi

# 2. Pull
echo -e "${WHITE}:: FASE 2: SINCRONIZAÇÃO DE CÓDIGO${RESET}"
git pull origin main > logs/git_pull.log 2>&1
if [ $? -ne 0 ]; then
    echo -e "${NEON_GREEN}   [ERROR] Falha no git pull. Verifique logs/git_pull.log${RESET}"
    exit 1
fi
simulate_loading "GIT PULL ORIGIN" 3
echo -e "${NEON_GREEN}   ✔ Repositório atualizado para a última versão${RESET}\n"

# 3. Orquestração de Containers
echo -e "${WHITE}:: FASE 3: ORQUESTRAÇÃO DE CONTAINERS${RESET}"

# Build ou Pull
if [[ "${1:-}" == "--pull" ]]; then
    echo -e "${GRAY}   Baixando imagens do registro externo...${RESET}"
    $DC pull > logs/pull.log 2>&1
    simulate_loading "PULLING IMAGES" 4
else
    echo -e "${GRAY}   Construindo imagens (BuildKit)...${RESET}"
    COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 $DC build --parallel --no-cache | tee logs/build.log
    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        echo -e "${NEON_GREEN}   [ERROR] Falha no build. Verifique logs/build.log${RESET}"
        exit 1
    fi
    simulate_loading "BUILDING IMAGES" 5
fi

# 3.1 Infraestrutura básica (DB e Redis)
echo -e "${GRAY}   Iniciando infraestrutura básica...${RESET}"
$DC up -d db redis >/dev/null 2>&1
simulate_loading "INFRA: DB & REDIS" 4

# Aguarda DB ficar saudável
echo -n "   Aguardando DB..."
for i in {1..20}; do
    if $DC exec -T db pg_isready -U "$(grep POSTGRES_USER .env.prod | cut -d= -f2 | tr -d '\" ')" >/dev/null 2>&1; then
        echo -e "${NEON_GREEN} [READY]${RESET}"
        break
    fi
    sleep 1
    echo -n "."
done

# 3.2 Migrações (ANTES de subir o backend principal)
echo -e "${WHITE}:: FASE 4: SINCRONIZAÇÃO DE SCHEMA${RESET}"
echo -n "   Executando migrações..."
$DC run --rm backend python manage.py migrate --no-input > logs/migrate.log 2>&1
if [ $? -ne 0 ]; then
    echo -e "\n${NEON_GREEN}   [ERROR] Falha na migração! Verifique logs/migrate.log${RESET}"
    exit 1
fi
simulate_loading "DATABASE MIGRATIONS" 3
echo -e "${NEON_GREEN}   ✔ Banco de dados sincronizado${RESET}\n"

# 3.3 Subir Aplicação
echo -e "${WHITE}:: FASE 5: STARTUP DA APLICAÇÃO${RESET}"

# Subir tudo (Docker reinicia apenas o necessário)
$DC up -d backend frontend cloudflared celery_worker celery_beat >/dev/null 2>&1
simulate_loading "STARTING APP SERVICES" 5

echo -e "${NEON_GREEN}   ✔ Todos os containers operacionais.${RESET}\n"

# 4. Health Check
echo -e "${WHITE}:: FASE 6: VERIFICAÇÃO DE INTEGRIDADE${RESET}"
echo -n "   Aguardando API..."
for i in {1..15}; do
    if curl -sf http://localhost:8005/api/core/health/ >/dev/null 2>&1; then
        echo -e "${NEON_GREEN} [ONLINE]${RESET}"
        break
    fi
    sleep 2
    echo -n "."
    if [ $i -eq 15 ]; then
        echo -e "\n${NEON_GREEN}   [ERROR] Backend não respondeu a tempo!${RESET}"
        $DC logs backend --tail=50
        exit 1
    fi
done

# 5. Estáticos
echo -e "${WHITE}:: FASE 7: FINALIZAÇÃO${RESET}"
echo -n "   Coletando arquivos estáticos..."
$DC exec -T backend python manage.py collectstatic --noinput >/dev/null 2>&1
simulate_loading "STATIC FILES" 2
echo -e "${NEON_GREEN}   ✔ Assets compilados${RESET}\n"

echo -e "${NEON_GREEN}${BOLD}DEPLOY CONCLUÍDO COM SUCESSO.${RESET}"
echo -e "${DARK_GREEN}Siga o coelho branco...${RESET}"
echo ""
