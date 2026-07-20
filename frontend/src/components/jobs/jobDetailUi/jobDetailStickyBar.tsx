export function JobDetailStickyBar({
  primaryAction,
  shareTitle,
  shareUrl,
  t,
}: {
  primaryAction: { url: string; label: string } | null;
  shareTitle: string;
  shareUrl: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const whatsAppShare =
    shareTitle && shareUrl
      ? `https://wa.me/?text=${encodeURIComponent(`${shareTitle}\n${shareUrl}`)}`
      : null;

  return (
    <div className="job-detail-sticky-bar" aria-label={t("jobDetail.quickActions", { defaultValue: "Quick actions" })}>
      {primaryAction ? (
        <a
          href={primaryAction.url}
          target="_blank"
          rel="noopener noreferrer"
          className="job-detail-sticky-bar__apply"
          data-testid="official-apply-link"
        >
          {primaryAction.label}
        </a>
      ) : null}
      {whatsAppShare ? (
        <a
          href={whatsAppShare}
          target="_blank"
          rel="noopener noreferrer"
          className="job-detail-sticky-bar__share"
        >
          {t("socialAlert.shareJob", { defaultValue: "Share" })}
        </a>
      ) : null}
      <a href="/alerts" className="job-detail-sticky-bar__alert">
        {t("socialAlert.personalAlerts", { defaultValue: "Alerts" })}
      </a>
    </div>
  );
}
