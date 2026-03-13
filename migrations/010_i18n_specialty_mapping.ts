/**
 * Migration: Convert Turkish specialty/therapy labels to i18n keys
 *
 * MAPPING TABLE: Turkish labels -> i18n keys
 * This ensures backward compatibility and allows gradual migration
 */

export const SPECIALTY_MAPPING: Record<string, string> = {
  // Turkish -> i18n key
  "Bireysel Terapi": "individual",
  "Çift Terapisi": "couples",
  "Aile Terapisi": "family",
  "Çocuk ve Ergen": "childAdolescent",
  "Depresyon": "depression",
  "Anksiyete": "anxiety",
  "Travma ve TSSB": "trauma",
  "OKB (Obsesif Kompulsif Bozukluk)": "ocd",
  "Yeme Bozuklukları": "eatingDisorders",
  "Bağımlılık": "addiction",
  "Kariyer Danışmanlığı": "careerCounseling",
  "Stres Yönetimi": "stressManagement",
  "Öfke Yönetimi": "angerManagement",
};

export const THERAPY_APPROACH_MAPPING: Record<string, string> = {
  // Turkish -> i18n key
  "Bilişsel Davranışçı Terapi (BDT)": "cbt",
  "Psikodinamik Terapi": "psychodynamic",
  "EMDR": "emdr",
  "Şema Terapi": "schema",
  "Kabul ve Kararlılık Terapisi (KKT)": "act",
  "Gestalt Terapisi": "gestalt",
  "Çözüm Odaklı Kısa Terapi": "solutionFocused",
  "Varoluşçu Terapi": "existential",
  "Farkındalık Temelli Terapi": "mindfulness",
};

// SQL migration to update existing records
export const migrationSQL = `
-- Function to convert Turkish labels to i18n keys
CREATE OR REPLACE FUNCTION convert_specialty_to_key(turkish_label TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE turkish_label
    WHEN 'Bireysel Terapi' THEN 'individual'
    WHEN 'Çift Terapisi' THEN 'couples'
    WHEN 'Aile Terapisi' THEN 'family'
    WHEN 'Çocuk ve Ergen' THEN 'childAdolescent'
    WHEN 'Depresyon' THEN 'depression'
    WHEN 'Anksiyete' THEN 'anxiety'
    WHEN 'Travma ve TSSB' THEN 'trauma'
    WHEN 'OKB (Obsesif Kompulsif Bozukluk)' THEN 'ocd'
    WHEN 'Yeme Bozuklukları' THEN 'eatingDisorders'
    WHEN 'Bağımlılık' THEN 'addiction'
    WHEN 'Kariyer Danışmanlığı' THEN 'careerCounseling'
    WHEN 'Stres Yönetimi' THEN 'stressManagement'
    WHEN 'Öfke Yönetimi' THEN 'angerManagement'
    ELSE turkish_label -- Keep unknown labels as-is
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION convert_therapy_approach_to_key(turkish_label TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE turkish_label
    WHEN 'Bilişsel Davranışçı Terapi (BDT)' THEN 'cbt'
    WHEN 'Psikodinamik Terapi' THEN 'psychodynamic'
    WHEN 'EMDR' THEN 'emdr'
    WHEN 'Şema Terapi' THEN 'schema'
    WHEN 'Kabul ve Kararlılık Terapisi (KKT)' THEN 'act'
    WHEN 'Gestalt Terapisi' THEN 'gestalt'
    WHEN 'Çözüm Odaklı Kısa Terapi' THEN 'solutionFocused'
    WHEN 'Varoluşçu Terapi' THEN 'existential'
    WHEN 'Farkındalık Temelli Terapi' THEN 'mindfulness'
    ELSE turkish_label -- Keep unknown labels as-is
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing psychologist profiles
UPDATE psychologist_profiles
SET specialties = (
  SELECT array_agg(convert_specialty_to_key(specialty))
  FROM unnest(specialties) AS specialty
)
WHERE specialties IS NOT NULL AND array_length(specialties, 1) > 0;

UPDATE psychologist_profiles
SET therapy_approaches = (
  SELECT array_agg(convert_therapy_approach_to_key(approach))
  FROM unnest(therapy_approaches) AS approach
)
WHERE therapy_approaches IS NOT NULL AND array_length(therapy_approaches, 1) > 0;

-- Clean up functions (optional - keep for future use if needed)
-- DROP FUNCTION IF EXISTS convert_specialty_to_key(TEXT);
-- DROP FUNCTION IF EXISTS convert_therapy_approach_to_key(TEXT);
`;
