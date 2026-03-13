# Mendly/KhunJit Deployment Guide

## Production Checklist

### 1. Pre-Deployment

- [ ] Update `.env.production` with correct values
- [ ] Generate new `SESSION_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Verify Stripe keys are in LIVE mode (sk_live_, pk_live_)
- [ ] Update SMTP password if needed

### 2. Server Setup (One-time)

```bash
# SSH into server
ssh root@68.178.172.92

# Run setup script (from your Mac)
ssh root@68.178.172.92 'bash -s' < scripts/setup-server.sh

# Or manually install:
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs postgresql postgresql-contrib
npm install -g pm2
```

### 3. Database Setup

```bash
# On server - set PostgreSQL password
sudo -u postgres psql -c "ALTER USER khunjit_user PASSWORD 'YOUR_SECURE_PASSWORD';"

# Push schema (from Mac after deploy)
ssh root@68.178.172.92 "cd /var/www/khunjit && npm run db:push"
```

### 4. Environment File

```bash
# Copy production env to server
scp .env.production root@68.178.172.92:/var/www/khunjit/.env

# Edit on server to update passwords
ssh root@68.178.172.92 "nano /var/www/khunjit/.env"
```

### 5. Plesk Configuration

Since the server uses Plesk with Apache, configure reverse proxy via Plesk panel:

1. **Login to Plesk** (https://68.178.172.92:8443)

2. **Add Domain** (if not already added):
   - Add `khunjit.com` domain
   - Add `api.khunjit.com` subdomain

3. **Configure Apache Reverse Proxy**:

   For `api.khunjit.com` (or main domain):
   - Go to: Domains > khunjit.com > Apache & nginx Settings
   - In "Additional Apache directives" add:

```apache
# Reverse proxy to Node.js backend
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:5055/
ProxyPassReverse / http://127.0.0.1:5055/

# WebSocket support
RewriteEngine On
RewriteCond %{HTTP:Upgrade} websocket [NC]
RewriteCond %{HTTP:Connection} upgrade [NC]
RewriteRule ^/?(.*) ws://127.0.0.1:5055/$1 [P,L]

# Timeout for long-running requests
ProxyTimeout 300

# Stripe webhook - ensure raw body
<Location /webhooks/stripe>
    ProxyPass http://127.0.0.1:5055/webhooks/stripe
    ProxyPassReverse http://127.0.0.1:5055/webhooks/stripe
</Location>
```

4. **SSL Certificate**:
   - Go to: Domains > khunjit.com > SSL/TLS Certificates
   - Use "Let's Encrypt" for free SSL
   - Enable for both `khunjit.com` and `api.khunjit.com`

### 6. Deploy Application

```bash
# Make deploy script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh
```

### 7. Start Application

```bash
# SSH to server
ssh root@68.178.172.92

# Navigate to app directory
cd /var/www/khunjit

# Start with PM2
pm2 start dist/index.cjs --name khunjit

# Save PM2 configuration
pm2 save

# View logs
pm2 logs khunjit
```

### 8. Stripe Webhook Configuration

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Endpoint URL: `https://api.khunjit.com/webhooks/stripe` (or `https://khunjit.com/webhooks/stripe`)
4. Select events:
   - `account.updated`
   - `capability.updated`
   - `account.application.deauthorized`
5. Copy the signing secret to `.env` as `STRIPE_WEBHOOK_SECRET`

### 9. DNS Configuration (GoDaddy)

If using api.khunjit.com subdomain:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 68.178.172.92 | 600 |
| A | api | 68.178.172.92 | 600 |
| A | www | 68.178.172.92 | 600 |

### 10. Verify Deployment

```bash
# Test API
curl https://khunjit.com/api/auth/me

# Test Stripe webhook
curl -X POST https://khunjit.com/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"ping":true}'
# Should return: {"ok":true,"message":"Pong! Webhook endpoint is working."}
```

---

## Troubleshooting

### Application not starting

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs khunjit --lines 100

# Restart
pm2 restart khunjit
```

### Database connection issues

```bash
# Test PostgreSQL connection
psql -U khunjit_user -h localhost -d khunjit

# Check if PostgreSQL is running
systemctl status postgresql
```

### 502 Bad Gateway

1. Check if Node.js app is running: `pm2 status`
2. Check if port 5055 is listening: `netstat -tlnp | grep 5055`
3. Check Apache error logs: `tail -f /var/log/apache2/error.log`

### Webhook 400/401 errors

1. Verify `STRIPE_WEBHOOK_SECRET` is correct
2. Ensure raw body is preserved (check Apache config)
3. Test with Stripe CLI: `stripe listen --forward-to localhost:5055/webhooks/stripe`

---

## Useful Commands

```bash
# View application logs
pm2 logs khunjit

# Restart application
pm2 restart khunjit

# Stop application
pm2 stop khunjit

# Database backup
pg_dump -U khunjit_user khunjit > backup_$(date +%Y%m%d).sql

# View disk usage
df -h

# View memory usage
free -m
```
