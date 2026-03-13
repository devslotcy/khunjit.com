import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Star,
  Clock,
  Languages,
  GraduationCap,
  Award,
  Calendar
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PsychologistProfile } from "@shared/schema";

interface ProfileSidebarProps {
  psychologist: PsychologistProfile;
  onBookAppointment: () => void;
  selectedSlot: { startTime: Date; endTime: Date } | null;
  isBooking: boolean;
  formatSlotTime: (slot: { startTime: Date; endTime: Date }) => string;
}

export function ProfileSidebar({
  psychologist,
  onBookAppointment,
  selectedSlot,
  isBooking,
  formatSlotTime
}: ProfileSidebarProps) {
  const { t } = useTranslation();

  const formatPrice = (price: string | null) => {
    if (!price) return t("card.priceNotSpecified");
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(parseFloat(price));
  };

  return (
    <div className="space-y-4 md:sticky md:top-6">
      {/* Profile Card */}
      <Card className="border-card-border">
        <CardContent className="p-6 space-y-6">
          {/* Avatar and Name */}
          <div className="text-center space-y-3">
            <Avatar className="w-24 h-24 rounded-2xl mx-auto">
              <AvatarImage src={psychologist.profileImageUrl || undefined} />
              <AvatarFallback className="rounded-2xl text-2xl">
                {psychologist.fullName?.split(' ').map(n => n[0]).join('') || 'P'}
              </AvatarFallback>
            </Avatar>

            <div>
              {/* Title first (top line) - secondary/lighter style */}
              {psychologist.title && (
                <p className="text-sm text-muted-foreground text-center">
                  {t(`titles.${psychologist.title}`, psychologist.title)}
                </p>
              )}
              {/* Name second (bottom line) - primary/bolder style */}
              <div className="flex items-center justify-center gap-2">
                <h1 className="font-serif text-xl font-bold">
                  {psychologist.fullName}
                </h1>
                {psychologist.verified && (
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Info Stack - Vertical Layout */}
          <div className="space-y-3">
            {psychologist.yearsOfExperience && (
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Star className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{t("profile.experience")}</p>
                  <p className="text-sm font-medium">{t("card.experience.yearsLong", { count: psychologist.yearsOfExperience })}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{t("profile.sessionDuration")}</p>
                <p className="text-sm font-medium">{t("duration.minutesLong", { count: psychologist.sessionDuration || 50 })}</p>
              </div>
            </div>

            {psychologist.languages && psychologist.languages.length > 0 && (
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Languages className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{t("profile.languages")}</p>
                  <p className="text-sm font-medium">{psychologist.languages.join(", ")}</p>
                </div>
              </div>
            )}
          </div>

          {/* Bio */}
          {psychologist.bio && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">{t("profile.about")}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {psychologist.bio}
                </p>
              </div>
            </>
          )}

          {/* Specialties */}
          {psychologist.specialties && psychologist.specialties.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">{t("profile.specialties")}</h3>
                <div className="flex flex-wrap gap-2">
                  {psychologist.specialties.map((specialtyKey, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {t(`specialties.${specialtyKey}`, specialtyKey)}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Education and Certifications - Two Column Grid */}
          {(psychologist.education || (psychologist.certifications && psychologist.certifications.length > 0)) && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                {/* Education */}
                {psychologist.education && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="text-xs font-semibold">{t("profile.education")}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {psychologist.education}
                    </p>
                  </div>
                )}

                {/* Certifications */}
                {psychologist.certifications && psychologist.certifications.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Award className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="text-xs font-semibold">{t("profile.certifications")}</h3>
                    </div>
                    <div className="space-y-1">
                      {psychologist.certifications.slice(0, 2).map((cert, i) => (
                        <p key={i} className="text-xs text-muted-foreground leading-relaxed">
                          {cert}
                        </p>
                      ))}
                      {psychologist.certifications.length > 2 && (
                        <p className="text-xs text-primary font-medium">
                          +{psychologist.certifications.length - 2} daha
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Booking Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-6 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t("card.sessionFee")}</p>
            <p className="text-3xl font-bold text-primary">
              {formatPrice(psychologist.pricePerSession)}
            </p>
          </div>

          <Separator />

          {selectedSlot && (
            <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3 space-y-1 border border-primary/20">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {t("card.selectedAppointment")}
              </p>
              <p className="text-sm font-semibold">
                {formatSlotTime(selectedSlot)}
              </p>
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            disabled={!selectedSlot || isBooking}
            onClick={onBookAppointment}
            data-testid="button-book-appointment"
          >
            {isBooking ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground" />
            ) : (
              <>
                <Calendar className="w-5 h-5 mr-2" />
                {t("card.bookAppointment")}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            {t("card.reservationWarning")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
