import { useState, useEffect } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { TherapyVideoCallFigure } from "@/components/therapy-video-call-figure";
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
  Lock,
  Menu
} from "lucide-react";

// Animation variants
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 15,
    }
  },
};

export default function Landing() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const navLinks = [
    { href: "#features", label: "Özellikler" },
    { href: "#how-it-works", label: "Nasıl Çalışır" },
  ];

  // Disable animations if user prefers reduced motion
  const getAnimationProps = (variants: Variants) => {
    if (shouldReduceMotion) {
      return {};
    }
    return {
      initial: "hidden",
      animate: isLoaded ? "visible" : "hidden",
      variants,
    };
  };

  const getWhileInViewProps = (variants: Variants) => {
    if (shouldReduceMotion) {
      return {};
    }
    return {
      initial: "hidden",
      whileInView: "visible",
      viewport: { once: true, margin: "-50px" },
      variants,
    };
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Animated background blobs */}
      {!shouldReduceMotion && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
            animate={{
              x: [0, 30, 0],
              y: [0, -20, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-1/4 -right-32 w-80 h-80 bg-chart-2/5 rounded-full blur-3xl"
            animate={{
              x: [0, -25, 0],
              y: [0, 30, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          />
          <motion.div
            className="absolute top-2/3 left-1/3 w-64 h-64 bg-chart-3/5 rounded-full blur-3xl"
            animate={{
              x: [0, 20, -20, 0],
              y: [0, -15, 15, 0],
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 5,
            }}
          />
        </div>
      )}

      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <motion.div
              className="flex items-center gap-2"
              initial={shouldReduceMotion ? {} : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-serif text-xl font-semibold">KhunJit</span>
            </motion.div>

            {/* Desktop Navigation */}
            <motion.div
              className="hidden lg:flex items-center gap-8"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  data-testid={`link-${link.href.replace('#', '')}`}
                >
                  {link.label}
                </a>
              ))}
            </motion.div>

            {/* Desktop Auth Buttons */}
            <motion.div
              className="hidden lg:flex items-center gap-3"
              initial={shouldReduceMotion ? {} : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <ThemeToggle />
              {user ? (
                <Button asChild data-testid="button-dashboard" className="group">
                  <a href="/dashboard">
                    Dashboard'a Git
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
              ) : (
                <>
                  <Button variant="ghost" asChild data-testid="button-login">
                    <a href="/login">Giriş Yap</a>
                  </Button>
                  <Button asChild data-testid="button-start" className="group">
                    <a href="/role-select">
                      Kayıt Ol
                      <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </a>
                  </Button>
                </>
              )}
            </motion.div>

            {/* Mobile/Tablet Hamburger Menu Button */}
            <div className="flex lg:hidden items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Menüyü aç"
                data-testid="button-mobile-menu"
              >
                <Menu className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile/Tablet Sheet Menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-[300px] sm:w-[350px]">
          <SheetHeader className="border-b border-border pb-4 mb-4">
            <SheetTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-serif">KhunJit</span>
            </SheetTitle>
          </SheetHeader>

          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <SheetClose asChild key={link.href}>
                <a
                  href={link.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  data-testid={`mobile-link-${link.href.replace('#', '')}`}
                >
                  {link.label}
                </a>
              </SheetClose>
            ))}
          </nav>

          <div className="border-t border-border mt-6 pt-6">
            {user ? (
              <SheetClose asChild>
                <Button asChild className="w-full" data-testid="mobile-button-dashboard">
                  <a href="/dashboard">
                    Dashboard'a Git
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </SheetClose>
            ) : (
              <div className="flex flex-col gap-3">
                <SheetClose asChild>
                  <Button variant="outline" asChild className="w-full" data-testid="mobile-button-login">
                    <a href="/login">Giriş Yap</a>
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button asChild className="w-full" data-testid="mobile-button-start">
                    <a href="/role-select">
                      Kayıt Ol
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                </SheetClose>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              {/* Badge */}
              <motion.div
                {...getAnimationProps(fadeInUp)}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium"
              >
                <Shield className="w-4 h-4" />
                Güvenli ve Gizli
              </motion.div>

              {/* Headline */}
              <motion.h1
                {...getAnimationProps(fadeInUp)}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight"
              >
                Online Psikolojik
                <motion.span
                  className="text-primary inline-block"
                  {...(shouldReduceMotion ? {} : {
                    initial: { opacity: 0, scale: 0.9 },
                    animate: { opacity: 1, scale: 1 },
                    transition: { duration: 0.5, delay: 0.3 }
                  })}
                >
                  {" "}Destek
                </motion.span>
                <br />
                Evinizin Konforunda
              </motion.h1>

              {/* Description */}
              <motion.p
                {...getAnimationProps(fadeInUp)}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg text-muted-foreground max-w-xl"
              >
                Uzman psikologlarımızla görüntülü görüşme yaparak, duygusal ve mental sağlığınız için
                profesyonel destek alın. Her zaman, her yerde yanınızdayız.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                {...getAnimationProps(fadeInUp)}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button
                  size="lg"
                  className="text-base px-8 h-14 group transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                  asChild
                  data-testid="button-hero-start"
                >
                  <a href="/role-select">
                    Hemen Başla
                    <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 h-14 group transition-all duration-200 hover:scale-[1.01] hover:bg-muted/50"
                  asChild
                  data-testid="button-hero-explore"
                >
                  <a href="#how-it-works">
                    Nasıl Çalışır?
                  </a>
                </Button>
              </motion.div>

              {/* Trust badges */}
              <motion.div
                {...getAnimationProps(staggerContainer)}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-wrap items-center gap-6 pt-4"
              >
                {[
                  { icon: CheckCircle2, text: "Ücretsiz kayıt" },
                  { icon: CheckCircle2, text: "7/24 destek" },
                  { icon: CheckCircle2, text: "Uzman psikologlar" },
                ].map((item, index) => (
                  <motion.div
                    key={item.text}
                    variants={popIn}
                    custom={index}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <item.icon className="w-5 h-5 text-primary" />
                    <span>{item.text}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Hero Card - Interactive Video Call Figure */}
            <motion.div
              {...getAnimationProps(fadeIn)}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="relative hidden lg:block"
            >
              <div className="relative z-10">
                <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8">
                  <TherapyVideoCallFigure className="w-full h-full" />
                </div>
              </div>

              {/* Background decorative elements */}
              <motion.div
                className="absolute -top-4 -right-4 w-72 h-72 bg-primary/5 rounded-full blur-3xl"
                animate={shouldReduceMotion ? {} : {
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="absolute -bottom-8 -left-8 w-64 h-64 bg-chart-2/10 rounded-full blur-3xl"
                animate={shouldReduceMotion ? {} : {
                  scale: [1, 1.15, 1],
                  opacity: [0.5, 0.7, 0.5],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 2,
                }}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            {...getWhileInViewProps(fadeInUp)}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
              Neden KhunJit?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Modern ve güvenli platformumuz ile psikolojik destek almak hiç bu kadar kolay olmamıştı
            </p>
          </motion.div>

          <motion.div
            {...getWhileInViewProps(staggerContainer)}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[
              { icon: Video, color: "primary", title: "Görüntülü Görüşme", desc: "Yüksek kaliteli video bağlantısı ile psikologunuzla yüz yüze görüşün" },
              { icon: Lock, color: "chart-2", title: "Tam Gizlilik", desc: "Tüm görüşmeleriniz şifrelenir ve tamamen gizli tutulur" },
              { icon: Calendar, color: "chart-3", title: "Kolay Randevu", desc: "Size uygun zamanda, birkaç tıkla randevu alın" },
              { icon: MessageCircle, color: "chart-4", title: "Mesajlaşma", desc: "Seanslar arasında psikologunuzla güvenli mesajlaşın" },
              { icon: Clock, color: "chart-5", title: "Esnek Zamanlama", desc: "Sabahtan geceye, size uygun saat dilimlerinde destek alın" },
              { icon: Heart, color: "destructive", title: "Uzman Kadro", desc: "Doğrulanmış ve deneyimli psikologlarla çalışın" },
            ].map((feature) => (
              <motion.div key={feature.title} variants={popIn}>
                <Card className="border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6 space-y-4">
                    <div className={`w-12 h-12 rounded-lg bg-${feature.color}/10 flex items-center justify-center`}>
                      <feature.icon className={`w-6 h-6 text-${feature.color}`} />
                    </div>
                    <h3 className="font-serif text-xl font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            {...getWhileInViewProps(fadeInUp)}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
              Nasıl Çalışır?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Üç basit adımda profesyonel psikolojik desteğe ulaşın
            </p>
          </motion.div>

          <motion.div
            {...getWhileInViewProps(staggerContainer)}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              { num: "1", title: "Psikolog Seçin", desc: "Uzmanlık alanlarına göre filtreleyerek size uygun psikoloğu bulun" },
              { num: "2", title: "Randevu Alın", desc: "Müsait saatlerden size uygun olanı seçin ve ödeme yapın" },
              { num: "3", title: "Görüşmeye Başlayın", desc: "Randevu saatinde güvenli video bağlantısı ile görüşmenizi yapın" },
            ].map((step) => (
              <motion.div
                key={step.num}
                variants={popIn}
                className="text-center space-y-4"
              >
                <motion.div
                  whileHover={shouldReduceMotion ? {} : { scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto"
                >
                  {step.num}
                </motion.div>
                <h3 className="font-serif text-xl font-semibold">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <motion.section
        {...getWhileInViewProps(fadeIn)}
        transition={{ duration: 0.6 }}
        className="py-20 px-4 sm:px-6 lg:px-8 bg-primary"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            {...getWhileInViewProps(fadeInUp)}
            transition={{ duration: 0.5 }}
            className="font-serif text-3xl sm:text-4xl font-bold text-primary-foreground mb-6"
          >
            Sağlığınız İçin İlk Adımı Atın
          </motion.h2>
          <motion.p
            {...getWhileInViewProps(fadeInUp)}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto"
          >
            Profesyonel psikolojik destek almak için hemen ücretsiz hesap oluşturun
          </motion.p>
          <motion.div
            {...getWhileInViewProps(fadeInUp)}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button
              size="lg"
              variant="secondary"
              className="text-base px-8 group transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
              asChild
              data-testid="button-cta-start"
            >
              <a href="/role-select">
                Ücretsiz Başla
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-serif text-lg font-semibold">KhunJit</span>
            </div>

            <p className="text-sm text-muted-foreground">
              © 2026 KhunJit. Tüm hakları saklıdır.
            </p>

            <div className="flex items-center gap-4 flex-wrap justify-center">
              <a href="/legal/gizlilik" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-privacy">
                Gizlilik Politikası
              </a>
              <a href="/legal/kullanim" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-terms">
                Kullanım Koşulları
              </a>
              <a href="/legal/kvkk" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-kvkk">
                KVKK
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
