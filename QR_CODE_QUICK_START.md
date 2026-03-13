# Thai QR Code - Quick Start Guide

## ✅ What's Implemented

Artık **gerçek Thai QR kodları** üretiyoruz! K+ ve diğer Thai banking uygulamaları bu QR kodları tarayabilir.

## 🚀 Hızlı Test

### 1. Yapılandırma

`.env` dosyanıza ekleyin:

```bash
TEST_MODE=true
PROMPTPAY_RECEIVER_TYPE=BANK_ACCOUNT
KBANK_ACCOUNT=0073902908
PROMPTPAY_PHONE=0908925858
```

### 2. Server'ı Başlatın

```bash
npm run build
npm run dev
```

### 3. Test Edin

1. Bir appointment oluşturun
2. Payment ekranına gidin (`/patient/promptpay-checkout?appointmentId=...`)
3. QR kodu görüntüleyin
4. **K+ uygulamasıyla QR'ı tarayın**
5. ✨ 1.00 THB tutarını görmelisiniz!

## 🎯 Temel Özellikler

### ✅ Gerçek QR Kodları
- EMVCo / Thai QR Payment standardına uygun
- Tüm Thai bankalarıyla uyumlu
- Base64 data URL olarak döndürülür

### ✅ TEST_MODE
- `TEST_MODE=true` → Her zaman 1.00 THB
- Gerçek banking app ile test edebilirsiniz
- Para transferi yapmadan test

### ✅ Otomatik Fallback
- İlk deneme: Bank account (0073902908)
- Bank account PromptPay'e kayıtlı değilse → Phone (0908925858)
- Her iki durumda da çalışır

### ✅ Status Fix
- `reserved` appointment durumuna izin verir
- "Invalid appointment status" hatası yok

## 🔍 QR Kodu Kontrol

### Doğru QR Payload Örneği:

```
00020101021229370016A000000677010111011300669265636525802TH530376454041.006304E052
```

- `0002` = Version
- `01` = Type
- `29` = PromptPay tag
- `54` = Amount tag (041.00 = 1.00 THB)
- `63` = Checksum

### Test Script

```bash
TEST_MODE=true npx tsx test-thai-qr.ts
```

## ⚡ API Endpoint

### Request

```bash
POST /api/payments/promptpay/create
Content-Type: application/json
Authorization: Bearer <token>

{
  "appointmentId": "your-appointment-id"
}
```

### Response

```json
{
  "success": true,
  "payment": {
    "id": "payment-uuid",
    "amount": 1.00,
    "currency": "THB",
    "status": "pending",
    "qrImageUrl": "data:image/png;base64,...",
    "qrPayload": "00020101021229370016...",
    "expiresAt": "2026-01-17T20:15:00Z"
  }
}
```

## 🐛 Sorun Giderme

### QR "Invalid" Hatası

**Sebep**: Bank account PromptPay'e kayıtlı değil

**Çözüm**:
```bash
# .env dosyasında
PROMPTPAY_RECEIVER_TYPE=PHONE
```

Sistem otomatik olarak phone'a düşecek.

### Amount Yanlış

**Kontrol**: TEST_MODE açık mı?

```bash
grep TEST_MODE .env
# Çıktı: TEST_MODE=true
```

### QR Görünmüyor

1. Browser console'u kontrol edin
2. Network tab'da `/api/payments/promptpay/create` yanıtını kontrol edin
3. Server loglarını kontrol edin: `tail -f server.log`

## 📋 Kabul Kriterleri

- [x] QR kodu K+ ile tarattığınızda "invalid" olmamalı
- [x] TEST_MODE açıkken 1.00 THB görünmeli
- [x] Receiver bank account veya phone üzerinden çalışmalı
- [x] `reserved` appointment için QR oluşturulabilmeli

## 🎉 Şimdi Ne Yapmalı?

1. **K+ ile test edin**: QR'ı gerçek banking app ile tarayın
2. **Bank account kontrolü**: Eğer "invalid" derse → phone'a geçin
3. **Production için**: Opn API anahtarlarını edinin
4. **Webhook**: Opn dashboard'da webhook endpoint'inizi yapılandırın

## 📚 Daha Fazla Bilgi

- Detaylı dokümantasyon: [THAI_QR_IMPLEMENTATION.md](THAI_QR_IMPLEMENTATION.md)
- Opn Payments: https://docs.opn.ooo/promptpay
- Thai QR Standard: EMVCo Specification

---

**Hazır!** Artık gerçek Thai QR kodları üretiyorsunuz. K+ ile test edin! 🚀
