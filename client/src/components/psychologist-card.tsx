import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, Star, Clock, Languages } from "lucide-react";
import type { PsychologistProfile } from "@shared/schema";

interface PsychologistCardProps {
  psychologist: PsychologistProfile;
}

export function PsychologistCard({ psychologist }: PsychologistCardProps) {
  const formatPrice = (price: string | null) => {
    if (!price) return "Belirtilmemiş";
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(parseFloat(price));
  };

  return (
    <Card className="overflow-hidden border-card-border hover-elevate group" data-testid={`card-psychologist-${psychologist.id}`}>
      <CardContent className="p-0">
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16 rounded-xl">
              <AvatarImage src={psychologist.profileImageUrl || undefined} />
              <AvatarFallback className="rounded-xl text-lg">
                {psychologist.fullName?.split(' ').map(n => n[0]).join('') || 'P'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-serif text-lg font-semibold truncate">
                  {psychologist.fullName}
                </h3>
                {psychologist.verified && (
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {psychologist.title || "Klinik Psikolog"}
              </p>
            </div>
          </div>

          {psychologist.bio && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {psychologist.bio}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {psychologist.specialties?.slice(0, 3).map((specialty, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {specialty}
              </Badge>
            ))}
            {(psychologist.specialties?.length || 0) > 3 && (
              <Badge variant="outline" className="text-xs">
                +{(psychologist.specialties?.length || 0) - 3}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {psychologist.yearsOfExperience && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4" />
                <span>{psychologist.yearsOfExperience} yıl deneyim</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{psychologist.sessionDuration || 50} dk</span>
            </div>
          </div>

          {psychologist.languages && psychologist.languages.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Languages className="w-4 h-4" />
              <span>{psychologist.languages.join(", ")}</span>
            </div>
          )}
        </div>

        <div className="border-t border-card-border bg-muted/30 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Seans ücreti</p>
            <p className="text-lg font-semibold text-primary">
              {formatPrice(psychologist.pricePerSession)}
            </p>
          </div>
          <Button asChild data-testid={`button-view-${psychologist.id}`}>
            <Link href={`/dashboard/psychologists/${psychologist.id}`}>
              Profili Gör
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
