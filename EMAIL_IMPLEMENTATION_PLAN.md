# 📧 Email Implementation Plan

## ✅ Aktif Emailler

### 1. Welcome Email
**Durum:** ✅ Çalışıyor
**Tetiklenme:** Kullanıcı kayıt olduğunda
**Konum:** `server/routes.ts:304`
**Template:** `server/email/templates/{lang}/welcome.html`
**Test:** ✅ Başarılı

---

## 🔧 Eklenecek/Düzeltilecek Emailler

### 2. Şifre Sıfırlama (Password Reset)
**Durum:** ❌ Yok
**Tetiklenme:** Kullanıcı "şifremi unuttum" tıklayınca
**Template:** Oluşturulacak
**İçerik:**
- Reset link (token ile)
- Link geçerlilik süresi (1 saat)
- Güvenlik uyarısı

### 3. Randevu Onayı (Booking Confirmed)
**Durum:** ✅ Kod var ama test edilmeli
**Tetiklenme:** Ödeme tama

mlandığında
**Konum:** `server/routes.ts:4908`
**Template:** `server/email/templates/{lang}/booking-confirmed.html`
**Gönderilir:** Hem hasta hem psikolog

### 4. Randevu Hatırlatma (Appointment Reminders)
**Durum:** ✅ Scheduler aktif
**Tetiklenme:** Otomatik (24h ve 1h öncesi)
**Konum:** `server/email/scheduler.ts:153`
**Template:** `server/email/templates/{lang}/reminder.html`
**Gönderilir:** Hem hasta hem psikolog

### 5. Seans Sonrası (After Session)
**Durum:** ⚠️ Template var, otomatik gönderim yok
**Tetiklenme:** Randevu "completed" olunca
**Template:** `server/email/templates/{lang}/after-session.html`
**İçerik:**
- Teşekkür mesajı
- Feedback/değerlendirme linki
- Sonraki randevu önerisi

### 6. Psikolog Hesap Onayı (Verification Approved)
**Durum:** ❌ Template yok
**Tetiklenme:** Admin psikolog başvurusunu onayladığında
**Template:** Oluşturulacak
**İçerik:**
- Tebrik mesajı
- Dashboard linki
- İlk adımlar rehberi

### 7. Psikolog Hesap Reddi (Verification Rejected)
**Durum:** ❌ Template yok
**Tetiklenme:** Admin psikolog başvurusunu reddedince
**Template:** Oluşturulacak
**İçerik:**
- Kibar red mesajı
**Açıklama (opsiyonel)
- Tekrar başvuru bilgisi

### 8. Randevu İptali (Appointment Cancelled)
**Durum:** ❌ Gönderim yok
**Template:** Oluşturulacak veya reminder kullanılacak
**Tetiklenme:** Hasta/psikolog randevuyu iptal edince
**Gönderilir:** Her iki tarafa

### 9. Ödeme Onayı (Payment Confirmed)
**Durum:** ⚠️ Booking confirmed ile birleşik
**Tetiklenme:** Stripe ödeme başarılı
**Not:** Zaten booking confirmed'da ödeme bilgisi var

### 10. Mesaj Bildirimi (Message Notification)
**Durum:** ❌ Sadece in-app notification var
**Tetiklenme:** Kullanıcı mesaj aldığında
**Opsiyonel:** Anlık email gönderme yerine daily digest olabilir

---

## 🎯 Öncelik Sıralaması

### Yüksek Öncelik (Hemen)
1. ✅ **Welcome Email** - Çalışıyor
2. ⚠️ **Booking Confirmed** - Test edilmeli
3. ✅ **Appointment Reminders** - Çalışıyor
4. 🔧 **Password Reset** - Kritik, eklenm eli

### Orta Öncelik
5. 🔧 **Verification Emails** (Approved/Rejected) - İş akışı için önemli
6. 🔧 **After Session** - Otomatik gönderim ekle
7. 🔧 **Appointment Cancelled** - Bilgilendirme

### Düşük Öncelik
8. ⭕ **Message Notifications** - Daily digest olabilir
9. ⭕ **Payment Confirmed** - Zaten booking'de var

---

## 📝 Şimdi Yapılacaklar

### 1. Test Booking Confirmed Email
```bash
# Ödeme tamamlandığında otomatik gönderiliyor mu test et
# Konum: server/routes.ts:4908
```

### 2. Test Appointment Reminders
```bash
# Scheduler çalışıyor mu kontrol et
# Konum: server/email/scheduler.ts
```

### 3. Password Reset Email Ekle
- Route ekle: POST /api/auth/forgot-password
- Token oluştur ve database'e kaydet
- Email template oluştur
- Reset sayfası oluştur: /reset-password?token=xxx

### 4. Verification Emails Ekle
- Admin onay/red işlemlerine email entegrasyonu
- 2 template oluştur (approved, rejected)

### 5. After Session Otomasyonu
- Appointment status "completed" olduğunda email gönder
- Scheduler'a ekle veya status update'te trigger et

---

## 🧪 Test Komutları

### Welcome Email Test
```bash
npx tsx send-welcome-now.ts
```

### Booking Confirmed Test
```bash
# Yeni randevu oluştur ve ödeme yap
# Veya manuel test:
npx tsx test-booking-email.ts
```

### Reminder Test
```bash
# Scheduler loglarını kontrol et
# Veya manuel:
npx tsx test-reminder.ts
```

---

## 📊 Email Durumu Özeti

| Email Tipi | Template | Kod | Otomatik | Test | Durum |
|-----------|----------|-----|----------|------|-------|
| Welcome | ✅ | ✅ | ✅ | ✅ | ✅ Çalışıyor |
| Booking Confirmed | ✅ | ✅ | ✅ | ⚠️ | Test edilmeli |
| Reminder 24h | ✅ | ✅ | ✅ | ⚠️ | Test edilmeli |
| Reminder 1h | ✅ | ✅ | ✅ | ⚠️ | Test edilmeli |
| After Session | ✅ | ⚠️ | ❌ | ❌ | Manuel gönderim |
| Password Reset | ❌ | ❌ | ❌ | ❌ | Yok |
| Verification Approved | ❌ | ❌ | ❌ | ❌ | Yok |
| Verification Rejected | ❌ | ❌ | ❌ | ❌ | Yok |
| Appointment Cancelled | ❌ | ❌ | ❌ | ❌ | Yok |

---

**Next:** Welcome email çalışıyor ✅, şimdi hangi email'i ekleyelim?
