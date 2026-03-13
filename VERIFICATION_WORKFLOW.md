# Psikolog Doğrulama Akışı Dokümantasyonu

## 📋 Genel Bakış

MindWell platformunda psikologların hasta listesinde görünmeden önce admin onayından geçmesi gerekir. Bu doküman doğrulama akışının nasıl çalıştığını açıklar.

---

## 🔄 Doğrulama Akış Diyagramı

```
┌─────────────────────┐
│ Psikolog Kayıt Olur │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Status: pending                 │
│ verified: false                 │
│ verification_status: pending    │
│ user_profiles.status: pending   │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Admin "Psikolog Doğrulama"      │
│ sayfasında görür                │
└──────────┬──────────────────────┘
           │
           ├───► ONAYLA
           │     │
           │     ▼
           │  ┌────────────────────────────┐
           │  │ verified: true             │
           │  │ verification_status: approved│
           │  │ status: active             │
           │  │ user_profiles.status: active│
           │  │ verified_at: NOW()         │
           │  │ verified_by: admin_id      │
           │  └────────┬───────────────────┘
           │           │
           │           ▼
           │  ┌────────────────────────────┐
           │  │ Hasta "Psikolog Bul"       │
           │  │ sayfasında GÖRÜNÜR         │
           │  └────────────────────────────┘
           │
           └───► REDDET
                 │
                 ▼
              ┌────────────────────────────┐
              │ verified: false            │
              │ verification_status: rejected│
              │ status: rejected           │
              │ user_profiles.status: blocked│
              │ rejection_reason: "..."    │
              └────────┬───────────────────┘
                       │
                       ▼
              ┌────────────────────────────┐
              │ Hasta "Psikolog Bul"       │
              │ sayfasında GÖRÜNMEZ        │
              └────────────────────────────┘
```

---

## 🗄️ Veritabanı Şeması

### `psychologist_profiles` Tablosu

| Alan | Tip | Default | Açıklama |
|------|-----|---------|----------|
| `verified` | boolean | false | Onaylanma durumu |
| `verification_status` | varchar(50) | 'pending' | Doğrulama iş akışı durumu |
| `verified_at` | timestamp | null | Onaylanma zamanı |
| `verified_by` | varchar | null | Onaylayan admin user_id |
| `verification_notes` | text | null | Admin notları |
| `rejection_reason` | text | null | Red nedeni |
| `status` | varchar | 'pending' | Profil durumu |

#### Verification Status Değerleri:
- **pending**: Admin incelemesi bekliyor
- **approved**: Admin tarafından onaylandı
- **rejected**: Admin tarafından reddedildi

#### Status Değerleri:
- **pending**: Beklemede (yeni kayıt)
- **active**: Aktif ve görünür
- **rejected**: Reddedildi
- **blocked**: Engellenmiş

### `user_profiles` Tablosu

| Alan | Tip | Default | Açıklama |
|------|-----|---------|----------|
| `status` | varchar | 'active' | Kullanıcı durumu |

#### User Status Değerleri:
- **pending**: Kayıt oldu, onay bekliyor
- **active**: Aktif kullanıcı
- **blocked**: Engellenmiş

---

## 🔌 API Endpoints

### 1. Pending Psikologları Listele

```http
GET /api/admin/psychologists/pending
Authorization: Required (Admin only)
```

**Response:**
```json
[
  {
    "id": "uuid",
    "userId": "user-uuid",
    "fullName": "Dr. Ayşe Yılmaz",
    "title": "Klinik Psikolog",
    "licenseNumber": "12345",
    "bio": "...",
    "specialties": ["Anksiyete", "Depresyon"],
    "languages": ["Türkçe", "İngilizce"],
    "pricePerSession": "500.00",
    "verified": false,
    "verificationStatus": "pending",
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00Z",
    "user": {
      "id": "user-uuid",
      "email": "ayse@example.com",
      "firstName": "Ayşe",
      "lastName": "Yılmaz"
    },
    "userProfile": {
      "role": "psychologist",
      "status": "pending"
    }
  }
]
```

---

### 2. Psikoloğu Onayla

```http
POST /api/admin/psychologists/:id/approve
Authorization: Required (Admin only)
Content-Type: application/json
```

**Request Body:**
```json
{
  "notes": "Belgeler uygun, onaylandı"
}
```

**Yaptığı İşlemler:**
1. `psychologist_profiles` günceller:
   - `verified = true`
   - `verification_status = 'approved'`
   - `verified_at = NOW()`
   - `verified_by = admin_user_id`
   - `verification_notes = notes`
   - `status = 'active'`

2. `user_profiles` günceller:
   - `status = 'active'`

3. Audit log oluşturur

**Response:**
```json
{
  "id": "uuid",
  "verified": true,
  "verificationStatus": "approved",
  "status": "active",
  "verifiedAt": "2024-01-01T12:00:00Z",
  "verifiedBy": "admin-uuid"
}
```

---

### 3. Psikoloğu Reddet

```http
POST /api/admin/psychologists/:id/reject
Authorization: Required (Admin only)
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Eksik belgeler, lisans numarası doğrulanamadı"
}
```

**Yaptığı İşlemler:**
1. `psychologist_profiles` günceller:
   - `verified = false`
   - `verification_status = 'rejected'`
   - `rejection_reason = reason`
   - `status = 'rejected'`

2. `user_profiles` günceller:
   - `status = 'blocked'`

3. Audit log oluşturur

**Response:**
```json
{
  "id": "uuid",
  "verified": false,
  "verificationStatus": "rejected",
  "status": "rejected",
  "rejectionReason": "Eksik belgeler, lisans numarası doğrulanamadı"
}
```

---

### 4. Hasta Psikolog Listesi

```http
GET /api/psychologists
Authorization: Optional (Public + Authenticated)
Query Parameters:
  - search: string (optional)
  - specialty: string (optional)
  - language: string (optional)
```

**Filtreleme Kuralları:**
- ✅ `verified = true`
- ✅ `status = 'active'`
- ✅ `deleted_at IS NULL`

**Cache Headers:**
```
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
Pragma: no-cache
Expires: 0
```

**Response:** Sadece onaylı psikologlar

---

## 🖥️ Frontend Sayfaları

### 1. Admin Doğrulama Sayfası

**Path:** `/admin/verify`

**Özellikler:**
- Pending psikologları listeler
- Profil detaylarını gösterir (isim, unvan, uzmanlık, eğitim, deneyim)
- Onay/Red notları girilir
- İki buton: "Onayla" ve "Reddet"
- Onaylayınca:
  - Listeden düşer
  - Toast: "Psikolog başarıyla doğrulandı ve hasta listesinde görünür olacak"
  - `/api/psychologists` cache'i invalidate edilir
- Reddedince:
  - Listeden düşer
  - Toast: "Psikolog başvurusu reddedildi"

**Query:**
```typescript
useQuery<PsychologistProfile[]>({
  queryKey: ["/api/admin/psychologists/pending"],
});
```

---

### 2. Psikolog Dashboard

**Path:** `/dashboard` (psychologist role)

**Özellikler:**
- `verified = false` ise üstte banner gösterir:
  ```
  ⚠️ Hesabınız Admin Onayı Bekliyor
  Profiliniz inceleme aşamasındadır. Admin onayından sonra hasta
  "Psikolog Bul" sayfasında görünür olacak ve randevu alabileceksiniz.
  ```

**Query:**
```typescript
const { data: profile } = useQuery<{ verified: boolean }>({
  queryKey: ["/api/psychologist/profile"],
});
```

---

### 3. Hasta Psikolog Listesi

**Path:** `/dashboard/psychologists`

**Özellikler:**
- Sadece `verified = true` psikologları gösterir
- Cache kapalı (staleTime: 0, gcTime: 0)
- Filtreleme: isim, uzmanlık, dil

**Query:**
```typescript
const { data: psychologists } = useQuery<PsychologistProfile[]>({
  queryKey: ["/api/psychologists", { search, specialty, language }],
  staleTime: 0,
  gcTime: 0,
});
```

---

## ✅ Acceptance Criteria

### Test Senaryosu 1: Yeni Psikolog Kaydı
1. ✅ Psikolog kayıt olur (role=psychologist)
2. ✅ Hasta "Psikolog Bul" sayfasında bu psikoloğu GÖRMEZ
3. ✅ Psikolog dashboard'unda "Admin Onayı Bekliyor" banner'ı görür
4. ✅ DB kontrolü:
   - `verified = false`
   - `verification_status = 'pending'`
   - `status = 'pending'`

### Test Senaryosu 2: Admin Onaylama
1. ✅ Admin `/admin/verify` sayfasına gider
2. ✅ Yeni psikoloğu pending listede görür
3. ✅ Profil detaylarını inceler
4. ✅ Not yazıp "Onayla" butonuna basar
5. ✅ Success toast görür
6. ✅ Psikolog listeden düşer
7. ✅ Hasta "Psikolog Bul" sayfasını refresh eder
8. ✅ Onaylanan psikolog ARTIK GÖRÜNÜR
9. ✅ DB kontrolü:
   - `verified = true`
   - `verification_status = 'approved'`
   - `status = 'active'`
   - `verified_at` set
   - `verified_by` = admin_id

### Test Senaryosu 3: Admin Reddetme
1. ✅ Admin `/admin/verify` sayfasında pending psikolog görür
2. ✅ "Reddet" butonuna basar
3. ✅ Red toast görür
4. ✅ Psikolog listeden düşer
5. ✅ Hasta "Psikolog Bul" sayfasında bu psikolog GÖRÜNMEZ
6. ✅ DB kontrolü:
   - `verified = false`
   - `verification_status = 'rejected'`
   - `status = 'rejected'`
   - `rejection_reason` set
   - `user_profiles.status = 'blocked'`

### Test Senaryosu 4: Cache Testi
1. ✅ Admin yeni bir psikoloğu onayla
2. ✅ Hasta paneline git
3. ✅ Sayfa refresh YAPMADAN "Psikolog Bul"a git
4. ✅ Yeni onaylanan psikolog anında listede görünür (cache yok)

---

## 🔒 Güvenlik

### Role Guard
- ✅ Tüm `/api/admin/psychologists/*` endpoint'leri `requireRole("admin")` ile korunmuş
- ✅ Non-admin kullanıcı erişirse 403 Forbidden döner

### Input Validation
- ✅ Psychologist ID UUID formatında
- ✅ Notes/reason text alanları sanitize edilir

### Audit Logging
Her onay/red işlemi audit log'a kaydedilir:
- Actor: admin user_id
- Entity: psychologist_profile
- Action: "approved" veya "rejected"
- After Data: notes/reason

---

## 🚀 Deployment

### 1. Migration Çalıştır

```bash
# Migration dosyası
db/migrations/add_verification_status.sql

# Manuel çalıştır (varsa Drizzle kullan)
psql -U postgres -d mindwell < db/migrations/add_verification_status.sql
```

### 2. Mevcut Verileri Güncelle

Migration otomatik olarak:
- `verified = true` olanları `verification_status = 'approved'` yapar
- `verified = false` ve `status = 'rejected'` olanları `verification_status = 'rejected'` yapar
- Geri kalanları `verification_status = 'pending'` bırakır

### 3. Server Restart

```bash
npm run build
npm start
```

---

## 📝 Notlar

1. **Default Behavior:** Yeni psikolog kayıt olduğunda:
   - `verified = false`
   - `verification_status = 'pending'`
   - `status = 'pending'`
   - Hasta listesinde görünmez

2. **Admin Onayı:** Admin onayladıktan sonra:
   - `verified = true`
   - `verification_status = 'approved'`
   - `status = 'active'`
   - Hasta listesinde görünür

3. **Cache:** Psychologist listing API'si cache'lemiyor (no-store header)

4. **Real-time:** Admin onayladığı anda hasta listesinde görünür (cache yok)

---

## 🐛 Troubleshooting

### Sorun: Onaylanan psikolog hasta listesinde görünmüyor

**Çözüm 1:** Cache kontrolü
```typescript
// client/src/pages/patient/psychologists.tsx
staleTime: 0,  // ✅ Mevcut
gcTime: 0,     // ✅ Mevcut
```

**Çözüm 2:** Filtre kontrolü
```typescript
// server/storage.ts
.where(and(
  isNull(psychologistProfiles.deletedAt),
  eq(psychologistProfiles.status, "active"),  // ✅ Mevcut
  eq(psychologistProfiles.verified, true)     // ✅ Mevcut
))
```

**Çözüm 3:** Hard refresh
- Ctrl+Shift+R (Windows/Linux)
- Cmd+Shift+R (Mac)

---

## 📞 İletişim

Sorular için: admin@mindwell.com
