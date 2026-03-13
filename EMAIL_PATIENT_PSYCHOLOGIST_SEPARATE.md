# ✅ Hasta ve Psikolog için Ayrı Email Template'leri

## 🎉 Tamamlandı!

Hasta ve psikolog artık **farklı email template'leri** alıyor!

---

## 📧 Email Tipleri

### 1. Patient Email (Hasta)
**Template:** `booking-confirmed-patient.html`
**Renk Teması:** 🟢 Yeşil (Green #10b981)
**İçerik:**
- ✅ "Your appointment is confirmed"
- 👨‍⚕️ Psychologist bilgileri
- 💡 Hasta için ipuçları:
  - Sessiz bir yer bul
  - Kamera/mikrofon test et
  - Su hazırla
  - Konuşmak istediğin konuları hazırla
  - 5 dakika erken katıl
- ⏰ Hatırlatma bilgisi (24h + 1h)
- 📅 İptal politikası

**Subject:** "✅ Your Appointment Confirmed - KhunJit"

**Test:** ✅ Başarılı
- Message ID: bc96c4ad-ad64-7968-dbce-71fb0844010a@khunjit.com

---

### 2. Psychologist Email (Psikolog)
**Template:** `booking-confirmed-psychologist.html`
**Renk Teması:** 🟣 Mor (Purple #8b5cf6)
**İçerik:**
- 📅 "New Appointment Confirmed"
- 👤 Client bilgileri (hasta adı)
- 📋 Psikolog için hazırlık:
  - Danışan bilgilerini incele
  - Seans notları hazırla
  - Video/ses test et
  - 5 dakika erken katıl
  - Seans materyallerini hazırla
- ⏰ Hatırlatma bilgisi
- 💬 Quick Actions:
  - Message the client
  - Manage availability
  - Notification settings

**Subject:** "📅 New Appointment Confirmed - KhunJit"

**Test:** ✅ Başarılı
- Message ID: 850189be-ed6c-2ad8-99d5-161e17c96868@khunjit.com

---

## 🔧 Teknik Detaylar

### Email Service Method

```typescript
async sendBookingConfirmed(
  userId: string,
  appointmentId: string,
  to: string,
  variables: { ... },
  language: SupportedLanguage = 'en',
  recipientType: 'patient' | 'psychologist' = 'patient'  // YENİ!
)
```

### Template Seçimi

```typescript
const templateFile = recipientType === 'patient'
  ? 'booking-confirmed-patient.html'
  : 'booking-confirmed-psychologist.html';
```

### Kullanım (routes.ts)

```typescript
// Hasta için
await emailService.sendBookingConfirmed(
  patientId,
  appointmentId,
  patientEmail,
  { firstName, psychologistName, ... },
  patientLanguage,
  'patient'  // hasta template'i
);

// Psikolog için
await emailService.sendBookingConfirmed(
  psychologistId,
  appointmentId,
  psychologistEmail,
  { firstName: psychName, psychologistName: patientName, ... },
  psychLanguage,
  'psychologist'  // psikolog template'i
);
```

---

## 📁 Dosya Yapısı

```
server/email/templates/
├── en/
│   ├── booking-confirmed-patient.html       ✅ YENİ
│   ├── booking-confirmed-psychologist.html  ✅ YENİ
│   ├── booking-confirmed.html              (eski, kullanılmıyor)
│   ├── welcome.html
│   ├── reminder.html
│   └── after-session.html
├── tr/ (Türkçe template'ler oluşturulacak)
├── de/
├── fr/
... (11 dil)
```

---

## 🌍 Çok Dilli Destek

### Yapılması Gerekenler

Her dil için 2 template oluştur:
- `booking-confirmed-patient.html` (11 dil)
- `booking-confirmed-psychologist.html` (11 dil)

**Diller:**
- ✅ en (English) - Hazır
- ⏳ tr (Türkçe) - Oluşturulacak
- ⏳ de (Almanca)
- ⏳ fr (Fransızca)
- ⏳ ja (Japonca)
- ⏳ ko (Korece)
- ⏳ th (Tayca)
- ⏳ id (Endonezce)
- ⏳ fil (Filipince)
- ⏳ it (İtalyanca)
- ⏳ vi (Vietnamca)

---

## 🎨 Tasarım Farkları

| Özellik | Patient Email | Psychologist Email |
|---------|---------------|-------------------|
| Renk Teması | 🟢 Yeşil (#10b981) | 🟣 Mor (#8b5cf6) |
| Header | "Appointment Confirmed!" | "New Appointment Confirmed" |
| Ana Bilgi | Psychologist adı | Client adı |
| İpuçları | Patient için | Professional prep |
| Ton | Destekleyici, rahatlatıcı | Profesyonel, bilgilendirici |
| CTA Button | "View My Appointments" | "View Appointment" + "Session Notes" |
| Ekstra | Cancellation policy | Quick Actions links |

---

## ✅ Test Sonuçları

### Email 1: Patient (Hasta)
```
To: dev.stackflick@gmail.com
Subject: ✅ Your Appointment Confirmed
Theme: Green gradient
Content: Patient tips, appointment details
Status: ✅ Sent (bc96c4ad-ad64-7968...)
```

### Email 2: Psychologist (Psikolog)
```
To: dev.stackflick@gmail.com
Subject: 📅 New Appointment Confirmed
Theme: Purple gradient
Content: Professional prep, quick actions
Status: ✅ Sent (850189be-ed6c-2ad8...)
```

---

## 🚀 Production Ready

- [x] Patient template oluşturuldu (EN)
- [x] Psychologist template oluşturuldu (EN)
- [x] Email service güncellendi
- [x] Routes.ts güncellendi
- [x] Test edildi ✅
- [ ] Türkçe template'ler
- [ ] Diğer 9 dil template'leri
- [ ] Production'a deploy

---

## 📝 Sonraki Adımlar

### 1. Türkçe Template'ler Oluştur
```bash
server/email/templates/tr/
  - booking-confirmed-patient.html (Türkçe)
  - booking-confirmed-psychologist.html (Türkçe)
```

### 2. Diğer Reminder Email'leri de Ayır
- `reminder-patient.html` (1h & 24h)
- `reminder-psychologist.html` (1h & 24h)

### 3. After Session Email'leri
- `after-session-patient.html`
- `after-session-psychologist.html`

---

## 💡 Önemli Notlar

1. **Dinamik İçerik:** Tüm veriler database'den geliyor (gerçek hasta/psikolog isimleri)
2. **Dil Desteği:** Kullanıcının seçtiği dile göre template yükleniyor
3. **Idempotent:** Aynı email 2 kez gönderilmiyor (email_logs)
4. **Otomatik:** Stripe ödeme webhook'unda otomatik gönderiliyor

---

**Son Güncelleme:** 28 Ocak 2026
**Durum:** ✅ İngilizce hazır, diğer diller bekliyor
**Test:** ✅ Başarılı
