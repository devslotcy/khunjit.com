# 🔍 Email Durum Kontrolü

## Gönderilen Son Emailler

1. **Message ID:** 0d67ee22-53a5-9c03-4a02-2dc4879d7b14@khunjit.com
   - Queue ID: 39E7A86AB6
   - To: dev.stackflick@gmail.com
   - Status: 250 OK (kuyruğa alındı)

2. **Message ID:** B7FEF86AB6
   - To: dev.stackflick@gmail.com
   - Status: 250 OK (kuyruğa alındı)

3. **Message ID:** A6EC186AB6
   - To: support@khunjit.com
   - Status: 250 OK (kuyruğa alındı)

## 🧪 Kritik Test

**support@khunjit.com'a gelen emaili kontrol et:**

### Webmail Giriş
1. https://khunjit.com:2096 (cPanel webmail)
2. veya https://khunjit.com/webmail
3. veya https://mail.khunjit.com

**Kullanıcı:** support@khunjit.com
**Şifre:** onedeV1511pq.wwii

### Sonuç Analizi

✅ **support@khunjit.com'a email GELDİYSE:**
- SMTP sistemi TAM ÇALIŞIYOR
- Sorun: Gmail emaili reddediyor (SPF'ye rağmen)
- Çözüm: IP blacklist kontrolü, DKIM ekle

❌ **support@khunjit.com'a email GELMEDİYSE:**
- SMTP kuyruğa alıyor ama göndermede hata var
- Mail server loglarını kontrol et
- Postfix/Exim queue'yu kontrol et

## 📊 Olası Senaryolar

### Senaryo 1: Gmail Hard Bounce
Gmail emaili kabul edip sonra reddetti (bounce)
- Sebep: IP reputation, SPF soft fail, domain trust düşük
- Çözüm: DKIM ekle, farklı IP kullan, veya Resend kullan

### Senaryo 2: Gmail Silent Drop
Gmail emaili sessizce siliyor (ne inbox ne spam)
- Sebep: IP blacklisted
- Çözüm: IP blacklist kontrolü yap

### Senaryo 3: Mail Server Queue Stuck
Emailler kuyruğa alındı ama gönderilemiyor
- Sebep: DNS problemi, firewall, mail server hatası
- Çözüm: Server loglarını kontrol et

## 🔧 Hızlı Teşhis Komutları

### Mail Queue Kontrol (SSH ile sunucuda)
```bash
# Postfix
mailq

# veya
postqueue -p

# Exim
exim -bp
```

### Bounce/Error Logları
```bash
# Mail log
tail -f /var/log/mail.log

# veya
tail -f /var/log/maillog
```

### Spesifik Queue ID Takip
```bash
# Queue ID ile email durumunu görüntüle
postcat -q 39E7A86AB6

# veya
exim -Mvh A6EC186AB6
```

## 💡 Hızlı Çözüm: Resend Kullan

Gmail ile uğraşmak yerine Resend kullan:

1. https://resend.com → Sign up (ücretsiz)
2. API key al
3. .env'e ekle:
   ```
   RESEND_API_KEY=re_xxxxx
   ```
4. Kod zaten destekliyor!

Resend avantajları:
- SPF/DKIM otomatik
- %99 delivery rate
- Bounce tracking
- Gmail'in güvendiği servis
