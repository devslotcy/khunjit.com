# MindWell - Online Psikolojik Destek Platformu

## Proje Genel Bakışı
MindWell, hasta, psikolog ve admin olmak üzere üç farklı kullanıcı rolüyle çalışan kapsamlı bir online psikolojik destek platformudur.

## Teknoloji Stack'i
- **Frontend**: React + Vite + TypeScript
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (Drizzle ORM)
- **Authentication**: Dual auth support (Replit Auth OIDC + Email/Password with bcrypt)
- **Styling**: Tailwind CSS + shadcn/ui
- **Video**: Jitsi Meet embed

## Authentication Sistemi
- **Replit Auth**: OIDC tabanlı, mevcut Replit hesabıyla giriş
- **Email/Password**: bcrypt ile hash, session-based authentication
- Her iki yöntem de aynı middleware ile desteklenir
- Kayıt sırasında kullanıcı bilgileri: email, username, password, firstName, lastName, role
- Profil bilgileri: phone, birthDate, gender, city, profession, bio, timezone

### Auth Endpoints
- `POST /api/auth/register` - Email/şifre ile kayıt
- `POST /api/auth/login` - Email/şifre ile giriş
- `POST /api/auth/logout` - Çıkış
- `GET /api/auth/me` - Mevcut kullanıcı bilgisi (her iki auth yöntemi)
- `GET /api/auth/user` - Kullanıcı detayları
- `GET /api/login` - Replit Auth ile giriş
- `GET /api/logout` - Replit Auth çıkış

### Auth Sayfaları
- `/login` - Email/şifre giriş sayfası
- `/role-select` - Rol seçim sayfası (Hasta/Psikolog)
- `/register?role=patient` - Hasta kayıt formu (3 adım)
- `/register?role=psychologist` - Psikolog kayıt formu (4 adım)

### Rol Bazlı Kayıt Akışı
1. Kullanıcı `/role-select` sayfasından rol seçer
2. Seçilen role göre kayıt formuna yönlendirilir
3. **Hasta**: 3 adımlı form (hesap, kişisel, iletişim bilgileri)
4. **Psikolog**: 4 adımlı form (hesap, kişisel, profesyonel, uzmanlık alanları)

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
- Kullanıcı yönetimi (tüm kullanıcıları görüntüle, askıya al)
- Psikolog doğrulama (bekleyen başvuruları onayla/reddet)
- Finansal yönetim (gelir-gider özeti, platform komisyonu takibi)
- Şikayet mesajları incele
- İade talepleri yönetimi
- Platform ayarları (KDV, komisyon oranları)
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

## Kurulum (Yerel Bilgisayar)

### Gereksinimler
- Node.js 18+
- PostgreSQL 14+
- npm veya yarn

### Kurulum Adımları
```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Environment değişkenlerini ayarla (.env dosyası oluştur)
DATABASE_URL=postgresql://kullanici:sifre@localhost:5432/mindwell
SESSION_SECRET=guclu-bir-secret-key-32-karakter

# 3. Veritabanını oluştur ve tabloları sync et
npm run db:push

# 4. Uygulamayı başlat
npm run dev
```

### Admin Hesabı Oluşturma
İki yöntemle admin hesabı oluşturabilirsiniz:

**Yöntem 1 - API ile (Önerilen):**
```bash
curl -X POST http://localhost:5005/api/seed-admin
```
Bu, aşağıdaki bilgilerle varsayılan admin hesabı oluşturur:
- **Email**: admin@mindwell.com
- **Şifre**: admin123
- **Not**: Giriş yaptıktan sonra şifrenizi değiştirin!

**Yöntem 2 - Manuel SQL:**
```sql
UPDATE user_profiles SET role = 'admin' WHERE user_id = 'KULLANICI_ID';
```

## Çalıştırma
```bash
npm run dev          # Development server (port 5005)
npm run build        # Production build
npm start            # Production server
```

## Veritabanı Komutları
```bash
npm run db:push      # Schema sync
npm run db:studio    # Drizzle Studio (DB yönetimi)
npm run db:generate  # Migration oluştur
npm run db:migrate   # Migration uygula
```

## Tasarım
- Calming teal/cyan renk paleti
- Inter + Manrope fontları
- Material Design healthcare adaptasyonları
- Koyu/Açık tema desteği

## Test Kullanıcıları
Kayıt sayfasından (`/register`) aşağıdaki rollerde hesap oluşturabilirsiniz:
- **Hasta (patient)**: Psikolog arama ve randevu alma
- **Psikolog (psychologist)**: Randevu yönetimi ve seanslar
- **Admin**: `/api/seed-admin` endpoint'i ile oluşturulur veya veritabanından role güncellemesi gerekir

### Varsayılan Admin Hesabı
`POST /api/seed-admin` endpoint'i çağrıldığında oluşturulur:
- **Email**: admin@mindwell.com
- **Şifre**: admin123
