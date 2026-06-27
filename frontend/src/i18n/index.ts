import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/i18n/locales/en.json";
import {
  DEFAULT_LOCALE,
  INDIAN_LANGUAGES,
  LOCALE_STORAGE_KEY,
  isSelectorLanguage,
  isSupportedLanguage,
  languageMeta,
} from "@/i18n/languages";
import { ensureLocale } from "@/i18n/ensureLocale";
import { withStateNames } from "@/i18n/stateNames";

export { ensureLocale };

const LEGACY_LOCALE_KEYS = [
  "mygovtjobs-ui-language",
  "bharatnaukri-ui-language",
  "bharatnaukri-listing-language",
  "naukrisetu-listing-language",
  "naukrisetu-ui-language",
];

function applyDocumentLocale(code: string) {
  const meta = languageMeta(code);
  document.documentElement.lang = code;
  document.documentElement.dir = meta.dir;
}

function readPersistedLocale(): string {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && isSupportedLanguage(stored)) {
      return isSelectorLanguage(stored) ? stored : DEFAULT_LOCALE;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

function clearLegacyLocaleKeys() {
  try {
    for (const key of LEGACY_LOCALE_KEYS) localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function persistLocale(code: string) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
}

clearLegacyLocaleKeys();
const initialLocale = readPersistedLocale();
applyDocumentLocale(initialLocale);

const resources = {
  [DEFAULT_LOCALE]: { translation: withStateNames(en, DEFAULT_LOCALE) },
};

i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: INDIAN_LANGUAGES.map((l) => l.code),
  nonExplicitSupportedLngs: false,
  interpolation: { escapeValue: false },
  returnEmptyString: false,
  react: {
    useSuspense: false,
    bindI18n: "languageChanged loaded",
    bindI18nStore: "added removed",
  },
});

if (initialLocale !== DEFAULT_LOCALE) {
  void ensureLocale(initialLocale).then(() => {
    if (i18n.language !== initialLocale) void i18n.changeLanguage(initialLocale);
  });
} else if (i18n.language !== initialLocale) {
  void i18n.changeLanguage(initialLocale);
}

i18n.on("languageChanged", (lng) => {
  applyDocumentLocale(lng);
  persistLocale(lng);
});

export default i18n;
