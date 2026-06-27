/** All Indian languages supported on the site (shared by i18n + IndianLanguageSelector). */

export type IndianLanguage = {
  code: string;
  label: string;
  native: string;
  dir: "ltr" | "rtl";
};

export const INDIAN_LANGUAGES: IndianLanguage[] = [
  { code: "en", label: "English", native: "English", dir: "ltr" },
  { code: "hi", label: "Hindi", native: "हिन्दी", dir: "ltr" },
  { code: "bn", label: "Bengali", native: "বাংলা", dir: "ltr" },
  { code: "te", label: "Telugu", native: "తెలుగు", dir: "ltr" },
  { code: "mr", label: "Marathi", native: "मराठी", dir: "ltr" },
  { code: "ta", label: "Tamil", native: "தமிழ்", dir: "ltr" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી", dir: "ltr" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", dir: "ltr" },
  { code: "ml", label: "Malayalam", native: "മലയാളം", dir: "ltr" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ", dir: "ltr" },
  { code: "or", label: "Odia", native: "ଓଡ଼ିଆ", dir: "ltr" },
  { code: "as", label: "Assamese", native: "অসমীয়া", dir: "ltr" },
  { code: "ur", label: "Urdu", native: "اردو", dir: "rtl" },
  { code: "kok", label: "Konkani", native: "कोंकणी", dir: "ltr" },
  { code: "mni", label: "Manipuri", native: "মৈতৈলোন্", dir: "ltr" },
  { code: "ne", label: "Nepali", native: "नेपाली", dir: "ltr" },
  { code: "sd", label: "Sindhi", native: "سنڌي", dir: "rtl" },
  { code: "sa", label: "Sanskrit", native: "संस्कृतम्", dir: "ltr" },
  { code: "sat", label: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ", dir: "ltr" },
  { code: "mai", label: "Maithili", native: "मैथिली", dir: "ltr" },
  { code: "doi", label: "Dogri", native: "डोगरी", dir: "ltr" },
  { code: "brx", label: "Bodo", native: "बड़ो", dir: "ltr" },
  { code: "ks", label: "Kashmiri", native: "کٲشُر", dir: "rtl" },
];

/** Locales registered in i18n but hidden from the UI selector until translation is complete. */
export const SELECTOR_HIDDEN_LOCALES = new Set(["brx", "ks", "mni"]);

/** Languages shown in IndianLanguageSelector (excludes incomplete translations). */
export const SELECTOR_LANGUAGES = INDIAN_LANGUAGES.filter(
  (lang) => !SELECTOR_HIDDEN_LOCALES.has(lang.code)
);

export const DEFAULT_LOCALE = "en";
export const LOCALE_STORAGE_KEY = "mygovtjobs-ui-locale";
export const LANGUAGE_COUNT = SELECTOR_LANGUAGES.length;

export function normalizeLanguageCode(code: string | undefined): string {
  return (code || DEFAULT_LOCALE).split("-")[0].split("_")[0].toLowerCase();
}

/** User-selected locale for the language picker (not i18next fallback resolution). */
export function selectorLanguageCode(code: string | undefined): string {
  const base = normalizeLanguageCode(code);
  if (isSelectorLanguage(base)) return base;
  if (isSupportedLanguage(base)) return DEFAULT_LOCALE;
  return DEFAULT_LOCALE;
}

export function languageMeta(code: string): IndianLanguage {
  const base = normalizeLanguageCode(code);
  return INDIAN_LANGUAGES.find((l) => l.code === base) ?? INDIAN_LANGUAGES[0];
}

export function isSupportedLanguage(code: string): boolean {
  return INDIAN_LANGUAGES.some((l) => l.code === code);
}

export function isSelectorLanguage(code: string): boolean {
  return SELECTOR_LANGUAGES.some((l) => l.code === code);
}
