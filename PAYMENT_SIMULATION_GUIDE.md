# Payment Simulation Guide (Development Mode)

## Problem
QR kodu taradınız ve gerçek ödemeyi yaptınız, ancak uygulama ödemenin tamamlandığını görmüyor.

## Neden?
Development mode'da gerçek Opn Payments webhook'u olmadığı için, ödeme bildirimi gelmiyor. Şu anda iki yöntem var:

### Yöntem 1: Manuel Simülasyon (Önerilen - Şimdi Kullanın)

Backend'de yeni bir endpoint ekledik: `/api/payments/:id/simulate-complete`

Bu endpoint ödemeyi manuel olarak tamamlanmış olarak işaretler.

#### Adımlar:

**1. Payment ID'yi alın**

QR kod ekranında, browser console'u açın (F12) ve Network tab'ına bakın.
`/api/payments/promptpay/create` response'unda payment ID'yi bulun:

```json
{
  "payment": {
    "id": "abc-123-xyz",  // ← Bu payment ID
    ...
  }
}
```

**2. Auth Token'ı alın**

Browser console'da (F12 → Console tab):
```javascript
localStorage.getItem('token')
// veya
document.cookie
```

**3. Simülasyon API'sini çağırın**

Terminal'de:
```bash
./test-payment-complete.sh <payment-id> <auth-token>
```

Örnek:
```bash
./test-payment-complete.sh abc-123-xyz eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Veya curl ile direkt:
```bash
curl -X POST "http://localhost:5055/api/payments/abc-123-xyz/simulate-complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**4. Sonuç**

✅ Payment status: `paid`
✅ Appointment status: `confirmed`
✅ Frontend otomatik olarak success ekranına yönlendirilecek

### Yöntem 2: Gerçek Webhook (Production İçin)

Production'da Opn Payments otomatik olarak webhook göndererek ödemeyi onaylar.

#### Setup:

1. Opn Payments hesabı açın
2. API keys alın:
   ```bash
   OPN_SECRET_KEY=skey_live_xxx
   OPN_PUBLIC_KEY=pkey_live_xxx
   OPN_WEBHOOK_SECRET=whsec_xxx
   ```
3. Webhook URL yapılandırın: `https://your-domain.com/webhooks/payment`
4. Test edin

## Frontend Polling

Frontend zaten her 3 saniyede bir payment status'ünü kontrol ediyor:

```typescript
// client/src/pages/patient/promptpay-checkout.tsx:127-156
useEffect(() => {
  if (!payment?.id || paymentStatus !== "pending") return;

  const checkStatus = async () => {
    try {
      const response = await fetch(`/api/payments/${payment.id}/status`);
      if (response.ok) {
        const data = await response.json();

        if (data.status === "paid") {
          setPaymentStatus("paid");
          toast({ title: "Payment Successful!" });
          setTimeout(() => setLocation("/patient/appointments"), 3000);
        }
      }
    } catch (err) {
      console.error("Error checking payment status:", err);
    }
  };

  const interval = setInterval(checkStatus, 3000); // Her 3 saniyede bir
  return () => clearInterval(interval);
}, [payment?.id, paymentStatus]);
```

## Test Akışı

### Senaryo 1: QR ile gerçek ödeme + Manuel simülasyon

1. ✅ Appointment oluştur
2. ✅ Payment ekranına git
3. ✅ QR'ı K+ ile tara → **1.00 THB öde** ✅ (BU ADIMI YAPTINIZ!)
4. 🔄 Payment ID'yi al (browser console)
5. 🔄 Simülasyon endpoint'ini çağır
6. ✅ Frontend otomatik güncellenir → Success ekranı

### Senaryo 2: Production (Gerçek webhook)

1. ✅ Appointment oluştur
2. ✅ Payment ekranına git
3. ✅ QR'ı K+ ile tara → Öde
4. ⚡ Opn Payments otomatik webhook gönderir
5. ✅ Backend ödemeyi işler
6. ✅ Frontend polling ile status alır
7. ✅ Success ekranı

## Hızlı Test (ŞİMDİ YAPMANIZ GEREKEN)

Ekrandaki payment reference code'undan payment ID'yi bulabilirsiniz:

```
Referans Kodu: MW-910460B4
```

Bu muhtemelen frontend'te gösterilen bir şey. Gerçek payment ID'yi almak için:

1. Browser'da F12 → Network tab
2. `/api/payments/promptpay/create` request'ini bulun
3. Response'daki `payment.id` değerini kopyalayın
4. Terminal'de:
   ```bash
   ./test-payment-complete.sh <payment-id> <your-auth-token>
   ```

## Otomatik Simülasyon (Gelecek Geliştirme)

Frontend'e bir "Test: Mark as Paid" butonu ekleyebiliriz (sadece development mode'da görünür):

```typescript
{process.env.NODE_ENV === 'development' && (
  <Button onClick={handleSimulatePayment}>
    🧪 Test: Mark as Paid
  </Button>
)}
```

Bu butona basınca otomatik olarak simülasyon endpoint'ini çağırır.

## Özet

✅ **ŞU AN**: Manuel simülasyon ile test edin
🔄 **SONRA**: Production'da gerçek webhook kullanın
💡 **BONUS**: Development mode'da test butonu ekleyin

## Sorun Giderme

### Payment ID bulamıyorum
Browser Console → Network tab → XHR filter → promptpay/create request → Response tab

### Auth token bulamıyorum
Browser Console → Application tab → Local Storage → token key

### Simülasyon 401 hatası veriyor
Auth token geçersiz veya eksik. Yeniden login olun.

### Simülasyon 403 hatası veriyor
Production mode aktif. `.env` dosyasında `OPN_SECRET_KEY` kaldırın.

### Frontend hala güncellenmiyor
- Payment status endpoint'ini kontrol edin: `GET /api/payments/:id/status`
- Browser console'da network activity kontrol edin
- Polling interval çalışıyor mu kontrol edin

---

**Sonraki Adım**: Payment ID'yi bulun ve simülasyon endpoint'ini çağırın! 🚀
