#!/bin/bash
# =============================================================================
# MENDLY/KHUNJIT DEPLOYMENT SCRIPT
# =============================================================================
# Usage: ./scripts/deploy.sh
# Run this from your LOCAL machine (Mac) to deploy to production server
# =============================================================================

set -e

# Configuration
REMOTE_USER="root"
REMOTE_HOST="68.178.172.92"
REMOTE_DIR="/var/www/khunjit"
LOCAL_DIR="$(dirname "$0")/.."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  MENDLY/KHUNJIT DEPLOYMENT SCRIPT${NC}"
echo -e "${GREEN}=========================================${NC}"

# Step 1: Build locally
echo -e "\n${YELLOW}Step 1: Building project locally...${NC}"
cd "$LOCAL_DIR"
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}ERROR: Build failed - dist directory not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build completed${NC}"

# Step 2: Create deployment package
echo -e "\n${YELLOW}Step 2: Creating deployment package...${NC}"
DEPLOY_ARCHIVE="/tmp/khunjit-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"

# Files/folders to include in deployment
tar -czf "$DEPLOY_ARCHIVE" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='*.log' \
    --exclude='.local' \
    --exclude='uploads/*' \
    --exclude='.claude' \
    dist \
    package.json \
    package-lock.json \
    drizzle.config.ts \
    shared \
    db \
    migrations \
    uploads

echo -e "${GREEN}✓ Archive created: $DEPLOY_ARCHIVE${NC}"

# Step 3: Upload to server
echo -e "\n${YELLOW}Step 3: Uploading to server...${NC}"
scp "$DEPLOY_ARCHIVE" "$REMOTE_USER@$REMOTE_HOST:/tmp/khunjit-deploy.tar.gz"
echo -e "${GREEN}✓ Upload completed${NC}"

# Step 4: Deploy on server
echo -e "\n${YELLOW}Step 4: Deploying on server...${NC}"
ssh "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'
set -e

DEPLOY_DIR="/var/www/khunjit"
BACKUP_DIR="/var/www/khunjit-backup-$(date +%Y%m%d-%H%M%S)"

# Create deployment directory if not exists
mkdir -p "$DEPLOY_DIR"

# Backup current deployment (if exists)
if [ -d "$DEPLOY_DIR/dist" ]; then
    echo "Creating backup..."
    cp -r "$DEPLOY_DIR" "$BACKUP_DIR"
fi

# Extract new deployment
cd "$DEPLOY_DIR"
tar -xzf /tmp/khunjit-deploy.tar.gz

# Install production dependencies
echo "Installing dependencies..."
npm ci --production

# Run database migrations (if any)
# npm run db:migrate

# Restart the application
echo "Restarting application..."
if command -v pm2 &> /dev/null; then
    pm2 restart khunjit || pm2 start dist/index.cjs --name khunjit
else
    echo "PM2 not found. Please install: npm install -g pm2"
    echo "Then run: pm2 start dist/index.cjs --name khunjit"
fi

# Cleanup
rm /tmp/khunjit-deploy.tar.gz

echo "Deployment completed!"
ENDSSH

echo -e "\n${GREEN}=========================================${NC}"
echo -e "${GREEN}  DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo -e "\nServer: https://khunjit.com"
echo -e "API: https://api.khunjit.com"
