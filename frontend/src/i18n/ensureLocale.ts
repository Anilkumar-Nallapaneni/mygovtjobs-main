import i18n from "i18next";
import en from "@/i18n/locales/en.json";
import hi from "@/i18n/locales/hi.json";
import { DEFAULT_LOCALE } from "@/i18n/languages";
import { deepMerge } from "@/i18n/mergeLocale";
import { withStateNames } from "@/i18n/stateNames";

/** One async chunk per language — avoids bundling all 22+ packs together. */
const localePackLoaders = import.meta.glob<Record<string, unknown>>("./localeOverrides/*.json", {
  import: "default",
});

function buildLocalePack(code: string, overrides: Record<string, unknown> | null) {
  const base = JSON.parse(JSON.stringify(en)) as Record<string, unknown>;
  const merged = overrides ? deepMerge(base, overrides) : base;
  return withStateNames(merged, code);
}

async function loadLocaleOverrides(code: string): Promise<Record<string, unknown> | null> {
  const key = `./localeOverrides/${code}.json`;
  const load = localePackLoaders[key];
  if (!load) return null;
  return (await load()) as Record<string, unknown>;
}

/** Register a language pack if not already loaded (one ~30–40KB chunk per locale). */
export async function ensureLocale(code: string) {
  if (code === DEFAULT_LOCALE || i18n.hasResourceBundle(code, "translation")) return;

  let overrides = await loadLocaleOverrides(code);
  if (code === "hi") {
    overrides = deepMerge(
      (overrides ?? {}) as Record<string, unknown>,
      hi as Record<string, unknown>
    );
  }
  i18n.addResourceBundle(code, "translation", buildLocalePack(code, overrides), true, true);
}
