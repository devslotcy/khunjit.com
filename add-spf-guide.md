# 🔧 SPF Kaydı Ekleme Rehberi

## Neden SPF Gerekli?

Gmail gibi email sağlayıcıları SPF kaydı olmayan domainlerden gelen emailleri:
- Spam klasörüne atar
- Veya tamamen reddeder (bounce)

## SPF Kaydı Nasıl Eklenir?

### 1. Domain Yönetim Paneline Git
- GoDaddy, Cloudflare, Namecheap, veya hosting provider
- DNS Management bölümüne git

### 2. TXT Kaydı Ekle

**Ayarlar:**
```
Type: TXT
Name: @ (veya khunjit.com)
Value: v=spf1 a mx ip4:68.178.172.92 ~all
TTL: 3600 (veya default)
```

**Alternatif (daha basit):**
```
v=spf1 mx a ~all
```

### 3. Kaydet ve Bekle
- Kayıt ettikten sonra 5-30 dakika bekle (DNS propagation)

### 4. Doğrula

Terminal'de test et:
```bash
dig +short TXT khunjit.com | grep spf
```

Veya online tool kullan:
- https://mxtoolbox.com/spf.aspx
- https://www.dmarcanalyzer.com/spf/checker/

## SPF Kaydı Formatı

```
v=spf1 a mx ip4:68.178.172.92 ~all
```

Açıklama:
- `v=spf1` - SPF version 1
- `a` - Domain A kaydındaki IP'ye izin ver
- `mx` - MX kayıtlarındaki sunuculara izin ver
- `ip4:68.178.172.92` - Bu IP'ye direkt izin ver (SMTP sunucunuz)
- `~all` - Diğerleri için soft fail (spam olarak işaretle ama reddetme)

## Plesk Kullanıyorsan

Plesk panelde:
1. Domains > khunjit.com > DNS Settings
2. "Add Record" tıkla
3. Record type: TXT
4. Enter text: `v=spf1 a mx ip4:68.178.172.92 ~all`
5. Save

## cPanel Kullanıyorsan

cPanel'de:
1. Zone Editor
2. khunjit.com seç
3. "Add Record" > TXT Record
4. Name: @ (boş bırak)
5. TXT Data: `v=spf1 a mx ip4:68.178.172.92 ~all`
6. Add Record
