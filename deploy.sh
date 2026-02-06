#!/bin/bash

# Backbone SaaS Deployment Script
# Automated production deployment script

set -e # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting deployment for Backbone SaaS...${NC}"

# 0. Backup Database (Safety First)
BACKUP_FILE="./backups/backup_$(date +%F_%H-%M-%S).sql"
mkdir -p ./backups
echo -e "${YELLOW}Step 0: Creating database backup at ${BACKUP_FILE}...${NC}"
# Only run backup if the container is actually running
if [ "$(docker ps -q -f name=backbone_db)" ]; then
    docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U postgres backbone_db > "$BACKUP_FILE"
    echo -e "${GREEN}Backup created successfully!${NC}"
else
    echo -e "${YELLOW}Database container not running. Skipping backup (Clean start?).${NC}"
fi

# 1. Pull latest code
echo -e "${BLUE}Step 1: Pulling latest changes from git...${NC}"
git pull origin main

# 2. Rebuild and restart containers
echo -e "${BLUE}Step 2: Rebuilding images and starting containers...${NC}"
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --build

# 3. Backend tasks
echo -e "${BLUE}Step 3: Running backend migrations and collectstatic...${NC}"
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py migrate --noinput
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --noinput

# Seed CMS Data (Safe to run multiple times)
echo -e "${BLUE}Step 3.1: Seeding System Data (Features/Plans)...${NC}"
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py seed_system

echo -e "${BLUE}Step 3.2: Seeding Tenant Data (Categories/Tags)...${NC}"
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py seed_cms

# 4. Cleanup
echo -e "${BLUE}Step 4: Cleaning up old docker images...${NC}"
docker image prune -f

echo -e "${GREEN}Deployment completed successfully!${NC}"
exit 0
