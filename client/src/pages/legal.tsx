import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft, FileText, Shield, Scale, RefreshCw } from "lucide-react";

const legalDocuments: Record<string, { title: string; icon: typeof FileText; content: string }> = {
  kvkk: {
    title: "KVKK Aydınlatma Metni",
    icon: Shield,
    content: `
# Kişisel Verilerin Korunması Hakkında Aydınlatma Metni

## 1. Veri Sorumlusu
MindWell Online Psikolojik Destek Platformu ("MindWell" veya "Şirket") olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla hareket etmekteyiz.

## 2. Toplanan Kişisel Veriler
Platform üzerinden aşağıdaki kişisel verileriniz toplanabilmektedir:
- Kimlik bilgileri (ad, soyad)
- İletişim bilgileri (e-posta, telefon)
- Sağlık verileri (terapi seansları, notlar)
- Finansal bilgiler (ödeme kayıtları)
- Görsel kayıtlar (profil fotoğrafı)

## 3. Verilerin İşlenme Amacı
Kişisel verileriniz:
- Platform hizmetlerinin sunulması
- Randevu yönetimi
- Ödeme işlemlerinin gerçekleştirilmesi
- Yasal yükümlülüklerin yerine getirilmesi
amaçlarıyla işlenmektedir.

## 4. Verilerin Aktarımı
Kişisel verileriniz, yasal zorunluluklar ve hizmet sunumu kapsamında yetkili kurum ve kuruluşlarla paylaşılabilir.

## 5. Haklarınız
KVKK'nın 11. maddesi kapsamında:
- Kişisel verilerinizin işlenip işlenmediğini öğrenme
- İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme
- Verilerinizin düzeltilmesini veya silinmesini talep etme
haklarına sahipsiniz.

## 6. İletişim
Talepleriniz için: destek@mindwell.com
    `
  },
  gizlilik: {
    title: "Gizlilik Politikası",
    icon: Shield,
    content: `
# Gizlilik Politikası

## 1. Giriş
MindWell olarak gizliliğinize önem veriyoruz. Bu politika, platformumuzu kullanırken kişisel bilgilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklar.

## 2. Bilgi Toplama
Aşağıdaki bilgiler toplanabilir:
- Kayıt sırasında verdiğiniz bilgiler
- Platform kullanımı sırasında oluşan veriler
- Çerezler ve benzer teknolojiler aracılığıyla toplanan veriler

## 3. Bilgi Kullanımı
Topladığımız bilgileri:
- Hizmetlerimizi sunmak ve geliştirmek
- Size özelleştirilmiş deneyim sağlamak
- Güvenliği sağlamak
- Yasal yükümlülüklerimizi yerine getirmek
için kullanırız.

## 4. Bilgi Güvenliği
- Tüm veriler şifrelenerek saklanır
- SSL sertifikası ile güvenli bağlantı sağlanır
- Düzenli güvenlik denetimleri yapılır
- Personel gizlilik eğitimi alır

## 5. Üçüncü Taraflar
Bilgileriniz yalnızca:
- Hizmet sağlayıcılarımızla (ödeme işleyicileri)
- Yasal zorunluluk durumlarında
paylaşılabilir.

## 6. Çerezler
Platform, deneyiminizi geliştirmek için çerezler kullanır. Tarayıcı ayarlarınızdan çerezleri yönetebilirsiniz.

## 7. Değişiklikler
Bu politika zaman zaman güncellenebilir. Önemli değişiklikler e-posta ile bildirilir.
    `
  },
  kullanim: {
    title: "Kullanım Şartları",
    icon: Scale,
    content: `
# Kullanım Şartları

## 1. Kabul
MindWell platformunu kullanarak bu şartları kabul etmiş sayılırsınız.

## 2. Hizmet Tanımı
MindWell, hastalar ve lisanslı psikologlar arasında online terapi seansları için bir platform sağlar. Platform, tıbbi tavsiye yerine geçmez.

## 3. Hesap Oluşturma
- 18 yaşından büyük olmalısınız
- Doğru ve güncel bilgi sağlamalısınız
- Hesap güvenliğinizden siz sorumlusunuz

## 4. Randevu ve Ödemeler
- Randevular 50 dakikalık seanslar içindir
- Rezervasyonlar 10 dakika içinde ödeme yapılmazsa iptal edilir
- Ödemeler platform üzerinden güvenli şekilde alınır

## 5. İptal ve İade
- 24 saat öncesine kadar iptal ücretsizdir
- 24 saat içi iptallerde %50 iade yapılır
- Seans saatinden sonra iptal yapılamaz

## 6. Kullanıcı Sorumlulukları
Kullanıcılar:
- Platformu yasalara uygun kullanmalı
- Diğer kullanıcılara saygılı olmalı
- Gizli bilgileri paylaşmamalı
- Hizmetleri kötüye kullanmamalıdır

## 7. Fikri Mülkiyet
Platform içeriği MindWell'e aittir. İzinsiz kullanım yasaktır.

## 8. Sorumluluk Sınırlaması
MindWell, platform kullanımından doğabilecek dolaylı zararlardan sorumlu değildir.

## 9. Uyuşmazlıklar
Bu şartlar Türkiye Cumhuriyeti yasalarına tabidir. Uyuşmazlıklar İstanbul mahkemelerinde çözülür.
    `
  },
  iptal: {
    title: "İptal ve İade Politikası",
    icon: RefreshCw,
    content: `
# İptal ve İade Politikası

## 1. Randevu İptali

### Hasta Tarafından İptal
- **24 saat öncesine kadar**: %100 iade
- **12-24 saat öncesi**: %50 iade
- **12 saat içi**: İade yapılmaz
- **Seans başladıktan sonra**: İade yapılmaz

### Psikolog Tarafından İptal
- Psikolog iptali durumunda %100 iade yapılır
- Mümkün olduğunca alternatif seans önerilir

## 2. No-Show (Katılmama)

### Hasta No-Show
- Hasta seansa katılmazsa ücret iade edilmez
- Tekrarlayan no-show durumlarında hesap kısıtlanabilir

### Psikolog No-Show
- Psikolog seansa katılmazsa %100 iade yapılır
- Hasta tazminat olarak bir ücretsiz seans hakkı kazanır

## 3. Teknik Sorunlar
- Platform kaynaklı teknik sorunlarda seans yeniden planlanır veya iade yapılır
- Kullanıcı kaynaklı bağlantı sorunlarından MindWell sorumlu değildir

## 4. İade Süreci
- İade talepleri 7 iş günü içinde işlenir
- İade, orijinal ödeme yöntemine yapılır
- Banka işlem süreleri eklenebilir

## 5. İstisnalar
Aşağıdaki durumlarda iade yapılmaz:
- Hizmet şartlarını ihlal eden kullanıcılar
- Sahte veya hileli işlemler
- Platform kurallarını çiğneyen durumlar

## 6. İletişim
İade ve iptal işlemleri için:
- Platform üzerinden destek talebi oluşturun
- E-posta: destek@mindwell.com
    `
  }
};

export default function LegalPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const document = slug ? legalDocuments[slug] : null;

  if (!slug) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back-home">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <span className="text-xl font-serif font-bold text-primary">MindWell</span>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="container mx-auto px-4 py-12">
          <h1 className="font-serif text-3xl font-bold mb-8">Yasal Belgeler</h1>
          <div className="grid md:grid-cols-2 gap-6">
            {Object.entries(legalDocuments).map(([key, doc]) => {
              const Icon = doc.icon;
              return (
                <Link key={key} href={`/legal/${key}`}>
                  <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-legal-${key}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <Icon className="w-6 h-6 text-primary" />
                        {doc.title}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Belge Bulunamadı</h1>
          <Link href="/legal">
            <Button>Yasal Belgelere Dön</Button>
          </Link>
        </div>
      </div>
    );
  }

  const Icon = document.icon;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/legal">
              <Button variant="ghost" size="icon" data-testid="button-back-legal">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <span className="text-xl font-serif font-bold text-primary">MindWell</span>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Icon className="w-8 h-8 text-primary" />
              {document.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {document.content.split('\n').map((line, i) => {
                if (line.startsWith('# ')) {
                  return <h1 key={i} className="text-2xl font-bold mt-6 mb-4">{line.slice(2)}</h1>;
                }
                if (line.startsWith('## ')) {
                  return <h2 key={i} className="text-xl font-semibold mt-6 mb-3">{line.slice(3)}</h2>;
                }
                if (line.startsWith('### ')) {
                  return <h3 key={i} className="text-lg font-medium mt-4 mb-2">{line.slice(4)}</h3>;
                }
                if (line.startsWith('- ')) {
                  return <li key={i} className="ml-4">{line.slice(2)}</li>;
                }
                if (line.trim() === '') {
                  return null;
                }
                return <p key={i} className="mb-2">{line}</p>;
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
