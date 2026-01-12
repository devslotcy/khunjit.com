import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { PsychologistCard } from "@/components/psychologist-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";
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

const languages = ["Türkçe", "İngilizce", "Almanca", "Fransızca"];

export default function PsychologistDiscovery() {
  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [priceRange, setPriceRange] = useState<string>("");

  const { data: psychologists, isLoading } = useQuery<PsychologistProfile[]>({
    queryKey: ["/api/psychologists", { search, specialty: selectedSpecialty, language: selectedLanguage, priceRange }],
  });

  const clearFilters = () => {
    setSearch("");
    setSelectedSpecialty("");
    setSelectedLanguage("");
    setPriceRange("");
  };

  const hasFilters = search || selectedSpecialty || selectedLanguage || priceRange;

  return (
    <DashboardLayout role="patient">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold mb-2">Psikolog Bul</h1>
          <p className="text-muted-foreground">
            Size en uygun uzmanı bulun ve randevu alın
          </p>
        </div>

        <div className="bg-card border border-card-border rounded-lg p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="İsim veya uzmanlık alanı ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-psychologist"
              />
            </div>

            <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
              <SelectTrigger className="w-full lg:w-48" data-testid="select-specialty">
                <SelectValue placeholder="Uzmanlık Alanı" />
              </SelectTrigger>
              <SelectContent>
                {specialties.map((specialty) => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-full lg:w-40" data-testid="select-language">
                <SelectValue placeholder="Dil" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((language) => (
                  <SelectItem key={language} value={language}>
                    {language}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="w-full lg:w-44" data-testid="select-price">
                <SelectValue placeholder="Fiyat Aralığı" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-500">0 - 500 TL</SelectItem>
                <SelectItem value="500-1000">500 - 1000 TL</SelectItem>
                <SelectItem value="1000-2000">1000 - 2000 TL</SelectItem>
                <SelectItem value="2000+">2000 TL +</SelectItem>
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
                  Arama: {search}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSearch("")} />
                </Badge>
              )}
              {selectedSpecialty && (
                <Badge variant="secondary" className="gap-1">
                  {selectedSpecialty}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedSpecialty("")} />
                </Badge>
              )}
              {selectedLanguage && (
                <Badge variant="secondary" className="gap-1">
                  {selectedLanguage}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedLanguage("")} />
                </Badge>
              )}
              {priceRange && (
                <Badge variant="secondary" className="gap-1">
                  {priceRange} TL
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setPriceRange("")} />
                </Badge>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-lg border border-card-border p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-16 h-16 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {psychologists.map((psychologist) => (
              <PsychologistCard key={psychologist.id} psychologist={psychologist} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Filter className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">Psikolog bulunamadı</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Arama kriterlerinizi değiştirerek tekrar deneyin
            </p>
            {hasFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Filtreleri Temizle
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
