# Bildirim Sistemi (Notification System)

## Genel Bakış

KhunJit platformuna eksiksiz bir bildirim sistemi eklendi. Sistem hem tarayıcı içi bildirimler hem de native browser notification'ları destekler.

## Özellikler

### 1. Backend (Server-side)

#### Database Schema
- **notifications** tablosu eklendi
- İndeksler: user_id, user_id + is_read, created_at
- Notification tipleri:
  - `booking_received` - Psikolog: Yeni randevu talebi
  - `booking_confirmed` - Hasta: Randevu onaylandı
  - `booking_cancelled` - Her ikisi: Randevu iptal edildi
  - `session_starting_soon` - Her ikisi: Seans yaklaşıyor (ileride)
  - `message_received` - Her ikisi: Yeni mesaj geldi
  - `payment_received` - Psikolog: Ödeme alındı
  - `verification_approved` - Psikolog: Hesap onaylandı (ileride)
  - `verification_rejected` - Psikolog: Hesap reddedildi (ileride)

#### API Endpoints
```
GET    /api/notifications              - Kullanıcı bildirimlerini getir
GET    /api/notifications/unread-count - Okunmamış bildirim sayısı
POST   /api/notifications/:id/read     - Bildirimi okundu işaretle
POST   /api/notifications/read-all     - Tümünü okundu işaretle
DELETE /api/notifications/:id          - Bildirimi sil
```

#### Notification Helper Functions
`server/notifications.ts`:
- `createNotification()` - Bildirim oluştur
- `getUserNotifications()` - Kullanıcı bildirimlerini getir
- `getUnreadCount()` - Okunmamış sayısı
- `markAsRead()` - Okundu işaretle
- `markAllAsRead()` - Tümünü okundu işaretle
- `deleteNotification()` - Sil

#### Event Tetikleyiciler
Bildirimler aşağıdaki durumlarda otomatik oluşturulur:

1. **Randevu Talebi** (`/api/appointments/request`)
   - Psikolog'a `booking_received` bildirimi gönderilir

2. **Randevu Onayı** (`/api/appointments/:id/approve`)
   - Hasta'ya `booking_confirmed` bildirimi gönderilir

3. **Ödeme Onayı** (`/api/appointments/payment/simulate-complete`)
   - Psikolog'a `payment_received` bildirimi gönderilir

4. **Yeni Mesaj** (`/api/conversations/:id/messages`)
   - Alıcıya `message_received` bildirimi gönderilir

### 2. Frontend (Client-side)

#### Custom Hook: `useNotifications()`
`client/src/hooks/use-notifications.ts`:

```typescript
const {
  notifications,        // Bildirim listesi
  unreadCount,         // Okunmamış sayısı
  isLoading,           // Yükleme durumu
  markAsRead,          // Okundu işaretle
  markAllAsRead,       // Tümünü okundu işaretle
  deleteNotification,  // Sil
  requestPermission,   // Browser notification izni iste
  isPolling,           // Polling durumu
  setIsPolling,        // Polling'i durdur/başlat
} = useNotifications();
```

**Özellikler:**
- 10 saniyede bir otomatik polling (real-time güncellemeler)
- Yeni bildirim geldiğinde otomatik:
  - Toast bildirimi gösterir
  - Browser notification gösterir (izin varsa)
  - Ses çalar (Web Audio API)

#### UI Components

**NotificationBell Component**
`client/src/components/notification-bell.tsx`:
- Bell icon ile dropdown menü
- Okunmamış bildirim badge'i
- Son 20 bildirimi listeler
- "Tümünü Okundu İşaretle" butonu
- Bildirimlere tıklayınca ilgili sayfaya yönlendirme

**Dashboard Layout Entegrasyonu**
`client/src/components/layouts/dashboard-layout.tsx`:
- Bell icon header'a eklendi
- Tüm kullanıcı rolleri için görünür (patient, psychologist, admin)

### 3. Browser Notifications

#### İzin İsteme
```typescript
import { requestNotificationPermission } from '@/hooks/use-notifications';

// Component mount olduğunda otomatik çağrılır
useEffect(() => {
  requestNotificationPermission();
}, []);
```

#### Native Notification Özellikleri
- Icon: `/favicon.ico`
- Badge: `/favicon.ico`
- Tıklanabilir: ActionUrl'e yönlendirir
- Otomatik window focus

### 4. Ses Bildirimleri

Web Audio API kullanılarak oluşturulur:
- Frekans: 800 Hz
- Süre: 0.5 saniye
- Tip: Sine wave
- Volume: 0.3 (fade out)

## Kullanım Örnekleri

### Backend'de Bildirim Gönderme

```typescript
import * as notificationService from "./notifications";

// Basit bildirim
await notificationService.createNotification({
  userId: "user-123",
  type: "booking_received",
  title: "Yeni Randevu Talebi",
  message: "Bir hasta sizden randevu talep etti",
  actionUrl: "/psychologist/appointments",
  relatedAppointmentId: appointmentId,
});

// Metadata ile
await notificationService.createNotification({
  userId: psychologistUserId,
  type: "payment_received",
  title: "Ödeme Alındı",
  message: `Randevunuz için ödeme alındı`,
  actionUrl: `/dashboard/appointments`,
  relatedAppointmentId: appointmentId,
  metadata: {
    paymentId: paymentId,
    amount: "1500.00",
    currency: "THB",
  },
});
```

### Frontend'de Hook Kullanımı

```typescript
import { useNotifications } from '@/hooks/use-notifications';

function MyComponent() {
  const { notifications, unreadCount, markAsRead } = useNotifications();

  return (
    <div>
      <span>Okunmamış: {unreadCount}</span>
      {notifications.map(notif => (
        <div key={notif.id} onClick={() => markAsRead(notif.id)}>
          {notif.title}
        </div>
      ))}
    </div>
  );
}
```

## Gelecek Geliştirmeler (TODO)

1. **Seans Hatırlatmaları**
   - 24 saat öncesi
   - 1 saat öncesi
   - 15 dakika öncesi

2. **Verification Bildirimleri**
   - Psikolog onaylandı
   - Psikolog reddedildi

3. **İptal Bildirimleri**
   - Randevu iptal edildi
   - İade işlemi tamamlandı

4. **WebSocket Real-time**
   - Polling yerine Socket.io kullanımı
   - Anlık bildirim push

5. **Push Notifications (Service Worker)**
   - Tarayıcı kapalıyken bile bildirim
   - Progressive Web App (PWA) entegrasyonu

6. **Bildirim Tercihleri**
   - Kullanıcı hangi bildirimleri alacağını seçebilir
   - Email bildirimleri ile entegrasyon

7. **Bildirim Geçmişi Sayfası**
   - Tüm bildirimleri listeleme
   - Filtreleme ve arama
   - Toplu işlemler

## Teknik Detaylar

### Polling Mekanizması
- React Query `refetchInterval` kullanılır
- Varsayılan: 10 saniye
- `setIsPolling(false)` ile durdurulabilir

### Browser Notification Permissions
- "default" - Henüz sorulmadı
- "granted" - İzin verildi
- "denied" - Reddedildi

### Veritabanı Performansı
- `idx_notifications_user_read` indexi sayesinde hızlı sorgulama
- `limit` parametresi ile sayfalama desteği

### Güvenlik
- Tüm endpoint'ler `isAuthenticated` middleware kullanır
- Kullanıcı sadece kendi bildirimlerini görebilir
- SQL injection koruması (Drizzle ORM)

## Test Senaryosu

1. **Randevu Talebi Testi**
   - Patient olarak giriş yap
   - Bir psikolog seç ve randevu talep et
   - Psikolog olarak giriş yap
   - Bell icon'da yeni bildirim görünmeli
   - Browser notification gelmeli (izin varsa)
   - Ses çalmalı

2. **Randevu Onay Testi**
   - Psikolog olarak randevu onayla
   - Patient olarak giriş yap
   - Onay bildirimi görünmeli

3. **Ödeme Testi**
   - Patient olarak ödeme yap
   - Psikolog olarak giriş yap
   - Ödeme alındı bildirimi görünmeli

4. **Mesaj Testi**
   - Bir kullanıcı olarak mesaj gönder
   - Diğer kullanıcı olarak giriş yap
   - Mesaj bildirimi görünmeli

## Migration

Migration dosyası: `migrations/0001_add_notifications.sql`

```sql
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL,
  "type" varchar NOT NULL,
  "title" varchar(255) NOT NULL,
  "message" text NOT NULL,
  "action_url" varchar,
  "related_appointment_id" varchar,
  "related_conversation_id" varchar,
  "is_read" boolean DEFAULT false,
  "read_at" timestamp,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX "idx_notifications_user" ON "notifications" ("user_id");
CREATE INDEX "idx_notifications_user_read" ON "notifications" ("user_id", "is_read");
CREATE INDEX "idx_notifications_created" ON "notifications" ("created_at");
```

## Dosya Yapısı

```
server/
  ├── notifications.ts           # Helper functions
  └── routes.ts                  # API endpoints & triggers

client/
  ├── src/
  │   ├── hooks/
  │   │   └── use-notifications.ts    # Custom hook
  │   └── components/
  │       ├── notification-bell.tsx   # Bell UI component
  │       └── layouts/
  │           └── dashboard-layout.tsx # Layout integration

shared/
  └── schema.ts                  # Database schema

migrations/
  └── 0001_add_notifications.sql # Database migration
```

## Sonuç

Bildirim sistemi başarıyla entegre edildi ve aşağıdaki avantajları sağlar:

✅ Kullanıcı deneyimini iyileştirir (instant feedback)
✅ Platform etkileşimini artırır (engagement)
✅ Randevu ve ödeme süreçlerini takip etmeyi kolaylaştırır
✅ Mesajlaşma akışını hızlandırır
✅ Ölçeklenebilir altyapı (WebSocket'e geçiş kolay)
✅ Ücretsiz ve platform bağımsız (browser API'leri)
