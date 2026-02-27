#!/bin/bash

set -Eeuo pipefail
trap 'echo -e "\033[0;31mError on line $LINENO. Aborting.\033[0m"' ERR

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

echo -e "${BLUE}Starting deployment for Backbone SaaS...${NC}"

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose -f "$COMPOSE_FILE")
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose -f "$COMPOSE_FILE")
else
  echo -e "${YELLOW}Docker Compose not found. Install docker compose v2 or docker-compose v1.${NC}"
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo -e "${YELLOW}Compose file '$COMPOSE_FILE' not found.${NC}"
  exit 1
fi

"${COMPOSE_CMD[@]}" config >/dev/null

BACKUP_FILE="./backups/backup_$(date +%F_%H-%M-%S).sql"
mkdir -p ./backups
if [ "${SKIP_BACKUP:-0}" != "1" ]; then
  echo -e "${YELLOW}Step 0: Creating database backup at ${BACKUP_FILE}...${NC}"
  if "${COMPOSE_CMD[@]}" ps -q db >/dev/null 2>&1 && [ -n "$("${COMPOSE_CMD[@]}" ps -q db)" ]; then
    "${COMPOSE_CMD[@]}" exec -T db pg_dump -U postgres backbone_db > "$BACKUP_FILE" || true
    echo -e "${GREEN}Backup step finished.${NC}"
  else
    echo -e "${YELLOW}DB service not running. Skipping backup.${NC}"
  fi
fi

echo -e "${BLUE}Step 1: Pulling latest changes from git...${NC}"
git pull origin main

echo -e "${BLUE}Step 2: Rebuilding images and starting containers...${NC}"
"${COMPOSE_CMD[@]}" pull
"${COMPOSE_CMD[@]}" up -d --build

echo -e "${BLUE}Step 3: Running backend migrations and collectstatic...${NC}"
"${COMPOSE_CMD[@]}" exec -T backend python manage.py migrate --noinput
"${COMPOSE_CMD[@]}" exec -T backend python manage.py collectstatic --noinput

echo -e "${BLUE}Step 3.0: Running Django deploy checks...${NC}"
"${COMPOSE_CMD[@]}" exec -T backend python manage.py check --deploy || true

echo -e "${BLUE}Step 3.1: Seeding System Data...${NC}"
if [ "${SKIP_SEED:-0}" != "1" ]; then
  "${COMPOSE_CMD[@]}" exec -T backend python manage.py seed_system || true
else
  echo -e "${YELLOW}Seeding skipped by SKIP_SEED=1.${NC}"
fi

echo -e "${BLUE}Step 3.2: Seeding Tenant Data...${NC}"
if [ "${SKIP_SEED:-0}" != "1" ]; then
  "${COMPOSE_CMD[@]}" exec -T backend python manage.py seed_cms || true
fi

echo -e "${BLUE}Step 3.3: Seeding Default Pages...${NC}"
if [ "${SKIP_SEED:-0}" != "1" ]; then
  "${COMPOSE_CMD[@]}" exec -T backend python manage.py seed_pages || true
fi

echo -e "${BLUE}Step 4: Cleaning up old docker images...${NC}"
docker image prune -f

echo -e "${GREEN}Deployment completed successfully!${NC}"
exit 0
