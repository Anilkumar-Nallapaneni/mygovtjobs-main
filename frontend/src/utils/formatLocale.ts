/**
 * Map UI language codes to Intl locales.
 * Use plain `en` for dates — `en-IN` follows OS regional prefs and may show Telugu/Hindi month names.
 */

export function dateTimeLocale(uiLocale: string | undefined): string {
  if (!uiLocale || uiLocale === "en" || uiLocale.startsWith("en-")) return "en";
  return uiLocale;
}

/** Indian digit grouping for counts when UI is English. */
export function numberLocale(uiLocale: string | undefined): string {
  if (!uiLocale || uiLocale === "en" || uiLocale.startsWith("en-")) return "en-IN";
  return uiLocale;
}
