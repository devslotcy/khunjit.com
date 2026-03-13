# 🔐 DKIM DNS Kayıtlarını Ekleme

## ✅ Plesk'te DKIM Oluşturuldu

Şimdi bu 2 TXT kaydını DNS'e eklemen gerekiyor:

## 📝 Eklenecek DNS Kayıtları

### Kayıt 1: DKIM Public Key
```
Type: TXT
Name: default._domainkey
Value: v=DKIM1; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApYwUGq3GRN2QeOQzE+EXFRijxDXLK/IuSmX5Mhtumol3fy7tQVeNtyhNZRP1epwwIRgSLEwXipscnM+X+XDsN/Te+TaUHCkQFXKVtDO/k0rlgJfwSU0An1Xm/i+TuSY3dGg/E4D+PuUCQFLGFP2yHAaCvTuR93uvDWkuETLicwi7a836jjkPCbWjG5dVDsnCtajVIPTX+47/rWWROa+3farpvJpinQDGbb0UaUnlmjuBj3+Y3feeB/CvmDBSlCOSdkPflVdUo+0Eb/2/Fudgqlx+SZOYdVojmjqCsdBWMrgjL7EC4PTs84SfsI7b+l26U0MqP4YIQD/PIRAvJu+r4wIDAQAB;
TTL: 3600
```

### Kayıt 2: DKIM Policy
```
Type: TXT
Name: _domainkey
Value: o=-
TTL: 3600
```

## 🔧 Nasıl Eklersin?

### GoDaddy DNS Yönetimi
1. GoDaddy'ye giriş yap
2. Domains > khunjit.com > DNS
3. "Add" butonuna tıkla
4. İki kayıt ekle (yukarıdaki gibi)
5. Save

### ⏱️ Bekleme Süresi
- DNS propagation: 5-30 dakika
- Bazen 1-2 saat sürebilir

## ✅ Kontrol

DNS yayıldıktan sonra kontrol et:
```bash
dig +short TXT default._domainkey.khunjit.com
dig +short TXT _domainkey.khunjit.com
```

Doğru gelirse DKIM aktif demektir!
