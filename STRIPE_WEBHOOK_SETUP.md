# Stripe Webhook Kurulum Rehberi

## Neden 404 Hatası Alıyordunuz?

`khunjit.com` domaini şu an GoDaddy Website Builder'a yönleniyor, backend sunucunuza değil. Bu nedenle:

```
curl -X POST https://khunjit.com/webhooks/stripe
```

komutu backend'e ulaşamıyor ve GoDaddy'nin 404 sayfasını döndürüyor.

---

## Çözüm: API Subdomain Oluşturma (Önerilen)

### Seçenek 1: api.khunjit.com Subdomain (ÖNERİLEN)

Bu yöntemle ana domain (khunjit.com) GoDaddy'de kalır, API istekleri ayrı subdomain üzerinden backend'e gider.

#### Adım 1: DNS Kaydı Ekle

GoDaddy DNS yönetim panelinde:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | api | `BACKEND_SUNUCU_IP` | 600 |

> `BACKEND_SUNUCU_IP` yerine sunucunuzun gerçek IP adresini yazın.

#### Adım 2: SSL Sertifikası (Let's Encrypt)

Sunucunuzda:

```bash
# Certbot kurulu değilse
sudo apt install certbot python3-certbot-nginx

# Sertifika al
sudo certbot --nginx -d api.khunjit.com
```

#### Adım 3: Nginx Yapılandırması

`/etc/nginx/sites-available/api.khunjit.com` dosyası oluşturun:

```nginx
server {
    listen 80;
    server_name api.khunjit.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.khunjit.com;

    # SSL Sertifikaları (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.khunjit.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.khunjit.com/privkey.pem;

    # SSL Güvenlik Ayarları
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Stripe Webhook - Özel yapılandırma
    location /webhooks/stripe {
        proxy_pass http://127.0.0.1:5055;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Stripe signature için raw body korunmalı
        proxy_set_header Content-Type application/json;

        # Timeout ayarları
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Diğer API istekleri
    location / {
        proxy_pass http://127.0.0.1:5055;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # WebSocket için
        proxy_read_timeout 86400;
    }
}
```

Nginx'i etkinleştirin:

```bash
sudo ln -s /etc/nginx/sites-available/api.khunjit.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### Seçenek 2: Ana Domain'i Backend'e Taşıma (Riskli)

GoDaddy Website Builder'ı kapatıp tüm domain'i backend'e yönlendirme. Bu daha riskli çünkü:
- Mevcut web siteniz bozulabilir
- DNS propagasyonu sırasında downtime olabilir

---

## Stripe Dashboard Yapılandırması

### 1. Webhook Endpoint Ekle

1. [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks) adresine gidin
2. "Add endpoint" tıklayın
3. Endpoint URL: `https://api.khunjit.com/webhooks/stripe`
4. Events seçin:
   - `account.updated`
   - `capability.updated`
   - `account.application.deauthorized`
5. "Add endpoint" ile kaydedin

### 2. Webhook Secret'ı Kopyala

Webhook oluşturduktan sonra "Signing secret" bölümünden `whsec_...` ile başlayan secret'ı kopyalayın.

### 3. .env Dosyasını Güncelle

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

---

## Test Komutları

### 1. Ping Testi (DNS Doğrulama)

```bash
# Subdomain DNS kontrolü
dig api.khunjit.com

# Ping testi
curl -i -X POST https://api.khunjit.com/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"ping":true}'

# Beklenen cevap:
# HTTP/2 200
# {"ok":true,"message":"Pong! Webhook endpoint is working."}
```

### 2. Stripe CLI ile Test

```bash
# Stripe CLI kurulumu
brew install stripe/stripe-cli/stripe  # macOS
# veya
# https://stripe.com/docs/stripe-cli adresinden indirin

# Giriş yap
stripe login

# Webhook'u dinle (local test)
stripe listen --forward-to localhost:5055/webhooks/stripe

# Başka terminal'de event tetikle
stripe trigger account.updated
```

### 3. Production Test

Stripe Dashboard'da webhook endpoint'inize gidin ve "Send test webhook" butonuyla test edin.

---

## Sorun Giderme

### 404 Hatası Devam Ediyorsa

1. DNS propagasyonunu bekleyin (5-30 dakika)
2. DNS'i kontrol edin: `dig api.khunjit.com`
3. Nginx config syntax kontrolü: `sudo nginx -t`
4. Nginx logları: `sudo tail -f /var/log/nginx/error.log`

### 400 Bad Request (Signature Invalid)

1. `STRIPE_WEBHOOK_SECRET` doğru mu kontrol edin
2. Webhook secret'ı yeniden kopyalayın
3. Sunucuyu yeniden başlatın

### 500 Internal Server Error

1. Backend loglarını kontrol edin
2. Stripe API key'lerin doğru olduğunu kontrol edin
3. Database bağlantısını kontrol edin

---

## Plesk/Apache Kullananlar İçin

Eğer Nginx yerine Apache kullanıyorsanız:

```apache
<VirtualHost *:443>
    ServerName api.khunjit.com

    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/privkey.pem

    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:5055/
    ProxyPassReverse / http://127.0.0.1:5055/

    # Stripe webhook için timeout
    ProxyTimeout 60
</VirtualHost>
```

---

## Özet Checklist

- [ ] DNS: `api.khunjit.com` A kaydı eklendi
- [ ] SSL: Let's Encrypt sertifikası alındı
- [ ] Nginx/Apache: Reverse proxy yapılandırıldı
- [ ] Stripe Dashboard: Webhook endpoint eklendi (`https://api.khunjit.com/webhooks/stripe`)
- [ ] .env: `STRIPE_WEBHOOK_SECRET` güncellendi
- [ ] Test: Ping testi başarılı
- [ ] Test: Stripe CLI testi başarılı
