import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  Brain, 
  Video, 
  Shield, 
  Clock, 
  Heart, 
  CheckCircle2, 
  ArrowRight,
  MessageCircle,
  Calendar,
  Lock
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-serif text-xl font-semibold">MindWell</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">
                Özellikler
              </a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-how">
                Nasıl Çalışır
              </a>
              <a href="#psychologists" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-psychologists">
                Psikologlar
              </a>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button variant="ghost" asChild data-testid="button-login">
                <a href="/api/login">Giriş Yap</a>
              </Button>
              <Button asChild data-testid="button-start">
                <a href="/api/login">
                  Başla
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Shield className="w-4 h-4" />
                Güvenli ve Gizli
              </div>
              
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                Online Psikolojik
                <span className="text-primary"> Destek</span>
                <br />
                Evinizin Konforunda
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-xl">
                Uzman psikologlarımızla görüntülü görüşme yaparak, duygusal ve mental sağlığınız için 
                profesyonel destek alın. Her zaman, her yerde yanınızdayız.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="text-base px-8" asChild data-testid="button-hero-start">
                  <a href="/api/login">
                    Hemen Başla
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" className="text-base px-8" asChild data-testid="button-hero-explore">
                  <a href="#psychologists">
                    Psikologları Keşfet
                  </a>
                </Button>
              </div>

              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span>Ücretsiz kayıt</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span>7/24 destek</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span>Uzman psikologlar</span>
                </div>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="relative z-10">
                <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8">
                  <div className="w-full h-full rounded-2xl bg-card border border-card-border shadow-xl flex items-center justify-center">
                    <div className="text-center space-y-6 p-8">
                      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <Video className="w-12 h-12 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-serif text-2xl font-semibold mb-2">Görüntülü Görüşme</h3>
                        <p className="text-muted-foreground">
                          Yüz yüze görüşme kalitesinde, güvenli video seansları
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-8 -left-8 w-64 h-64 bg-chart-2/10 rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
              Neden MindWell?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Modern ve güvenli platformumuz ile psikolojik destek almak hiç bu kadar kolay olmamıştı
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-card-border hover-elevate">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Video className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold">Görüntülü Görüşme</h3>
                <p className="text-muted-foreground">
                  Yüksek kaliteli video bağlantısı ile psikologunuzla yüz yüze görüşün
                </p>
              </CardContent>
            </Card>

            <Card className="border-card-border hover-elevate">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-chart-2" />
                </div>
                <h3 className="font-serif text-xl font-semibold">Tam Gizlilik</h3>
                <p className="text-muted-foreground">
                  Tüm görüşmeleriniz şifrelenir ve tamamen gizli tutulur
                </p>
              </CardContent>
            </Card>

            <Card className="border-card-border hover-elevate">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-chart-3" />
                </div>
                <h3 className="font-serif text-xl font-semibold">Kolay Randevu</h3>
                <p className="text-muted-foreground">
                  Size uygun zamanda, birkaç tıkla randevu alın
                </p>
              </CardContent>
            </Card>

            <Card className="border-card-border hover-elevate">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-chart-4/10 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-chart-4" />
                </div>
                <h3 className="font-serif text-xl font-semibold">Mesajlaşma</h3>
                <p className="text-muted-foreground">
                  Seanslar arasında psikologunuzla güvenli mesajlaşın
                </p>
              </CardContent>
            </Card>

            <Card className="border-card-border hover-elevate">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-chart-5/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-chart-5" />
                </div>
                <h3 className="font-serif text-xl font-semibold">Esnek Zamanlama</h3>
                <p className="text-muted-foreground">
                  Sabahtan geceye, size uygun saat dilimlerinde destek alın
                </p>
              </CardContent>
            </Card>

            <Card className="border-card-border hover-elevate">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="font-serif text-xl font-semibold">Uzman Kadro</h3>
                <p className="text-muted-foreground">
                  Doğrulanmış ve deneyimli psikologlarla çalışın
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
              Nasıl Çalışır?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Üç basit adımda profesyonel psikolojik desteğe ulaşın
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto">
                1
              </div>
              <h3 className="font-serif text-xl font-semibold">Psikolog Seçin</h3>
              <p className="text-muted-foreground">
                Uzmanlık alanlarına göre filtreleyerek size uygun psikoloğu bulun
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto">
                2
              </div>
              <h3 className="font-serif text-xl font-semibold">Randevu Alın</h3>
              <p className="text-muted-foreground">
                Müsait saatlerden size uygun olanı seçin ve ödeme yapın
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto">
                3
              </div>
              <h3 className="font-serif text-xl font-semibold">Görüşmeye Başlayın</h3>
              <p className="text-muted-foreground">
                Randevu saatinde güvenli video bağlantısı ile görüşmenizi yapın
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary-foreground mb-6">
            Sağlığınız İçin İlk Adımı Atın
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Profesyonel psikolojik destek almak için hemen ücretsiz hesap oluşturun
          </p>
          <Button size="lg" variant="secondary" className="text-base px-8" asChild data-testid="button-cta-start">
            <a href="/api/login">
              Ücretsiz Başla
              <ArrowRight className="w-5 h-5 ml-2" />
            </a>
          </Button>
        </div>
      </section>

      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-serif text-lg font-semibold">MindWell</span>
            </div>
            
            <p className="text-sm text-muted-foreground">
              © 2024 MindWell. Tüm hakları saklıdır.
            </p>
            
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Gizlilik Politikası
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Kullanım Koşulları
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
