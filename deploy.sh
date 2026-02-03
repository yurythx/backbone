#!/bin/bash

# Backbone SaaS Deployment Script
# Automated production deployment script

set -e # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting deployment for Backbone SaaS...${NC}"

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
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py populate_demo_data

# 4. Cleanup
echo -e "${BLUE}Step 4: Cleaning up old docker images...${NC}"
docker image prune -f

echo -e "${GREEN}Deployment completed successfully!${NC}"
