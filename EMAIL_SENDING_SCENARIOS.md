# 📧 Email Gönderim Senaryoları - Mendly Sistemi

Bu dokümanda sistemin hangi durumlarda email gönderdiği detaylı olarak açıklanmıştır.

## 📋 Özet Tablo

| Senaryo | Hasta | Psikolog | Dil Desteği | Dosya |
|---------|-------|----------|-------------|-------|
| Kullanıcı Kaydı (Welcome) | ✅ | ✅ | ✅ 11 dil | routes.ts:304 |
| Randevu Onayı (Booking Confirmed) | ✅ | ✅ | ✅ 11 dil | routes.ts:4964, 4984 |
| **Randevu İptali (Appointment Cancelled)** | ✅ | ✅ | ✅ 11 dil | **routes.ts:1755, 1586** |
| Psikolog Onayı (Verification Approved) | ❌ | ✅ | ✅ 11 dil | routes.ts:4047 |
| Psikolog Reddi (Verification Rejected) | ❌ | ✅ | ✅ 11 dil | routes.ts:4158 |
| Seans Sonrası (After Session) | ✅ | ❌ | ✅ 11 dil | routes.ts:2242 |
| Randevu Hatırlatıcı - 24 saat | ✅ | ✅ | ✅ 11 dil | scheduler.ts:189, 262 |
| Randevu Hatırlatıcı - 1 saat | ✅ | ✅ | ✅ 11 dil | scheduler.ts:189, 262 |
| Stripe Checkout (Alternatif) | ✅ | ❌ | ✅ 11 dil | stripe-checkout.ts:787 |

---

## 1️⃣ Kullanıcı Kaydı - Welcome Email

### 📍 Konum: `server/routes.ts:304`

### ✅ Gönderilme Durumu:
- **Hasta kaydında**: ✅ Evet
- **Psikolog kaydında**: ✅ Evet
- **Her iki rol için de** welcome email gönderiliyor

### 📝 Kod:
```typescript
// Registration endpoint
console.log(`[Registration] Sending welcome email to ${email} (${firstName}) in language: ${userLanguageCode}`);
const result = await emailService.sendWelcome(userId, email, firstName, userLanguageCode as any);
```

### 🌍 Dil Desteği:
- Kullanıcının seçtiği dilde gönderiliyor
- 11 dil destekli: en, de, tr, fil, fr, id, it, ja, ko, th, vi

### 📧 Template:
- `server/email/templates/{lang}/welcome.html`

---

## 2️⃣ Randevu Onayı - Booking Confirmed

### 📍 Konum: `server/routes.ts:4964` (hasta) ve `server/routes.ts:4984` (psikolog)

### ✅ Gönderilme Durumu:
**Ödeme onaylandığında (payment status = 'completed'):**
- **Hastaya**: ✅ Email gönderiliyor
- **Psikoloğa**: ✅ Email gönderiliyor

### 📝 Kod:
```typescript
// Payment completed webhook - Send to BOTH
// Send email to patient
await emailService.sendBookingConfirmed(
  payment.patientId,
  payment.appointmentId,
  patientResult.email,
  {
    firstName: patientResult.firstName || "User",
    psychologistName: psychProfile.fullName,  // Hasta psikoloğun ismini görür
    appointmentDate,
    appointmentTime,
    joinLink,
  },
  patientLanguage,
  'patient'
);

// Send email to psychologist
await emailService.sendBookingConfirmed(
  psychProfile.userId,
  payment.appointmentId,
  psychologistResult.email,
  {
    firstName: psychologistResult.firstName || psychProfile.fullName,
    patientName: patientResult?.firstName || "Client",  // 🔑 Psikolog hastanın ismini görür
    appointmentDate,
    appointmentTime,
    joinLink,
  },
  psychLanguage,
  'psychologist'
);
```

### 🔑 Önemli Değişiklikler:
- **Hasta emaili**: `{{psychologistName}}` değişkenini kullanır
- **Psikolog emaili**: `{{patientName}}` değişkenini kullanır (YENİ!)

### 🌍 Dil Desteği:
- Her kullanıcı kendi seçtiği dilde email alır
- Hasta Türkçe seçmişse → Türkçe email
- Psikolog İngilizce seçmişse → İngilizce email

### 📧 Templates:
- Hasta: `booking-confirmed-patient.html`
- Psikolog: `booking-confirmed-psychologist.html`

---

## 3️⃣ Psikolog Onayı - Verification Approved

### 📍 Konum: `server/routes.ts:4047`

### ✅ Gönderilme Durumu:
- **Hastaya**: ❌ Email gönderilmiyor
- **Psikoloğa**: ✅ Email gönderiliyor (admin onayladığında)

### 📝 Kod:
```typescript
// Admin approves psychologist
await emailService.sendVerificationApproved(
  psychologist.userId,
  userInfo.email,
  userInfo.firstName || psychologist.fullName,
  userLanguage as any
);
```

### 🌍 Dil Desteği:
- Psikologun seçtiği dilde gönderiliyor

### 📧 Template:
- `verification-approved.html`

---

## 4️⃣ Psikolog Reddi - Verification Rejected

### 📍 Konum: `server/routes.ts:4158`

### ✅ Gönderilme Durumu:
- **Hastaya**: ❌ Email gönderilmiyor
- **Psikoloğa**: ✅ Email gönderiliyor (admin reddederse)

### 📝 Kod:
```typescript
// Admin rejects psychologist
await emailService.sendVerificationRejected(
  psychologist.userId,
  userInfo.email,
  userInfo.firstName || psychologist.fullName,
  userLanguage as any
);
```

### 🌍 Dil Desteği:
- Psikologun seçtiği dilde gönderiliyor

### 📧 Template:
- `verification-rejected.html`

---

## 5️⃣ Seans Sonrası - After Session

### 📍 Konum: `server/routes.ts:2242`

### ✅ Gönderilme Durumu:
- **Hastaya**: ✅ Email gönderiliyor (seans tamamlandığında)
- **Psikoloğa**: ❌ Email gönderilmiyor

### 📝 Kod:
```typescript
// After session completes
await emailService.sendAfterSession(
  appointment.patientId,
  id,
  patient.email,
  {
    firstName: patient.firstName,
    psychologistName: psychProfile.fullName,
    sessionDate: appointmentDate,
    sessionTime: appointmentTime,
  },
  patientLanguage as any
);
```

### 🌍 Dil Desteği:
- Hastanın seçtiği dilde gönderiliyor

### 📧 Template:
- `after-session.html`

---

## 6️⃣ Randevu Hatırlatıcıları - Appointment Reminders

### 📍 Konum: `server/email/scheduler.ts:189` (hasta) ve `scheduler.ts:262` (psikolog)

### ✅ Gönderilme Durumu:
**Otomatik email scheduler tarafından:**
- **Hastaya**: ✅ 24 saat önce + 1 saat önce
- **Psikoloğa**: ✅ 24 saat önce + 1 saat önce

### 📝 Kod:
```typescript
// Send reminder to patient
const result = await emailService.sendReminder(
  appointment.patientId,
  appointment.id,
  patient.email,
  {
    firstName: patient.firstName,
    psychologistName: psychProfile.fullName,
    appointmentDate,
    appointmentTime,
    reminderTime: "24 hours" // veya "1 hour"
  },
  patientLang as any
);

// Send reminder to psychologist
await emailService.sendReminder(
  psychProfile.userId,
  appointment.id,
  psychUser.email,
  {
    firstName: psychUser.firstName,
    patientName: patient.firstName, // Psikolog hastanın ismini görür
    appointmentDate,
    appointmentTime,
    reminderTime: "24 hours" // veya "1 hour"
  },
  psychLang as any
);
```

### ⏰ Zamanlama:
- **24 saat önce**: İlk hatırlatıcı
- **1 saat önce**: Son hatırlatıcı

### 🌍 Dil Desteği:
- Her kullanıcı kendi dilinde email alır

### 📧 Templates:
- `appointment-reminder.html` (her iki taraf için)

---

## 7️⃣ Stripe Checkout - Alternatif Booking Email

### 📍 Konum: `server/payments/stripe-checkout.ts:787`

### ✅ Gönderilme Durumu:
- **Hastaya**: ✅ Email gönderiliyor
- **Psikoloğa**: ❌ Bu kod bloğunda gönderilmiyor (routes.ts'de gönderiliyor)

### 📝 Not:
Bu alternatif bir email gönderim noktası. Ana flow routes.ts'dedir.

---

## 🎯 Özet - Tüm Email Durumları

### ✅ Hasta (Patient) Email Alır:
1. ✅ Kayıt olduğunda → Welcome email
2. ✅ Randevu onaylandığında → Booking confirmed
3. ✅ Randevu iptal edildiğinde → Appointment cancelled (🆕)
4. ✅ Randevudan 24 saat önce → Reminder
5. ✅ Randevudan 1 saat önce → Reminder
6. ✅ Seans bittikten sonra → After session

### ✅ Psikolog (Psychologist) Email Alır:
1. ✅ Kayıt olduğunda → Welcome email
2. ✅ Admin onayladığında → Verification approved
3. ✅ Admin reddettiyse → Verification rejected
4. ✅ Hasta randevu aldığında → Booking confirmed
5. ✅ Hasta randevu iptal ettiğinde → Appointment cancelled (🆕)
6. ✅ Randevudan 24 saat önce → Reminder
7. ✅ Randevudan 1 saat önce → Reminder

---

## 🌍 Çoklu Dil Desteği

Tüm emailler **11 dilde** destekleniyor:
- 🇬🇧 English (en)
- 🇩🇪 German (de)
- 🇹🇷 Turkish (tr)
- 🇵🇭 Filipino (fil)
- 🇫🇷 French (fr)
- 🇮🇩 Indonesian (id)
- 🇮🇹 Italian (it)
- 🇯🇵 Japanese (ja)
- 🇰🇷 Korean (ko)
- 🇹🇭 Thai (th)
- 🇻🇳 Vietnamese (vi)

Her kullanıcı **kendi seçtiği dilde** email alır.

---

## 🔑 Yeni Değişiklikler (Bu Güncelleme)

### ✨ `patientName` Değişkeni Eklendi

**Önceki Durum:**
- Hem hasta hem psikolog emailleri `{{psychologistName}}` kullanıyordu
- Psikolog emaillerinde kafa karışıklığı vardı

**Yeni Durum:**
- ✅ Hasta emailleri: `{{psychologistName}}` kullanır (psikoloğun ismini gösterir)
- ✅ Psikolog emailleri: `{{patientName}}` kullanır (hastanın ismini gösterir)
- ✅ Tüm 11 dilde template'ler güncellendi
- ✅ Backend kodu düzeltildi (routes.ts:4990)
- ✅ TypeScript interface güncellendi

---

## 8️⃣ Randevu İptali - Appointment Cancelled (🆕 YENİ!)

### 📍 Konum: `server/routes.ts:1755` (hasta iptal) ve `routes.ts:1586` (psikolog iptal)

### ✅ Gönderilme Durumu:

**Senaryo 1: Hasta randevuyu iptal eder**
- **Hastaya**: ✅ Onay emaili (confirmation) → "Randevunuz iptal edildi"
- **Psikoloğa**: ✅ Bildirim emaili (notification) → "Hasta randevuyu iptal etti"

**Senaryo 2: Psikolog randevuyu reddeder**
- **Hastaya**: ✅ Bildirim emaili → "Randevunuz iptal edildi"
- **Psikoloğa**: ❌ Email gönderilmiyor (zaten kendisi iptal etti)

### 📝 Kod (Hasta İptal):
```typescript
// Patient cancels appointment (routes.ts:1755)
// Send cancellation emails to both patient and psychologist
await emailService.sendAppointmentCancelled(
  patient.id,
  appointmentId,
  patient.email,
  {
    firstName: patient.firstName,
    psychologistName: psychProfile.fullName,
    appointmentDate,
    appointmentTime,
  },
  patientLang as any
);

await emailService.sendAppointmentCancelled(
  psychUser.id,
  appointmentId,
  psychUser.email,
  {
    firstName: psychUser.firstName,
    patientName: patient.firstName, // 🔑 Psikolog hastanın ismini görür
    appointmentDate,
    appointmentTime,
  },
  psychLang as any
);
```

### 📝 Kod (Psikolog Red):
```typescript
// Psychologist rejects appointment (routes.ts:1586)
await emailService.sendAppointmentCancelled(
  patient.id,
  appointmentId,
  patient.email,
  {
    firstName: patient.firstName,
    psychologistName: psychProfile.fullName,
    appointmentDate,
    appointmentTime,
  },
  patientLang as any
);
```

### 🔑 Özellikler:
- **Dinamik isimler**: Hasta psikolog ismini, psikolog hasta ismini görür
- **Çift yönlü bildirim**: Her iki taraf da bilgilendiriliyor
- **Geri ödeme bilgisi**: Email'de otomatik geri ödeme bilgisi var

### 🌍 Dil Desteği:
- Her kullanıcı kendi dilinde email alır
- 11 dil destekli

### 📧 Template:
- `appointment-cancelled.html` (tüm diller için)

### 🎯 Ne Zaman Tetiklenir:
1. **Patient cancels**: POST `/api/appointments/:id/cancel`
2. **Psychologist rejects**: POST `/api/appointments/:id/reject`

---

## 📝 Test Edildi

✅ Template rendering testleri başarılı (8/8)
✅ Gerçek kullanıcı verileriyle preview'lar oluşturuldu
✅ Türkçe, Vietnamca, Tayca dilleri test edildi
✅ `patientName` ve `psychologistName` değişkenleri doğru çalışıyor
✅ **YENİ**: Randevu iptal emailleri test edildi (hasta & psikolog)

---

**Son Güncelleme**: 28 Ocak 2026 (Randevu iptal emailleri eklendi)
