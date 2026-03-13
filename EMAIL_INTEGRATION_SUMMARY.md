# 📧 Email Sistemi - Dinamik Entegrasyon

## ✅ Mevcut Durum

Email sistemi **tamamen dinamik** ve production-ready! Tüm emailler gerçek database verilerini kullanıyor.

---

## 🔄 Dinamik Email Akışı

### 1. Welcome Email (Kayıt)
**Tetiklenme:** Kullanıcı kayıt formunu doldurduğunda
**Konum:** `server/routes.ts:304`

**Dinamik Veriler:**
```typescript
{
  userId: database'den alınıyor,
  email: kayıt formundan,
  firstName: kayıt formundan,
  language: kullanıcının seçtiği dil (11 dil)
}
```

**Akış:**
```
User Registration Form
  ↓
POST /api/auth/register
  ↓
Create user in database
  ↓
emailService.sendWelcome(userId, email, firstName, language)
  ↓
Template loading (language-specific)
  ↓
Variable replacement: {{firstName}}, {{dashboardLink}}
  ↓
SMTP send
  ↓
Email log kaydı (idempotent)
```

**Test:**
1. Frontend'den yeni kullanıcı kaydı yap
2. Email otomatik gönderilir
3. `email_logs` tablosunda kayıt oluşur

---

### 2. Booking Confirmed Email (Randevu Onayı)
**Tetiklenme:** Stripe ödeme tamamlandığında
**Konum:** `server/routes.ts:4908` (hasta), `server/routes.ts:4927` (psikolog)

**Dinamik Veriler:**
```typescript
// Database'den alınıyor:
- Hasta bilgileri (firstName, email, language)
- Psikolog bilgileri (fullName, email, language)
- Randevu bilgileri (startAt, meetingRoom)

// Formatlanıyor:
- appointmentDate: format(startAt, "d MMMM yyyy, EEEE")
- appointmentTime: format(startAt, "HH:mm")
- joinLink: `${PLATFORM_URL}/video-call?room=${meetingRoom}`
```

**Akış:**
```
Stripe Payment Success
  ↓
POST /webhooks/stripe (webhook)
  ↓
Update appointment status: "confirmed"
  ↓
Query database:
  - Get payment details
  - Get appointment details
  - Get patient user + language
  - Get psychologist profile + user + language
  ↓
Format dates with date-fns
  ↓
emailService.sendBookingConfirmed() x2
  - To patient (in patient's language)
  - To psychologist (in psychologist's language)
  ↓
Email logs created
```

**Örnek:**
```typescript
// Hasta için (Türkçe)
{
  firstName: "Ahmet",
  psychologistName: "Dr. Ayşe Yılmaz",
  appointmentDate: "15 Şubat 2026, Cumartesi",
  appointmentTime: "14:00",
  joinLink: "https://khunjit.com/video-call?room=abc123"
}

// Psikolog için (İngilizce)
{
  firstName: "Dr. Ayşe",
  psychologistName: "Ahmet", // hasta adı
  appointmentDate: "15 February 2026, Saturday",
  appointmentTime: "14:00",
  joinLink: "https://khunjit.com/video-call?room=abc123"
}
```

---

### 3. Appointment Reminder Email (Randevu Hatırlatma)
**Tetiklenme:** Otomatik scheduler (cron job)
**Konum:** `server/email/scheduler.ts:153`
**Çalışma:** Her 5 dakikada bir (24h reminder), her dakika (1h reminder)

**Dinamik Veriler:**
```typescript
// Scheduler her çalıştığında:
1. Database query: appointments needing reminders
2. For each appointment:
   - Get patient (user + language)
   - Get psychologist (profile + user + language)
   - Calculate time until appointment
   - Format date/time in user's language

// Email variables:
{
  firstName: user.firstName,
  psychologistName: psychologist.fullName,
  appointmentDate: format(startAt, locale),
  appointmentTime: format(startAt, "HH:mm"),
  joinLink: video call link,
  reminderTime: "24 hours" / "1 hour" (localized)
}
```

**Akış:**
```
Cron Job (every 5 min / 1 min)
  ↓
getAppointmentsNeedingReminders(24h / 1h)
  ↓
For each appointment:
  ↓
  Query patient language & info
  Query psychologist language & info
  ↓
  Format date in patient's locale (date-fns)
  Format date in psychologist's locale
  ↓
  Send to patient (their language)
  Send to psychologist (their language)
  ↓
  Create in-app notification (1h only)
  Send system message (1h only)
  ↓
  Mark reminder sent (prevent duplicates)
```

**Dil Desteği:**
```typescript
import { de, enUS, fr, id, it, ja, ko, th, tr, vi } from 'date-fns/locale';

const DATE_LOCALES = {
  de, en: enUS, fil: enUS, fr, id, it, ja, ko, th, tr, vi
};

// Tarih formatı kullanıcının diline göre:
format(date, "d MMMM yyyy, EEEE", { locale: DATE_LOCALES[userLanguage] })

// Türkçe: "15 Şubat 2026, Cumartesi"
// İngilizce: "15 February 2026, Saturday"
// Japonca: "2026年2月15日 土曜日"
```

---

## 🎨 Template Değişkenleri

Tüm email template'leri `{{variable}}` formatında değişken kullanıyor:

### Ortak Değişkenler
```
{{platformUrl}}       - http://localhost:5173 (veya production URL)
{{dashboardLink}}     - {platformUrl}/dashboard
```

### Welcome Email
```
{{firstName}}         - Kullanıcı adı
```

### Booking Confirmed
```
{{firstName}}         - Alıcının adı
{{psychologistName}}  - Psikolog adı (hasta için) veya Hasta adı (psikolog için)
{{appointmentDate}}   - Formatlanmış tarih (locale'e göre)
{{appointmentTime}}   - Saat (HH:mm)
{{joinLink}}          - Video call odası linki
```

### Reminder
```
{{firstName}}         - Alıcının adı
{{psychologistName}}  - Psikolog adı (hasta için) veya Hasta adı (psikolog için)
{{appointmentDate}}   - Formatlanmış tarih
{{appointmentTime}}   - Saat
{{joinLink}}          - Video call linki
{{reminderTime}}      - "24 hours" / "1 hour" (localized)
```

---

## 🧪 Gerçek Test Senaryoları

### Test 1: Welcome Email
```bash
# Frontend'den yeni kullanıcı kaydı yap:
1. http://localhost:5173/register
2. Formu doldur (email: your-email@gmail.com)
3. Dil seç: Türkçe
4. Register tıkla

# Beklenen:
✅ User database'e kaydedilir
✅ Welcome email gönderilir (Türkçe)
✅ email_logs tablosunda kayıt oluşur

# Database kontrolü:
SELECT * FROM email_logs WHERE type = 'welcome' ORDER BY created_at DESC LIMIT 1;
```

### Test 2: Booking Confirmed
```bash
# Yeni randevu oluştur ve ödeme yap:
1. Patient olarak giriş yap
2. Psikolog seç
3. Slot seç ve rezerve et
4. Stripe ile ödeme yap (test card: 4242 4242 4242 4242)

# Beklenen:
✅ Payment database'e kaydedilir
✅ Appointment status "confirmed" olur
✅ Patient'a email gönderilir (patient'ın dilinde)
✅ Psychologist'e email gönderilir (psikolog'un dilinde)
✅ 2 email log kaydı oluşur

# Server logları:
[Email] Sent booking confirmation to patient ahmet@example.com (tr)
[Email] Sent booking confirmation to psychologist ayse@example.com (en)

# Database kontrolü:
SELECT * FROM email_logs
WHERE type = 'appointment_confirmed'
  AND appointment_id = 'your-appointment-id';
```

### Test 3: Appointment Reminder
```bash
# Gelecekte bir randevu oluştur (24 saat sonra):
1. Randevu oluştur: startAt = NOW() + INTERVAL '24 hours'
2. Ödeme yap
3. 5 dakika bekle (scheduler çalışsın)

# Scheduler logları:
[EmailScheduler] Found X appointments needing reminder_24h reminder
[EmailScheduler] Sent reminder_24h reminder (tr) to patient@example.com
[EmailScheduler] Sent reminder_24h reminder (en) to psychologist@example.com

# Database kontrolü:
SELECT reminder_sent_24h, reminder_sent_1h
FROM appointments
WHERE id = 'appointment-id';

# 1 hour reminder için:
# Randevu saatine 1 saat kala:
✅ Email gönderilir (her iki tarafa)
✅ In-app notification oluşur
✅ System message gönderilir
✅ reminder_sent_1h = true
```

---

## 📊 Email Log Sistemi (Idempotent)

Her email gönderimi `email_logs` tablosuna kaydedilir:

```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  appointment_id UUID NULL,
  type TEXT NOT NULL, -- 'welcome', 'appointment_confirmed', 'reminder_24h', etc.
  status TEXT NOT NULL, -- 'pending', 'sent', 'failed'
  recipient_email TEXT NOT NULL,
  subject TEXT,
  sent_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Idempotency:**
```typescript
// Email gönderilmeden önce kontrol:
const existingLog = await storage.getEmailLog(userId, type, appointmentId);
if (existingLog && existingLog.status === "sent") {
  return { success: true, alreadySent: true }; // Tekrar gönderme
}
```

Bu sayede:
- ✅ Aynı welcome email 2 kez gönderilmez
- ✅ Aynı reminder 2 kez gönderilmez
- ✅ Server restart olsa bile güvenli

---

## 🌍 Çoklu Dil Desteği

### Template Dizin Yapısı
```
server/email/templates/
├── en/
│   ├── welcome.html
│   ├── booking-confirmed.html
│   ├── reminder.html
│   └── after-session.html
├── tr/
│   ├── welcome.html
│   ├── booking-confirmed.html
│   ├── reminder.html
│   └── after-session.html
├── de/ (Almanca)
├── fr/ (Fransızca)
├── ja/ (Japonca)
├── ko/ (Korece)
├── th/ (Tayca)
├── id/ (Endonezce)
├── fil/ (Filipince)
├── it/ (İtalyanca)
└── vi/ (Vietnamca)
```

### Dil Seçimi
```typescript
// User registration'da seçilen dil:
const userLanguageCode = await getUserLanguageFromDB(userId);

// Email gönderiminde:
emailService.sendWelcome(userId, email, firstName, userLanguageCode);

// Template loading:
const template = loadTemplate('welcome.html', userLanguageCode);
// Fallback: userLanguageCode template yoksa 'en' kullanılır
```

### Subject'ler (11 dil)
```typescript
const SUBJECTS = {
  tr: {
    welcome: "KhunJit'e Hoş Geldiniz! 🎉",
    appointment_confirmed: "Randevunuz Onaylandı - KhunJit",
    reminder_1h: "Seansınıza 1 Saat Kaldı - KhunJit"
  },
  en: {
    welcome: "Welcome to KhunJit! 🎉",
    appointment_confirmed: "Your Appointment Confirmed - KhunJit",
    reminder_1h: "Your Session in 1 Hour - KhunJit"
  },
  // ... 9 dil daha
};
```

---

## ✅ Production Readiness Checklist

- [x] SMTP configured (khunjit.com:465)
- [x] SSL/TLS enabled
- [x] SPF record active
- [x] DKIM record active
- [x] Email templates (11 languages)
- [x] Dynamic data from database
- [x] Idempotent sending (email_logs)
- [x] Error handling & logging
- [x] Template variable replacement
- [x] Locale-aware date formatting
- [x] Multi-recipient support (patient + psychologist)
- [x] Scheduler for reminders
- [x] In-app notifications (with email)
- [ ] PTR record (waiting for GoDaddy)
- [ ] Password reset emails
- [ ] Verification emails
- [ ] After session automation

---

## 🎯 Özet

**Email sistemi tamamen dinamik ve production-ready!**

✅ Tüm veriler database'den
✅ Gerçek kullanıcı bilgileri
✅ Gerçek randevu bilgileri
✅ 11 dil desteği
✅ Locale-aware formatting
✅ Idempotent (duplicate önleme)
✅ Error handling
✅ Logging

**Test için:** Gerçek kullanıcı kaydı yap veya randevu oluştur!

---

**Son Güncelleme:** 28 Ocak 2026
**Durum:** ✅ TAM ÇALIŞIR - DİNAMİK
