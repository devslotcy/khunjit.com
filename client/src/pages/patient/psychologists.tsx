import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { PsychologistCard } from "@/components/psychologist-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, X, ArrowLeft } from "lucide-react";
import type { PsychologistProfile } from "@shared/schema";

const specialties = [
  "Anksiyete",
  "Depresyon",
  "İlişki Sorunları",
  "Travma",
  "Stres Yönetimi",
  "Aile Terapisi",
  "Çocuk Psikolojisi",
  "Bağımlılık",
  "Kişilik Bozuklukları",
  "Yeme Bozuklukları",
];

interface PsychologistDiscoveryProps {
  isPublic?: boolean;
}

export default function PsychologistDiscovery({ isPublic }: PsychologistDiscoveryProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("");
  const [priceRange, setPriceRange] = useState<string>("");

  // Fetch user profile to get patient's language preference
  const { data: userProfile } = useQuery({
    queryKey: ["/api/profile"],
    enabled: !isPublic, // Only fetch if user is logged in
  });

  // Get patient's language ID for filtering
  const patientLanguageId = userProfile?.languageId || null;

  const { data: psychologists, isLoading } = useQuery<PsychologistProfile[]>({
    queryKey: ["/api/psychologists", { search, specialty: selectedSpecialty, priceRange, patientLanguageId }],
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache in memory
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  const clearFilters = () => {
    setSearch("");
    setSelectedSpecialty("");
    setPriceRange("");
  };

  const hasFilters = search || selectedSpecialty || priceRange;

  const content = (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold mb-2">{t('psychologists.title')}</h1>
        <p className="text-muted-foreground">
          {t('psychologists.subtitle')}
        </p>
      </div>

      <div className="bg-card border border-card-border rounded-lg p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('psychologists.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-psychologist"
            />
          </div>

          <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-specialty">
              <SelectValue placeholder={t('psychologists.specialtyPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {specialties.map((specialty) => (
                <SelectItem key={specialty} value={specialty}>
                  {specialty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priceRange} onValueChange={setPriceRange}>
            <SelectTrigger className="w-full sm:w-44" data-testid="select-price">
              <SelectValue placeholder={t('psychologists.priceRangePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0-500">{t('psychologists.priceRanges.low')}</SelectItem>
              <SelectItem value="500-1000">{t('psychologists.priceRanges.medium')}</SelectItem>
              <SelectItem value="1000-2000">{t('psychologists.priceRanges.high')}</SelectItem>
              <SelectItem value="2000+">{t('psychologists.priceRanges.veryHigh')}</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} data-testid="button-clear-filters">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {hasFilters && (
          <div className="flex flex-wrap gap-2 mt-4">
            {search && (
              <Badge variant="secondary" className="gap-1">
                {t('psychologists.filters.search', { query: search })}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSearch("")} />
              </Badge>
            )}
            {selectedSpecialty && (
              <Badge variant="secondary" className="gap-1">
                {selectedSpecialty}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedSpecialty("")} />
              </Badge>
            )}
            {priceRange && (
              <Badge variant="secondary" className="gap-1">
                {t('psychologists.filters.price', { range: priceRange })}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setPriceRange("")} />
              </Badge>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-lg border border-card-border p-4 sm:p-6 space-y-4">
              <div className="flex items-start gap-3 sm:gap-4">
                <Skeleton className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <Skeleton className="h-5 w-28 sm:w-32" />
                  <Skeleton className="h-4 w-20 sm:w-24" />
                </div>
              </div>
              <Skeleton className="h-12 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="flex justify-between pt-4 border-t">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-10 w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : psychologists && psychologists.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {psychologists.map((psychologist) => (
            <PsychologistCard
              key={psychologist.id}
              psychologist={psychologist}
              isPublic={isPublic}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Filter className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-2">{t('psychologists.empty.title')}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('psychologists.empty.description')}
          </p>
          {hasFilters && (
            <Button variant="outline" onClick={clearFilters}>
              {t('psychologists.empty.buttonText')}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (isPublic) {
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
              <span className="text-xl font-serif font-bold text-primary">KhunJit</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button asChild data-testid="button-login">
                <a href="/api/login">{t('psychologists.loginButton')}</a>
              </Button>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          {content}
        </main>
      </div>
    );
  }

  return (
    <DashboardLayout role="patient">
      {content}
    </DashboardLayout>
  );
}
