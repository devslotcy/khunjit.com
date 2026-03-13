import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, Star, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PsychologistProfile } from "@shared/schema";

interface PsychologistCardProps {
  psychologist: PsychologistProfile;
  isPublic?: boolean;
}

// Helper: render specialty tags with i18n
function SpecialtyTags({ specialties }: { specialties: string[] | null | undefined }) {
  const { t } = useTranslation();

  if (!specialties || specialties.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2">
      {specialties.map((specialtyKey, i) => (
        <Badge key={i} variant="secondary" className="text-xs">
          {t(`specialties.${specialtyKey}`, specialtyKey)}
        </Badge>
      ))}
    </div>
  );
}

export function PsychologistCard({ psychologist, isPublic }: PsychologistCardProps) {
  const { t } = useTranslation();

  const formatPrice = (price: string | null) => {
    if (!price) return t("card.priceNotSpecified");
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(parseFloat(price));
  };

  return (
    <Card
      className="overflow-hidden border-card-border hover-elevate group flex flex-col"
      data-testid={`card-psychologist-${psychologist.id}`}
    >
      <CardContent className="p-0 flex flex-col flex-1">
        {/* Upper content area - flex-1 to take available space */}
        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 flex-1">
          {/* Header: Avatar + Name */}
          <div className="flex items-start gap-3 sm:gap-4">
            <Avatar className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex-shrink-0">
              <AvatarImage src={psychologist.profileImageUrl || undefined} />
              <AvatarFallback className="rounded-xl text-base sm:text-lg">
                {psychologist.fullName?.split(' ').map(n => n[0]).join('') || 'P'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              {/* Title first (top line) - secondary/lighter style */}
              {psychologist.title && (
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {t(`titles.${psychologist.title}`, psychologist.title)}
                </p>
              )}
              {/* Name second (bottom line) - primary/bolder style */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="font-serif text-base sm:text-lg font-semibold truncate">
                  {psychologist.fullName}
                </h3>
                {psychologist.verified && (
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                )}
              </div>
            </div>
          </div>

          {/* Bio - max 2 lines */}
          {psychologist.bio && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {psychologist.bio}
            </p>
          )}

          {/* Specialty tags - show all */}
          <SpecialtyTags specialties={psychologist.specialties} />

          {/* Experience & Duration */}
          <div className="flex items-center gap-3 sm:gap-4 text-sm text-muted-foreground">
            {psychologist.yearsOfExperience && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4" />
                <span>
                  <span className="hidden sm:inline">
                    {t("card.experience.yearsLong", { count: psychologist.yearsOfExperience })}
                  </span>
                  <span className="sm:hidden">
                    {t("card.experience.yearsShort", { count: psychologist.yearsOfExperience })}
                  </span>
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{psychologist.sessionDuration || 50} {t("duration.minutesShort")}</span>
            </div>
          </div>
        </div>

        {/* CTA area - mt-auto to stick to bottom */}
        <div className="border-t border-card-border bg-muted/30 p-3 sm:p-4 mt-auto">
          <div className="flex items-center justify-between gap-3 sm:gap-4 mb-3">
            <div>
              <p className="text-xs text-muted-foreground">
                <span className="hidden sm:inline">{t("card.sessionFee")}</span>
                <span className="sm:hidden">{t("card.fee")}</span>
              </p>
              <p className="text-base sm:text-lg font-semibold text-primary">
                {formatPrice(psychologist.pricePerSession)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              asChild
              data-testid={`button-book-${psychologist.id}`}
            >
              {isPublic ? (
                <a href="/api/login">{t("auth.login")}</a>
              ) : (
                <Link href={`/dashboard/psychologists/${psychologist.id}`}>
                  {t("card.bookAppointment")}
                </Link>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
