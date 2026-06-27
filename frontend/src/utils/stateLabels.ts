import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { STATES } from "@/data/states";
import { stateNameFor } from "@/i18n/stateNames";

/** Localized state/UT label for the active UI language. */
export function useStateLabel() {
  const { i18n, t } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || "en";

  return useCallback(
    (stateId) => {
      if (!stateId) return t("stateStrip.allIndia");
      const native = stateNameFor(lang, stateId);
      const fallback = STATES.find((s) => s.id === stateId)?.n ?? stateId;
      return native || t(`states.${stateId}`, { defaultValue: fallback });
    },
    [lang, t]
  );
}
