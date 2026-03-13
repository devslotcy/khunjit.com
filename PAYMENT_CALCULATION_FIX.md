# Ödeme Hesaplama Sistemi Düzeltmesi

## Problem

Admin panelinde psikolog paylarının **yanlış hesaplandığı** tespit edildi. Sistem iki farklı hesaplama yöntemi kullanıyordu:

### Eski Sistem (routes.ts - YANLIŞ):
```
Brüt Tutar: 1200 THB
KDV (%20): 240 THB
Net (KDV hariç): 960 THB
Platform (%30 × Net): 288 THB
Psikolog (%70 × Net): 672 THB
```

### Yeni Sistem (stripe-checkout.ts - DOĞRU):
```
Toplam Tutar: 1200 THB
Platform (%30): 360 THB
Psikolog (%70): 840 THB
```

## Çözüm

### 1. Hesaplama Fonksiyonu Güncellendi

**Dosya**: [server/routes.ts:60-83](server/routes.ts#L60-L83)

```typescript
function calculatePaymentBreakdown(grossAmount: number) {
  const PLATFORM_FEE_RATE = 0.30; // 30% Platform komisyonu

  const platformFee = grossAmount * PLATFORM_FEE_RATE;
  const providerPayout = grossAmount - platformFee; // %70 psikolog payı

  return {
    grossAmount,
    platformFee,      // 360 THB (%30)
    providerPayout    // 840 THB (%70)
  };
}
```

### 2. Admin Paneli UI Güncellendi

**Dosya**: [client/src/pages/admin/payments.tsx](client/src/pages/admin/payments.tsx)

**Değişiklikler**:
- ❌ "KDV (%20)" sütunu kaldırıldı
- ✅ Tabloda sadece: Toplam Tutar, Platform (%30), Psikolog (%70)
- ✅ Özet kartları güncellendi
- ✅ Footer'daki KDV bilgisi kaldırıldı

## Ülke Bazlı Vergi Sistemi

Sistem **11 farklı ülke** için çalışıyor ve her ülkenin farklı vergi kuralları var:

### Mevcut Ülkeler (country_tax_rules tablosu):

| Ülke | Kod | Stopaj (Withholding) | Platform Vergisi |
|------|-----|---------------------|------------------|
| Türkiye | TR | %15 | %20 KDV |
| Tayland | TH | %3 | %0 |
| ABD | US | %0 | %0 |

### Nasıl Çalışır?

1. **Danışan Ödemesi**: 1200 THB (Stripe'a)
2. **Platform Payı**: 360 THB (%30)
3. **Psikolog Brüt Payı**: 840 THB (%70)
4. **Stopaj (Ülkeye göre)**:
   - Türkiye: 840 × 0.15 = 126 THB
   - Tayland: 840 × 0.03 = 25.2 THB
   - ABD: 0 THB
5. **Psikolog Net Payı**:
   - Türkiye: 840 - 126 = **714 THB**
   - Tayland: 840 - 25.2 = **814.8 THB**
   - ABD: **840 THB**

## Test Sonuçları

```bash
npm run test-payment-breakdown

=== Payment Breakdown Test ===

Toplam Tutar (Session Price):      1200.00 THB

Platform Payı (%30):       360.00 THB
Psikolog Payı (%70):                840.00 THB

=== Doğrulama ===
Platform komisyon oranı:           %30.0
Psikolog pay oranı:                %70.0
Toplam:                            %100.0

✅ Hesaplama DOĞRU!
```

## Etkilenen Dosyalar

1. ✅ [server/routes.ts](server/routes.ts) - calculatePaymentBreakdown() güncellendi
2. ✅ [client/src/pages/admin/payments.tsx](client/src/pages/admin/payments.tsx) - UI güncellendi
3. ✅ [test-payment-breakdown.ts](test-payment-breakdown.ts) - Test scripti oluşturuldu

## Önemli Notlar

- ⚠️ `calculatePaymentBreakdown()` artık sadece **fallback** olarak kullanılıyor
- ✅ Gerçek hesaplamalar **Stripe Checkout** tarafından yapılıyor
- ✅ Veritabanındaki ödeme kayıtları zaten doğru breakdown bilgisine sahip
- ✅ Admin paneli artık doğru tutarları gösteriyor

## Sonraki Adımlar

Eğer daha fazla ülke eklenirse:

```sql
INSERT INTO country_tax_rules (
  country_code,
  country_name,
  withholding_rate,
  platform_tax_rate,
  effective_from
) VALUES
  ('DE', 'Germany', 0.00, 0.19, NOW()),  -- %19 VAT
  ('FR', 'France', 0.00, 0.20, NOW()),   -- %20 VAT
  -- vb...
```

Stopaj ve vergi oranları `country_tax_rules` tablosunda yönetiliyor.
