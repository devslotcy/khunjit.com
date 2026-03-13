import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enTranslations from '../i18n/en.json';
import thTranslations from '../i18n/th.json';
import viTranslations from '../i18n/vi.json';
import filTranslations from '../i18n/fil.json';
import idTranslations from '../i18n/id.json';
import jaTranslations from '../i18n/ja.json';
import koTranslations from '../i18n/ko.json';
import deTranslations from '../i18n/de.json';
import frTranslations from '../i18n/fr.json';
import itTranslations from '../i18n/it.json';
import trTranslations from '../i18n/tr.json';

// Supported languages configuration
export const SUPPORTED_UI_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', flag: '🇵🇭' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
] as const;

export type UILanguageCode = typeof SUPPORTED_UI_LANGUAGES[number]['code'];

// Translation resources
const resources = {
  en: { translation: enTranslations },
  th: { translation: thTranslations },
  vi: { translation: viTranslations },
  fil: { translation: filTranslations },
  id: { translation: idTranslations },
  ja: { translation: jaTranslations },
  ko: { translation: koTranslations },
  de: { translation: deTranslations },
  fr: { translation: frTranslations },
  it: { translation: itTranslations },
  tr: { translation: trTranslations },
};

// Get supported language codes for validation
const supportedCodes = SUPPORTED_UI_LANGUAGES.map(lang => lang.code);

// Detect browser/system language and map to supported language
function detectBrowserLanguage(): string {
  // Get browser languages (e.g., ['en-US', 'en', 'tr'])
  const browserLangs = navigator.languages || [navigator.language];

  for (const lang of browserLangs) {
    // Extract base language code (e.g., 'en-US' -> 'en')
    const baseCode = lang.split('-')[0].toLowerCase();

    // Check if it's a supported language
    if (supportedCodes.includes(baseCode as typeof supportedCodes[number])) {
      return baseCode;
    }
  }

  // Default to English if no match
  return 'en';
}

// Check if user has explicitly set a language preference
function getSavedLanguage(): string | null {
  const saved = localStorage.getItem('mendly_ui_language');
  if (saved && supportedCodes.includes(saved as typeof supportedCodes[number])) {
    return saved;
  }
  return null;
}

// Determine initial language: saved preference > browser language > English
const initialLanguage = getSavedLanguage() || detectBrowserLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage, // Set detected/saved language
    fallbackLng: 'en', // Default to English if translation missing
    supportedLngs: supportedCodes,

    interpolation: {
      escapeValue: false, // React already escapes
    },

    react: {
      useSuspense: false,
    },

    // Debug in development
    debug: false,
  });

// Save language preference when changed
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('mendly_ui_language', lng);
});

export default i18n;
