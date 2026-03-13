/**
 * Title Mapping for Internationalization
 *
 * This file defines the mapping between Turkish title strings (stored in old DB records)
 * and the new i18n key system for professional and academic titles.
 *
 * IMPORTANT DISTINCTION:
 * - Academic titles (Dr., Doç. Dr., Prof. Dr.): Often kept as-is across languages
 * - Professional titles (Klinik Psikolog, etc.): Fully translated
 */

export const TITLE_MAPPING: Record<string, string> = {
  // Professional titles - these will be fully translated
  "Psikolog": "psychologist",
  "Klinik Psikolog": "clinicalPsychologist",
  "Uzman Psikolog": "expertPsychologist",
  "Uzman Klinik Psikolog": "expertClinicalPsychologist",
  "Psikolojik Danışman": "psychologicalCounselor",
  "Psikoterapist": "psychotherapist",

  // Academic titles - these are typically kept similar across languages
  "Dr.": "dr",
  "Doç. Dr.": "assocProf",
  "Prof. Dr.": "prof",
};

// Reverse mapping for converting keys back to Turkish (for backward compatibility)
export const TITLE_KEY_TO_TURKISH: Record<string, string> = Object.fromEntries(
  Object.entries(TITLE_MAPPING).map(([turkish, key]) => [key, turkish])
);

/**
 * Convert a Turkish title string to an i18n key
 * If the title is not in the mapping, return it as-is (for backward compatibility)
 */
export function titleToKey(title: string | null | undefined): string | null {
  if (!title) return null;
  return TITLE_MAPPING[title] || title;
}

/**
 * Convert an i18n key to Turkish (for backward compatibility or display)
 */
export function keyToTurkishTitle(key: string | null | undefined): string | null {
  if (!key) return null;
  return TITLE_KEY_TO_TURKISH[key] || key;
}

/**
 * Check if a string is a title key (not a raw Turkish string)
 */
export function isTitleKey(value: string | null | undefined): boolean {
  if (!value) return false;
  return Object.values(TITLE_MAPPING).includes(value);
}
