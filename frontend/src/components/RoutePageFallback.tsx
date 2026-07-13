import { useTranslation } from "react-i18next";

/** Lightweight placeholder while a lazy route chunk loads. */
export default function RoutePageFallback() {
  const { t } = useTranslation();
  return (
    <div className="route-page-fallback" role="status" aria-live="polite" aria-busy="true">
      <div className="route-page-fallback__spinner" aria-hidden />
      <span className="route-page-fallback__label">
        {t("jobsStatus.loading", { defaultValue: "Loading…" })}
      </span>
    </div>
  );
}
