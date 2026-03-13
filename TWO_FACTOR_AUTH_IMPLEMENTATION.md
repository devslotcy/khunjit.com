# İki Faktörlü Kimlik Doğrulama (2FA) Implementasyonu

## Özellikler

✅ **TOTP (Time-based One-Time Password)** - Google Authenticator, Authy, Microsoft Authenticator ile uyumlu
✅ **QR Kod Desteği** - Kolay kurulum için QR kod gösterimi
✅ **Manuel Kod Girişi** - QR kod tarayamayan kullanıcılar için
✅ **Güvenli Devre Dışı Bırakma** - Şifre ve 2FA kodu ile doğrulama gerektirir
✅ **Veritabanı Entegrasyonu** - User profiles tablosunda saklanıyor
✅ **Audit Logging** - Tüm 2FA işlemleri loglanıyor

## Veritabanı Değişiklikleri

```sql
ALTER TABLE user_profiles
ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN two_factor_secret VARCHAR;
```

## Backend Endpoint'leri

### 1. 2FA Durumunu Kontrol Et
```
GET /api/2fa/status
Authorization: Required
Response: { enabled: boolean }
```

### 2. 2FA Kurulumu (QR Kod Al)
```
POST /api/2fa/setup
Authorization: Required
Response: {
  qrCode: string (Data URL),
  secret: string (Base32 encoded)
}
```

### 3. 2FA'yı Aktifleştir
```
POST /api/2fa/enable
Authorization: Required
Body: { token: string (6 haneli kod) }
Response: { success: boolean, message: string }
```

### 4. 2FA'yı Devre Dışı Bırak
```
POST /api/2fa/disable
Authorization: Required
Body: {
  token: string (6 haneli kod),
  password: string
}
Response: { success: boolean, message: string }
```

### 5. Login Sırasında 2FA Doğrula
```
POST /api/2fa/verify
Body: {
  email: string,
  token: string (6 haneli kod)
}
Response: { success: boolean, verified: boolean }
```

## Frontend Kullanımı

### Settings Sayfasında 2FA Yönetimi

```tsx
import { TwoFactorSetup } from "@/components/two-factor-setup";

// Settings sayfasında kullanım:
<TwoFactorSetup />
```

Kullanıcı arayüzü:
- ✅ **Aktifleştir** butonu ile QR kod modal'ı açılır
- ✅ Google Authenticator ile QR kod taranır
- ✅ Manuel kod girişi için secret gösterilir ve kopyalanabilir
- ✅ Authenticator'dan gelen 6 haneli kod ile doğrulama
- ✅ **Devre Dışı Bırak** için şifre + 2FA kodu gerekli

## Kullanıcı Akışı

### 2FA Aktifleştirme:
1. Ayarlar → Güvenlik → "Aktifleştir"
2. QR kodu Google Authenticator ile tara
3. Authenticator'da görünen 6 haneli kodu gir
4. 2FA aktif! ✅

### 2FA ile Giriş:
1. Email + Şifre ile giriş yap
2. 2FA aktifse, doğrulama ekranı gösterilir
3. Authenticator'dan 6 haneli kodu gir
4. Giriş başarılı! ✅

### 2FA Devre Dışı Bırakma:
1. Ayarlar → Güvenlik → "Devre Dışı Bırak"
2. Şifrenizi girin
3. Authenticator'dan 6 haneli kodu gir
4. 2FA devre dışı! ❌

## Güvenlik Özellikleri

- ✅ **Time-based tokens**: 30 saniyelik pencere
- ✅ **Clock drift tolerance**: ±60 saniye (window: 2)
- ✅ **Password verification**: Devre dışı bırakma için şifre gerekli
- ✅ **Session validation**: Setup sırasında geçici secret session'da
- ✅ **Audit logging**: Tüm 2FA işlemleri loglanıyor
- ✅ **Secret storage**: Base32 encoded, database'de saklanıyor

## Paketler

```json
{
  "speakeasy": "^2.0.0",
  "qrcode": "^1.5.3",
  "@types/qrcode": "^1.5.5",
  "@types/speakeasy": "^2.0.10"
}
```

## ✅ Login Flow Entegrasyonu

Login sayfasına 2FA doğrulama adımı eklendi:
1. ✅ Email/password başarılı olunca 2FA kontrolü yapılıyor
2. ✅ Eğer 2FA aktifse, aynı sayfada doğrulama ekranı gösteriliyor
3. ✅ 6 haneli kod doğrulanıyor (`POST /api/2fa/verify`)
4. ✅ Başarılı doğrulama sonrası session oluşturuluyor
5. ✅ Dashboard'a yönlendiriliyor
6. ✅ Audit log'a `logged_in_with_2fa` kaydı atılıyor

## Test Etme

1. Settings sayfasına git: `http://localhost:5173/settings`
2. Güvenlik kartında "Aktifleştir" butonuna tıkla
3. Google Authenticator ile QR kodu tara
4. Authenticator'dan gelen kodu gir
5. 2FA aktif olduğunu gör ✅
6. "Devre Dışı Bırak" ile test et

## Production Considerations

- [ ] Secret encryption: Veritabanında encrypted olarak saklanabilir
- [ ] Backup codes: Telefon kaybında kurtarma için
- [ ] Recovery email: 2FA sıfırlama için
- [ ] Rate limiting: Brute force saldırılarına karşı
- [ ] SMS 2FA: Alternatif yöntem olarak
- [ ] Remember device: Güvenilir cihazlar için
