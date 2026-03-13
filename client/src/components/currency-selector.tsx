/**
 * Currency Selector Component
 *
 * A reusable component for selecting currency with visual feedback.
 * Shows currency code, symbol, and country flag emoji.
 *
 * Used in:
 * - Psychologist registration (with smart default based on language)
 * - Profile settings (for updating currency)
 */

import { CheckCircle2 } from "lucide-react";
import { getUniqueCurrencies, type CurrencyInfo } from "@/lib/currency";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

interface CurrencySelectorProps {
  value: string; // ISO 4217 currency code (e.g., "USD", "THB")
  onChange: (currency: string, countryCode: string) => void;
  label?: string;
  helperText?: string;
  disabled?: boolean;
  showRecommendation?: boolean; // Show "Recommended" badge
  recommendedCurrency?: string; // Currency code to highlight
}

const FLAG_EMOJI_MAP: Record<string, string> = {
  'US': '🇺🇸',
  'TH': '🇹🇭',
  'VN': '🇻🇳',
  'PH': '🇵🇭',
  'ID': '🇮🇩',
  'JP': '🇯🇵',
  'KR': '🇰🇷',
  'DE': '🇩🇪',
  'FR': '🇫🇷',
  'IT': '🇮🇹',
  'TR': '🇹🇷',
};

export function CurrencySelector({
  value,
  onChange,
  label,
  helperText,
  disabled = false,
  showRecommendation = false,
  recommendedCurrency,
}: CurrencySelectorProps) {
  const { t } = useTranslation();
  const currencies = getUniqueCurrencies();

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {currencies.map((currency: CurrencyInfo) => {
          const isSelected = value === currency.code;
          const isRecommended = showRecommendation && currency.code === recommendedCurrency;
          const flagEmoji = FLAG_EMOJI_MAP[currency.countryCode] || '🌐';

          return (
            <button
              key={currency.code}
              type="button"
              onClick={() => !disabled && onChange(currency.code, currency.countryCode)}
              disabled={disabled}
              className={`
                relative flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all
                ${isSelected
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border hover:border-primary/50 hover:bg-muted'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {isSelected && (
                <CheckCircle2 className="absolute top-1 right-1 w-4 h-4 text-primary" />
              )}

              {isRecommended && !isSelected && (
                <span className="absolute top-1 right-1 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                  {t('common.recommended') || 'Rec'}
                </span>
              )}

              <span className="text-2xl">{flagEmoji}</span>

              <div className="text-center">
                <div className="text-sm font-semibold">
                  {currency.symbol} {currency.code}
                </div>
                <div className="text-xs text-muted-foreground truncate max-w-[80px]">
                  {currency.name}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {helperText && (
        <p className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}

      {value && (
        <div className="text-xs flex items-center gap-1 mt-2 text-green-600">
          <CheckCircle2 className="w-3 h-3" />
          {t('currency.selected')}: {value} ({currencies.find(c => c.code === value)?.symbol})
        </div>
      )}
    </div>
  );
}
