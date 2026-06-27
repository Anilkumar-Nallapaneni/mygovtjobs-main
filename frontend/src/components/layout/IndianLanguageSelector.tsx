import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ensureLocale } from "@/i18n/ensureLocale";
import {
  LANGUAGE_COUNT,
  SELECTOR_LANGUAGES,
  languageMeta,
  selectorLanguageCode,
} from "@/i18n/languages";

export default function IndianLanguageSelector() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Use i18n.language (user choice), not resolvedLanguage — while a locale pack loads,
  // resolvedLanguage can fall back to English and make the wrong option look selected.
  const activeLang = selectorLanguageCode(i18n.language);
  const current = languageMeta(activeLang);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pickLanguage = async (code: string) => {
    if (code === activeLang) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    setError(null);
    try {
      await ensureLocale(code);
      await i18n.changeLanguage(code);
      setOpen(false);
    } catch (e) {
      console.error("[IndianLanguageSelector]", e);
      setError(t("lang.error"));
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div ref={rootRef} className="indian-language-selector">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        title={t("lang.choose")}
        disabled={switching}
        onClick={() => setOpen((v) => !v)}
        className={`indian-language-selector__trigger${error ? " indian-language-selector__trigger--error" : ""}`}
      >
        <span aria-hidden>🌐</span>
        <span className="indian-language-selector__native">{switching ? "…" : current.native}</span>
        <span className="indian-language-selector__caret">{open ? "▲" : "▼"}</span>
      </button>

      {error && (
        <div className="indian-language-selector__err" role="alert">
          {error}
        </div>
      )}

      {open && (
        <ul role="listbox" aria-label={t("lang.label")} className="indian-language-selector__menu">
          <li aria-hidden className="indian-language-selector__menu-head">
            {t("lang.count", {
              count: LANGUAGE_COUNT,
              defaultValue: `${LANGUAGE_COUNT} UI languages`,
            })}
          </li>
          <li aria-hidden className="indian-language-selector__menu-note">
            {t("lang.uiOnlyNote", {
              defaultValue:
                "Menus and labels are translated. Job notifications stay in their original language (usually English).",
            })}
          </li>
          {SELECTOR_LANGUAGES.map((lang) => {
            const active = activeLang === lang.code;
            return (
              <li key={lang.code} role="option" aria-selected={active}>
                <button
                  type="button"
                  disabled={switching}
                  onClick={() => pickLanguage(lang.code)}
                  className={`indian-language-selector__option${active ? " indian-language-selector__option--active" : ""}`}
                  style={{ direction: lang.dir as "ltr" | "rtl" }}
                >
                  <span>{lang.native}</span>
                  <span className="indian-language-selector__option-sub">{lang.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
