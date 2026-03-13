#!/bin/bash
# =============================================================================
# MENDLY/KHUNJIT SERVER SETUP SCRIPT
# =============================================================================
# Run this ONCE on the production server to set up the environment
# Usage: ssh root@68.178.172.92 'bash -s' < scripts/setup-server.sh
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  KHUNJIT SERVER SETUP SCRIPT${NC}"
echo -e "${GREEN}=========================================${NC}"

# Step 1: Update system
echo -e "\n${YELLOW}Step 1: Updating system packages...${NC}"
apt update && apt upgrade -y

# Step 2: Install Node.js 20.x
echo -e "\n${YELLOW}Step 2: Installing Node.js 20.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
echo -e "Node version: $(node --version)"
echo -e "NPM version: $(npm --version)"

# Step 3: Install PM2 globally
echo -e "\n${YELLOW}Step 3: Installing PM2...${NC}"
npm install -g pm2

# Step 4: Install PostgreSQL
echo -e "\n${YELLOW}Step 4: Setting up PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
fi

# Start PostgreSQL
systemctl enable postgresql
systemctl start postgresql

# Create database and user
echo -e "\n${YELLOW}Creating database and user...${NC}"
sudo -u postgres psql << 'ENDSQL'
-- Create user (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'khunjit_user') THEN
        CREATE USER khunjit_user WITH PASSWORD 'CHANGE_THIS_PASSWORD';
    END IF;
END
$$;

-- Create database (if not exists)
SELECT 'CREATE DATABASE khunjit OWNER khunjit_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'khunjit')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE khunjit TO khunjit_user;
ENDSQL

echo -e "${GREEN}✓ PostgreSQL configured${NC}"

# Step 5: Create application directory
echo -e "\n${YELLOW}Step 5: Creating application directory...${NC}"
mkdir -p /var/www/khunjit
mkdir -p /var/www/khunjit/uploads
chown -R www-data:www-data /var/www/khunjit

# Step 6: Configure firewall (if ufw is available)
echo -e "\n${YELLOW}Step 6: Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp    # SSH
    ufw allow 80/tcp    # HTTP
    ufw allow 443/tcp   # HTTPS
    # Note: Port 5055 is internal only, accessed via reverse proxy
fi

# Step 7: Set up PM2 to start on boot
echo -e "\n${YELLOW}Step 7: Configuring PM2 startup...${NC}"
pm2 startup systemd -u root --hp /root
pm2 save

echo -e "\n${GREEN}=========================================${NC}"
echo -e "${GREEN}  SERVER SETUP COMPLETED!${NC}"
echo -e "${GREEN}=========================================${NC}"

echo -e "\n${YELLOW}NEXT STEPS:${NC}"
echo -e "1. Update PostgreSQL password in database"
echo -e "   sudo -u postgres psql -c \"ALTER USER khunjit_user PASSWORD 'YOUR_SECURE_PASSWORD';\""
echo -e ""
echo -e "2. Copy .env.production to server and rename to .env"
echo -e "   scp .env.production root@68.178.172.92:/var/www/khunjit/.env"
echo -e ""
echo -e "3. Update DATABASE_URL in .env with the new password"
echo -e ""
echo -e "4. Configure Plesk/Apache reverse proxy to port 5055"
echo -e ""
echo -e "5. Run the deploy script from your Mac:"
echo -e "   ./scripts/deploy.sh"
