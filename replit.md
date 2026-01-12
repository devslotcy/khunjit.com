# MindWell - Online Psikolojik Destek Platformu

## Proje Genel Bakışı
MindWell, hasta, psikolog ve admin olmak üzere üç farklı kullanıcı rolüyle çalışan kapsamlı bir online psikolojik destek platformudur.

## Teknoloji Stack'i
- **Frontend**: React + Vite + TypeScript
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (Drizzle ORM)
- **Authentication**: Replit Auth (OIDC)
- **Styling**: Tailwind CSS + shadcn/ui
- **Video**: Jitsi Meet embed

## Kullanıcı Rolleri

### Hasta (Patient)
- Psikolog keşfet ve profil incele
- Müsait slotlardan randevu al
- Mock ödeme sistemi ile ödeme yap
- Video görüşme ile seanslara katıl
- Psikologlarla mesajlaş

### Psikolog
- Müsaitlik saatlerini yönet
- Randevuları görüntüle
- Video seanslar yap
- Hastalarla mesajlaş
- Seans notları tut
- Kazançları takip et

### Admin
- Kullanıcı yönetimi
- Psikolog doğrulama
- Şikayet mesajları incele
- Platform ayarları
- Denetim günlükleri

## Veritabanı Tabloları
- `users` / `sessions` - Replit Auth
- `user_profiles` - Kullanıcı profilleri ve rolleri
- `psychologist_profiles` - Psikolog detayları
- `availability_rules` - Haftalık müsaitlik kuralları
- `availability_exceptions` - Tatil/özel günler
- `appointments` - Randevular
- `payments` - Ödemeler ve komisyon hesaplama
- `conversations` - Mesajlaşma konuşmaları
- `messages` - Mesajlar
- `session_notes` - Seans notları
- `audit_logs` - Denetim günlükleri

## Önemli Özellikler

### Randevu Sistemi
- 50 dakikalık varsayılan seans süresi
- 10 dakikalık rezervasyon timeout
- Slot bazlı müsaitlik yönetimi
- **Double-booking koruması**: Partial unique index ile DB seviyesinde garanti
- Slot çakışma kontrolü reserve endpoint'inde

### Ödeme Sistemi (Mock)
- %20 KDV
- %15 platform komisyonu
- Detaylı ödeme dökümü
- **Ödeme kilidi**: Seans bilgisi sadece ödeme sonrası erişilebilir

### Video Görüşme
- Jitsi Meet embed
- Seans 10 dakika önce katılım
- Otomatik seans durumu güncellemesi
- **Güvenli meeting room**: Crypto hash ile tahmin edilemez oda isimleri
- **Join code**: Ödeme sonrası oluşturulan katılım kodu

### Timezone Desteği
- Tüm tarihler UTC olarak saklanır
- Kullanıcı profili timezone tercihi
- Frontend'de yerel saat gösterimi

## Dizin Yapısı
```
├── client/
│   ├── src/
│   │   ├── components/     # UI bileşenleri
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utility fonksiyonlar
│   │   └── pages/          # Sayfa bileşenleri
│   │       ├── patient/    # Hasta sayfaları
│   │       ├── psychologist/ # Psikolog sayfaları
│   │       └── admin/      # Admin sayfaları
├── server/
│   ├── routes.ts           # API endpoints
│   ├── storage.ts          # Database operations
│   └── replit_integrations/ # Auth modülü
└── shared/
    ├── schema.ts           # Drizzle models
    └── models/             # Auth models
```

## Çalıştırma
```bash
npm run dev
```

## Veritabanı
```bash
npm run db:push    # Schema sync
npm run db:studio  # Drizzle Studio
```

## Tasarım
- Calming teal/cyan renk paleti
- Inter + Manrope fontları
- Material Design healthcare adaptasyonları
- Koyu/Açık tema desteği
