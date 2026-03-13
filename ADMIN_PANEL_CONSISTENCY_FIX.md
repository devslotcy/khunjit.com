# Admin Paneli Tutarlılık Düzeltmesi

## Tespit Edilen Sorunlar

Admin panelinde **Genel Bakış** ve **Ödemeler** sayfaları arasında tutarsızlıklar vardı.

### ❌ Sorun 1: Yanlış Etiketler (Dashboard)

**Dosya**: [client/src/pages/admin/dashboard.tsx](client/src/pages/admin/dashboard.tsx)

**Önceki** (Yanlış):
```tsx
<span>KDV (20%)</span>                    // ❌ Artık KDV kullanılmıyor
<span>Platform Komisyonu (15%)</span>     // ❌ %30 olması gerekiyor!
<span>Psikolog Ödemeleri</span>           // ⚠️ "Payı" olmalı
```

**Yeni** (Doğru):
```tsx
<span>Platform Payı (%30)</span>          // ✅ Doğru oran
<span>Psikolog Payı (%70)</span>          // ✅ Tutarlı
```

### ❌ Sorun 2: 4 Kart Yerine 3 Kart

Finansal özet bölümünde **4 kart** vardı:
1. Brüt Gelir
2. KDV (%20) ❌
3. Platform Komisyonu (%15) ❌
4. Psikolog Ödemeleri

**Yeni sistem** (3 kart):
1. **Toplam Gelir** (Brüt)
2. **Platform Payı** (%30)
3. **Psikolog Payı** (%70)

KDV kartı kaldırıldı çünkü sistem artık **ülke bazlı vergi** kullanıyor.

## Yapılan Değişiklikler

### 1. Dashboard UI Güncellemesi

**Dosya**: [client/src/pages/admin/dashboard.tsx:168-218](client/src/pages/admin/dashboard.tsx#L168-L218)

**Değişiklikler**:
- ❌ "KDV (20%)" kartı kaldırıldı
- ✅ "Platform Komisyonu (15%)" → "Platform Payı (%30)"
- ✅ "Psikolog Ödemeleri" → "Psikolog Payı (%70)"
- ✅ Grid: `grid-cols-4` → `grid-cols-3`
- ✅ Renk kodları Ödemeler sayfası ile aynı (green, purple, orange)

### 2. Backend Hesaplamaları

Her iki endpoint de aynı `calculatePaymentBreakdown()` fonksiyonunu kullanıyor:

**Dosya**: [server/routes.ts:60-83](server/routes.ts#L60-L83)

```typescript
function calculatePaymentBreakdown(grossAmount: number) {
  const PLATFORM_FEE_RATE = 0.30; // 30% Platform komisyonu
  const platformFee = grossAmount * PLATFORM_FEE_RATE;
  const providerPayout = grossAmount - platformFee;
  return { platformFee, providerPayout };
}
```

**Kullanılan Endpoint'ler**:

1. **`GET /api/admin/stats`** - Dashboard (Genel Bakış)
   - TÜM completed payments
   - `financials.totalPlatformFee` ve `totalProviderPayout`

2. **`GET /api/admin/payments`** - Ödemeler Sayfası
   - Filtrelenmiş payments (tarih aralığı, durum, vb.)
   - `summary.totalPlatformFee` ve `totalProviderPayout`

## Tutarlılık Doğrulaması

### Hesaplama Mantığı (Her İkisi de Aynı):

```typescript
for (const payment of allPayments) {
  const gross = parseFloat(payment.grossAmount || "0");
  totalGross += gross;

  if (payment.platformFee && payment.providerPayout) {
    // Veritabanındaki değerleri kullan
    totalPlatformFee += parseFloat(payment.platformFee);
    totalProviderPayout += parseFloat(payment.providerPayout);
  } else {
    // Fallback: Hesapla
    const breakdown = calculatePaymentBreakdown(gross);
    totalPlatformFee += breakdown.platformFee;
    totalProviderPayout += breakdown.providerPayout;
  }
}
```

### Test

```bash
npx tsx test-admin-consistency.ts
```

**Beklenen Çıktı**:
```
=== Admin Panel Consistency Test ===

Found X completed payments

Dashboard Stats (/api/admin/stats):
  Toplam Gelir:      12000.00 THB
  Platform Payı:     3600.00 THB (%30.0)
  Psikolog Payı:     8400.00 THB (%70.0)

Doğrulama:
  Platform komisyon oranı:  %30.0
  Psikolog pay oranı:       %70.0
  Toplam:                   %100.0

✅ Hesaplamalar TUTARLI!
```

## Görsel Karşılaştırma

### Öncesi vs Sonrası

#### Dashboard (Genel Bakış):

**Öncesi**:
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Brüt Gelir  │  KDV (20%)  │ Platform    │  Psikolog   │
│             │             │ Kom. (15%)  │  Ödemeleri  │
│  12,000 THB │  2,400 THB  │  1,800 THB  │  7,800 THB  │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

**Sonrası**:
```
┌──────────────┬──────────────┬──────────────┐
│ Toplam Gelir │ Platform Payı│ Psikolog Payı│
│              │    (%30)     │    (%70)     │
│  12,000 THB  │  3,600 THB   │  8,400 THB   │
└──────────────┴──────────────┴──────────────┘
```

#### Ödemeler Sayfası:

```
┌──────────────┬──────────────┬──────────────┐
│ Toplam Gelir │ Platform Payı│ Psikolog Payı│
│              │    (%30)     │    (%70)     │
│  12,000 THB  │  3,600 THB   │  8,400 THB   │
└──────────────┴──────────────┴──────────────┘
```

**Artık her iki sayfa da aynı formatı kullanıyor!** ✅

## Önemli Notlar

### 1. Farklı Veri Kaynakları (Normal)

- **Dashboard**: TÜM tamamlanmış ödemeler
- **Ödemeler**: Filtrelenmiş ödemeler (tarih aralığı seçilebilir)

Bu NORMAL bir durumdur. Dashboard genel durumu gösterirken, Ödemeler sayfası detaylı filtreleme sunar.

### 2. Ülke Bazlı Vergi Sistemi

Sistem artık **sabit KDV** kullanmıyor. Bunun yerine:
- Her ülke için farklı vergi kuralları (`country_tax_rules` tablosu)
- Stopaj oranları ülkeye göre değişiyor
- Stripe Checkout otomatik hesaplıyor

### 3. Geriye Dönük Uyumluluk

Eski ödemelerde `platformFee` ve `providerPayout` boş olabilir. Bu durumda:
- Fallback: `calculatePaymentBreakdown()` kullanılır
- Yeni ödemeler zaten bu değerleri içeriyor

## Sonuç

✅ Dashboard ve Ödemeler sayfası artık **tutarlı**
✅ Etiketler doğru: Platform %30, Psikolog %70
✅ KDV bilgisi kaldırıldı (ülke bazlı sistem)
✅ Her iki sayfa da aynı renk şemasını kullanıyor

## İlgili Dosyalar

1. ✅ [client/src/pages/admin/dashboard.tsx](client/src/pages/admin/dashboard.tsx) - Dashboard UI
2. ✅ [client/src/pages/admin/payments.tsx](client/src/pages/admin/payments.tsx) - Ödemeler UI
3. ✅ [server/routes.ts](server/routes.ts) - Backend endpoints
4. ✅ [test-admin-consistency.ts](test-admin-consistency.ts) - Test scripti
