# Email System Documentation

## Overview

KhunJit'te kapsamlı bir email bildirim sistemi entegre ettik. Sistem 11 dili desteklemekte ve hem Resend (birincil) hem de SMTP (yedek) sağlayıcılarını kullanmaktadır.

## 🌍 Desteklenen Diller

Sistem aşağıdaki 11 dili desteklemektedir:

- 🇩🇪 Almanca (de)
- 🇬🇧 İngilizce (en)
- 🇵🇭 Filipince (fil)
- 🇫🇷 Fransızca (fr)
- 🇮🇩 Endonezce (id)
- 🇮🇹 İtalyanca (it)
- 🇯🇵 Japonca (ja)
- 🇰🇷 Korece (ko)
- 🇹🇭 Tayca (th)
- 🇹🇷 Türkçe (tr)
- 🇻🇳 Vietnamca (vi)

## 📧 Email Türleri

### 1. Welcome Email
Kullanıcı kayıt olduğunda gönderilir.
- **Template:** `welcome.html`
- **Gönderilme:** Kayıt tamamlandığında
- **Dil:** Kullanıcının seçtiği dilde

### 2. Appointment Reminder (24 saat)
Randevudan 24 saat önce hatırlatma.
- **Template:** `reminder.html`
- **Gönderilme:** Her 5 dakikada bir scheduler tarafından kontrol edilir
- **Dil:** Kullanıcının tercih ettiği dilde
- **Alıcılar:** Hem hasta hem de psikolog

### 3. Appointment Reminder (1 saat)
Randevudan 1 saat önce hatırlatma.
- **Template:** `reminder.html`
- **Gönderilme:** Her 5 dakikada bir scheduler tarafından kontrol edilir
- **Dil:** Kullanıcının tercih ettiği dilde
- **Alıcılar:** Hem hasta hem de psikolog

### 4. Booking Confirmed
Ödeme tamamlandıktan sonra randevu onay maili.
- **Template:** `booking-confirmed.html`
- **Gönderilme:** Ödeme onaylandığında
- **Dil:** Kullanıcının tercih ettiği dilde
- **İçerik:** Randevu detayları ve video call linki

### 5. After Session
Seans tamamlandıktan sonra teşekkür maili.
- **Template:** `after-session.html`
- **Gönderilme:** Seans tamamlandığında
- **Dil:** Kullanıcının tercih ettiği dilde

## 🔧 Kurulum ve Konfigürasyon

### Environment Variables

Aşağıdaki environment variable'ları `.env` dosyanıza ekleyin:

#### Resend (Önerilen - Birincil)
```bash
# Resend API Key (ücretsiz tier: 100 mail/gün, ilk ay 3000 mail)
RESEND_API_KEY=re_xxx

# Gönderen email adresi (Resend'de doğrulanmış domain olmalı)
EMAIL_FROM="KhunJit <noreply@khunjit.com>"
```

#### SMTP (Yedek - Opsiyonel)
```bash
# SMTP sunucu bilgileri
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="KhunJit <noreply@khunjit.com>"
```

#### Platform URL
```bash
# Email'lerdeki linklerde kullanılır
PLATFORM_URL=https://khunjit.com
```

### Resend Kurulumu

1. [Resend.com](https://resend.com)'a üye olun (ücretsiz)
2. Domain'inizi ekleyin ve DNS kayıtlarını yapılandırın
3. API Key oluşturun
4. `.env` dosyasına `RESEND_API_KEY` ekleyin

### SMTP Kurulumu (Gmail Örneği)

1. Gmail hesabınızda 2FA'yı aktifleştirin
2. App Password oluşturun ([Buradan](https://myaccount.google.com/apppasswords))
3. `.env` dosyasına SMTP bilgilerini ekleyin

## 🏗️ Sistem Mimarisi

### Provider Katmanı

**Hybrid Email Provider** - Resend öncelikli, SMTP yedek:

```typescript
// 1. Önce Resend'i dene
if (resend.isConfigured()) {
  const result = await resend.send(email);
  if (result.success) return result;
}

// 2. SMTP fallback
if (smtp.isConfigured()) {
  return await smtp.send(email);
}

// 3. Hiçbiri yoksa log'a yaz
console.warn("No email provider configured");
```

### Service Katmanı

**EmailService** - İş mantığı ve idempotency:

- Template yükleme (dil desteği ile)
- Variable substitution
- Email log kaydı (tekrar gönderimi önler)
- Dil-bazlı subject seçimi

### Scheduler Katmanı

**Email Scheduler** - Otomatik hatırlatmalar:

- Her 5 dakikada bir randevu kontrolü
- 24 saat ve 1 saat öncesi hatırlatmalar
- Kullanıcının diline göre mail gönderimi
- Hem hasta hem de psikolog için ayrı mailler

## 📁 Dosya Yapısı

```
server/email/
├── provider.ts          # Email provider (Resend + SMTP)
├── service.ts           # Email service (business logic)
├── scheduler.ts         # Cron jobs for reminders
├── index.ts            # Exports
└── templates/
    ├── de/             # Almanca template'ler
    │   ├── welcome.html
    │   ├── reminder.html
    │   ├── after-session.html
    │   └── booking-confirmed.html
    ├── en/             # İngilizce template'ler
    ├── fil/            # Filipince template'ler
    ├── fr/             # Fransızca template'ler
    ├── id/             # Endonezce template'ler
    ├── it/             # İtalyanca template'ler
    ├── ja/             # Japonca template'ler
    ├── ko/             # Korece template'ler
    ├── th/             # Tayca template'ler
    ├── tr/             # Türkçe template'ler
    └── vi/             # Vietnamca template'ler
```

## 🔌 Entegrasyonlar

### Kayıt (Registration)

```typescript
// server/routes.ts - /api/auth/register endpoint'inde

// Kullanıcının dilini al
const [lang] = await db
  .select({ code: languages.code })
  .from(languages)
  .where(eq(languages.id, languageId));

// Welcome mail gönder
await emailService.sendWelcome(
  userId,
  email,
  firstName,
  lang?.code as SupportedLanguage
);
```

### Randevu Onayı (Booking Confirmation)

```typescript
// server/routes.ts - /api/payments/:id/simulate-complete endpoint'inde

// Ödeme onaylandıktan sonra
await emailService.sendBookingConfirmed(
  patientId,
  appointmentId,
  email,
  {
    firstName,
    psychologistName,
    appointmentDate,
    appointmentTime,
    joinLink,
  },
  patientLanguage
);
```

### Hatırlatma Mailler (Scheduler)

```typescript
// server/email/scheduler.ts

// Her 5 dakikada bir çalışır
cron.schedule("*/5 * * * *", async () => {
  // 24 saat ve 1 saat öncesi kontroller
  for (const config of REMINDER_CONFIGS) {
    await sendReminderEmails(config);
  }
});
```

## 🧪 Test Etme

### Manuel Test

```bash
# Test mail gönderme (Resend veya SMTP configure olmalı)
curl -X POST http://localhost:5010/api/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "language": "tr"
  }'
```

### Scheduler Test

```bash
# Zamanlanmış mailler için log kontrol et
tail -f dev.log | grep EmailScheduler
```

## 📊 Monitoring ve Logging

### Email Logs

Tüm gönderilen mailler `email_logs` tablosunda saklanır:

```sql
SELECT * FROM email_logs
WHERE user_id = 'xxx'
ORDER BY created_at DESC;
```

### Log Formatı

```
[Email] Sent via Resend to user@example.com: "Welcome to KhunJit! 🎉" (id: abc123)
[EmailScheduler] Sent reminder_1h reminder (tr) to user@example.com for appointment xyz789
```

## 🐛 Troubleshooting

### Mail Gitmiyor

1. **Environment variable'ları kontrol et:**
   ```bash
   echo $RESEND_API_KEY
   echo $EMAIL_FROM
   ```

2. **Provider'ı kontrol et:**
   ```bash
   # Loglarda şunu ara:
   [Email] Resend provider initialized
   # veya
   [Email] SMTP provider initialized
   ```

3. **Email logs'u kontrol et:**
   ```sql
   SELECT * FROM email_logs WHERE status = 'failed';
   ```

### Template Bulunamıyor

```
[Email] Failed to load template tr/welcome.html
```

**Çözüm:** Template dosyasının doğru klasörde olduğundan emin ol:
```bash
ls -la server/email/templates/tr/
```

### Yanlış Dilde Mail

**Sebep:** User'ın `languageId` alanı null veya yanlış set edilmiş.

**Çözüm:**
```sql
-- User'ın dilini kontrol et
SELECT u.email, up.language_id, l.code
FROM users u
LEFT JOIN user_profiles up ON up.user_id = u.id
LEFT JOIN languages l ON l.id = up.language_id
WHERE u.email = 'user@example.com';
```

## 🔒 Güvenlik

### Rate Limiting

Email gönderimi için rate limit yok ama:
- Idempotency: Aynı mail iki kez gönderilmez
- Scheduler: 5 dakikada bir kontrol (spam önler)

### Template Security

- Tüm template'ler HTML escape kullanır
- User input direkt olarak template'e eklenmez
- Placeholder sistemi güvenlidir: `{{firstName}}`

### Privacy

- Email adresleri log'larda maskelenir
- Email içeriği şifrelenmez (email protocol standart)
- Resend/SMTP TLS kullanır

## 📈 İyileştirmeler (Gelecek)

- [ ] Bulk email gönderimi
- [ ] Email analytics (açılma oranı, tıklama oranı)
- [ ] Daha fazla email türü (şifre sıfırlama, vb.)
- [ ] Email preview sistemi (admin panelinde)
- [ ] A/B testing için template varyasyonları
- [ ] Unsubscribe link'i

## 🆘 Destek

Sorular için:
- GitHub Issues: [anthropics/claude-code](https://github.com/anthropics/claude-code/issues)
- Email: destek@khunjit.com

---

**Son Güncelleme:** 2026-01-19
**Versiyon:** 1.0.0
**Geliştirici:** Claude Sonnet 4.5
