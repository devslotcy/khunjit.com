/**
 * Multi-Currency Support Library
 *
 * Maps languages to their respective currencies and provides
 * formatting utilities for international price display.
 */

export interface CurrencyInfo {
  code: string;        // ISO 4217 currency code
  symbol: string;      // Currency symbol (e.g., $, €, ฿)
  locale: string;      // BCP 47 locale for number formatting
  decimals: number;    // Number of decimal places
  name: string;        // Full currency name
  countryCode: string; // ISO 3166-1 alpha-2 country code
}

/**
 * Language to Currency Mapping
 * Maps UI language codes to their default currency
 */
export const CURRENCY_MAP: Record<string, CurrencyInfo> = {
  en: {
    code: 'USD',
    symbol: '$',
    locale: 'en-US',
    decimals: 2,
    name: 'US Dollar',
    countryCode: 'US',
  },
  th: {
    code: 'THB',
    symbol: '฿',
    locale: 'th-TH',
    decimals: 2,
    name: 'Thai Baht',
    countryCode: 'TH',
  },
  vi: {
    code: 'VND',
    symbol: '₫',
    locale: 'vi-VN',
    decimals: 0,
    name: 'Vietnamese Dong',
    countryCode: 'VN',
  },
  fil: {
    code: 'PHP',
    symbol: '₱',
    locale: 'en-PH',
    decimals: 2,
    name: 'Philippine Peso',
    countryCode: 'PH',
  },
  id: {
    code: 'IDR',
    symbol: 'Rp',
    locale: 'id-ID',
    decimals: 0,
    name: 'Indonesian Rupiah',
    countryCode: 'ID',
  },
  ja: {
    code: 'JPY',
    symbol: '¥',
    locale: 'ja-JP',
    decimals: 0,
    name: 'Japanese Yen',
    countryCode: 'JP',
  },
  ko: {
    code: 'KRW',
    symbol: '₩',
    locale: 'ko-KR',
    decimals: 0,
    name: 'South Korean Won',
    countryCode: 'KR',
  },
  de: {
    code: 'EUR',
    symbol: '€',
    locale: 'de-DE',
    decimals: 2,
    name: 'Euro',
    countryCode: 'DE',
  },
  fr: {
    code: 'EUR',
    symbol: '€',
    locale: 'fr-FR',
    decimals: 2,
    name: 'Euro',
    countryCode: 'FR',
  },
  it: {
    code: 'EUR',
    symbol: '€',
    locale: 'it-IT',
    decimals: 2,
    name: 'Euro',
    countryCode: 'IT',
  },
  tr: {
    code: 'TRY',
    symbol: '₺',
    locale: 'tr-TR',
    decimals: 2,
    name: 'Turkish Lira',
    countryCode: 'TR',
  },
} as const;

/**
 * Get currency information by language code
 * @param langCode - UI language code (e.g., 'en', 'th', 'tr')
 * @returns Currency information object
 */
export function getCurrencyByLanguage(langCode: string): CurrencyInfo {
  return CURRENCY_MAP[langCode] || CURRENCY_MAP.en;
}

/**
 * Get currency information by currency code
 * @param currencyCode - ISO 4217 currency code (e.g., 'USD', 'THB', 'EUR')
 * @returns Currency information object or undefined
 */
export function getCurrencyByCode(currencyCode: string): CurrencyInfo | undefined {
  return Object.values(CURRENCY_MAP).find(
    (currency) => currency.code === currencyCode
  );
}

/**
 * Get currency information by country code
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'US', 'TH', 'TR')
 * @returns Currency information object or undefined
 */
export function getCurrencyByCountry(countryCode: string): CurrencyInfo | undefined {
  return Object.values(CURRENCY_MAP).find(
    (currency) => currency.countryCode === countryCode
  );
}

/**
 * Format price with proper currency symbol and locale
 *
 * @param amount - Numeric amount to format
 * @param currencyCode - ISO 4217 currency code (e.g., 'USD', 'THB')
 * @param locale - Optional BCP 47 locale (auto-detected from currency if not provided)
 * @returns Formatted price string
 *
 * @example
 * formatPrice(1000, 'USD') // "$1,000.00"
 * formatPrice(1000, 'THB') // "฿1,000.00"
 * formatPrice(1000, 'JPY') // "¥1,000"
 * formatPrice(1000, 'EUR', 'de-DE') // "1.000,00 €"
 */
export function formatPrice(
  amount: number,
  currencyCode: string,
  locale?: string
): string {
  const currencyInfo = getCurrencyByCode(currencyCode);
  const resolvedLocale = locale || currencyInfo?.locale || 'en-US';
  const decimals = currencyInfo?.decimals ?? 2;

  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch (error) {
    // Fallback for unsupported currencies
    console.warn(`Currency formatting failed for ${currencyCode}:`, error);
    return `${currencyInfo?.symbol || currencyCode} ${amount.toFixed(decimals)}`;
  }
}

/**
 * Format price using language code instead of currency code
 * @param amount - Numeric amount to format
 * @param langCode - UI language code (e.g., 'en', 'th', 'tr')
 * @returns Formatted price string
 *
 * @example
 * formatPriceByLanguage(1000, 'en') // "$1,000.00"
 * formatPriceByLanguage(1000, 'th') // "฿1,000.00"
 */
export function formatPriceByLanguage(amount: number, langCode: string): string {
  const currency = getCurrencyByLanguage(langCode);
  return formatPrice(amount, currency.code, currency.locale);
}

/**
 * Parse price string to number (removes currency symbols and formatting)
 * @param priceString - Formatted price string
 * @returns Numeric value
 *
 * @example
 * parsePrice("$1,000.00") // 1000
 * parsePrice("฿1,000.00") // 1000
 */
export function parsePrice(priceString: string): number {
  // Remove all non-numeric characters except decimal point and minus
  const cleaned = priceString.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Get all supported currencies
 * @returns Array of all currency information objects
 */
export function getAllCurrencies(): CurrencyInfo[] {
  return Object.values(CURRENCY_MAP);
}

/**
 * Get unique currencies (removes duplicates like EUR)
 * @returns Array of unique currency information objects
 */
export function getUniqueCurrencies(): CurrencyInfo[] {
  const seen = new Set<string>();
  return Object.values(CURRENCY_MAP).filter((currency) => {
    if (seen.has(currency.code)) {
      return false;
    }
    seen.add(currency.code);
    return true;
  });
}

/**
 * Check if a currency code is supported
 * @param currencyCode - ISO 4217 currency code
 * @returns True if supported, false otherwise
 */
export function isCurrencySupported(currencyCode: string): boolean {
  return Object.values(CURRENCY_MAP).some(
    (currency) => currency.code === currencyCode
  );
}
