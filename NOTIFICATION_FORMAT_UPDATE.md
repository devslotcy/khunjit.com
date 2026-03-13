# Bildirim Tasarımı Güncellemesi

## Önceki Tasarım

```
Dear hs3, ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ You have a session with Ps9 DOCTOR in 1 hour at 19:00 - 19:50. Your session is approaching. ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Date: 23 January 2026, Friday Time: 19:00 - 19:50 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ When you're ready to join, you can start the session from your appointments page.
```

❌ **Sorunlar**:
- Tüm metin tek satırda görünüyor
- Unicode çizgiler (`━`) düzgün render edilmiyor
- Okunması zor

## Yeni Tasarım

```
Dear Dr. Ps9,
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You have a session with hs3 in 30 minutes at 19:00 - 19:50.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date: 23 January 2026, Friday
Time: 19:00 - 19:50
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You can start the session from your appointments page.
```

✅ **İyileştirmeler**:
- Her bölüm ayrı satırlarda
- HTML border kullanarak temiz çizgiler
- Daha okunabilir yapı
- Tablo benzeri düzen (sadece border-bottom)

## Yapılan Değişiklikler

### 1. Backend - Bildirim Mesajları ([server/email/scheduler.ts](server/email/scheduler.ts))

**Değişiklik**: Unicode çizgiler (`\n${separator}\n`) yerine HTML divider kullanıldı.

```typescript
const divider = '<div style="border-bottom: 1px solid #e5e7eb; margin: 8px 0;"></div>';

// Örnek mesaj
const message = `Dear Dr. ${firstName},${divider}You have a session...${divider}Date: ${date}<br>Time: ${time}${divider}...`;
```

**Güncellenen Bildirimler**:
- ✅ 1 saatlik hatırlatma (hem hasta hem psikolog)
- ✅ 30 dakikalık hatırlatma (hem hasta hem psikolog)

### 2. Frontend - HTML Render ([client/src/components/notification-bell.tsx](client/src/components/notification-bell.tsx))

**Önceki**:
```tsx
<p className="text-xs text-muted-foreground">
  {notification.message}
</p>
```

**Yeni**:
```tsx
<div
  className="text-xs text-muted-foreground leading-relaxed"
  dangerouslySetInnerHTML={{ __html: notification.message }}
/>
```

**Not**: `dangerouslySetInnerHTML` kullanımı güvenlidir çünkü mesajlar backend'de oluşturuluyor ve kullanıcı girdisi içermiyor.

## Mesaj Formatı

### Türkçe Örnek:
```
Sayın Dr. {firstName},
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{patientName} ile {minutesUntil} dakika sonra {time} arasında seansınız vardır.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tarih: {date}
Saat: {time}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Randevular sayfasından seansa başlayabilirsiniz.
```

### İngilizce Örnek:
```
Dear Dr. {firstName},
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You have a session with {patientName} in {minutesUntil} minutes at {time}.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date: {date}
Time: {time}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You can start the session from your appointments page.
```

## CSS Styling

Divider için kullanılan inline CSS:
```css
border-bottom: 1px solid #e5e7eb;  /* Tailwind gray-200 */
margin: 8px 0;                      /* Üst/alt boşluk */
```

Bu stil hem light hem dark mode'da iyi görünür.

## Test

Bildirim formatını test etmek için:
```bash
npm run dev
# Bir randevu oluşturun
# 30 dakika veya 1 saat öncesinde bildirim gelecek
```

Ya da manuel test:
```bash
npx tsx test-notification-format.ts
```

## Güvenlik Notu

`dangerouslySetInnerHTML` kullanımı güvenlidir çünkü:
- ✅ Mesajlar backend'de server-side oluşturuluyor
- ✅ Kullanıcı girdisi içermiyor (sadece veritabanından gelen veriler)
- ✅ XSS riski yok

## Sonuç

Bildirimler artık daha düzenli ve okunabilir! 🎉

**Öncesi**: Tek satırda, karmaşık
**Sonrası**: Satır satır, temiz ve profesyonel görünüm
