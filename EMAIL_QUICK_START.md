# Email System - Quick Start Guide

## ⚡ Hızlı Başlangıç (5 Dakika)

### 1. Resend ile Kurulum (Önerilen)

```bash
# 1. Resend hesabı aç: https://resend.com/signup
# 2. API Key al: https://resend.com/api-keys
# 3. .env dosyasına ekle:

RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=onboarding@resend.dev  # Test için
PLATFORM_URL=http://localhost:5010
```

### 2. Sistemi Başlat

```bash
npm install  # resend paketi yüklenecek
npm run dev
```

### 3. Test Et

```bash
# Kayıt olduğunda otomatik welcome mail gönderilir
curl -X POST http://localhost:5010/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User",
    "role": "patient",
    "languageId": "your-language-id"
  }'
```

## 📧 Gönderilen Mailler

| Mail Türü | Tetikleyici | Dil Desteği |
|-----------|------------|-------------|
| **Welcome** | Kayıt | ✅ 11 dil |
| **Booking Confirmed** | Ödeme onayı | ✅ 11 dil |
| **Reminder 24h** | Randevudan 24 saat önce | ✅ 11 dil |
| **Reminder 1h** | Randevudan 1 saat önce | ✅ 11 dil |
| **After Session** | Seans bitimi | ✅ 11 dil |

## 🌍 Desteklenen Diller

🇩🇪 Almanca • 🇬🇧 İngilizce • 🇵🇭 Filipince • 🇫🇷 Fransızca • 🇮🇩 Endonezce
🇮🇹 İtalyanca • 🇯🇵 Japonca • 🇰🇷 Korece • 🇹🇭 Tayca • 🇹🇷 Türkçe • 🇻🇳 Vietnamca

## 🔍 Log Kontrol

```bash
# Email gönderimlerini izle
tail -f dev.log | grep Email

# Beklenen çıktı:
# [Email] Resend provider initialized
# [Email] Sent via Resend to user@example.com: "Welcome to KhunJit! 🎉"
```

## ⚙️ Alternatif: SMTP ile Kurulum

Gmail, Brevo veya başka SMTP servisi kullanmak istiyorsan:

```bash
# .env dosyasına ekle:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=KhunJit <noreply@gmail.com>
```

## 🚨 Sorun Giderme

### Mail gitmiyor?

```bash
# 1. Provider'ı kontrol et
tail -f dev.log | grep "Email.*provider"

# Beklenen:
# [Email] Resend provider initialized
# veya
# [Email] SMTP provider initialized

# 2. Email logs'u kontrol et (DB)
psql $DATABASE_URL -c "SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 5;"
```

### Template bulunamıyor?

```bash
# Template dosyalarını kontrol et
ls -la server/email/templates/en/
# Beklenen: welcome.html, reminder.html, after-session.html, booking-confirmed.html
```

## 📚 Daha Fazla Bilgi

- Detaylı dokümantasyon: [EMAIL_SYSTEM.md](./EMAIL_SYSTEM.md)
- Template örnekleri: `server/email/templates/`
- Kod örnekleri: `server/email/service.ts`

## 💡 Pro Tips

1. **Test için** `onboarding@resend.dev` kullan (domain verification gerektirmez)
2. **Production için** kendi domain'ini verify et
3. **Scheduler** otomatik çalışır (randevu hatırlatmaları için)
4. **Idempotency** var - aynı mail 2 kez gönderilmez
5. **Fallback** sistemi: Resend fail ederse SMTP dener

---

✅ **Hazırsın!** Artık mail sistemi 11 dilde çalışıyor.
