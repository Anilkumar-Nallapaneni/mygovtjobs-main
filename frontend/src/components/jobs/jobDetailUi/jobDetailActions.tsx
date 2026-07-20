import { isPdfUrl } from "@/utils/officialDomains";

export function JobDetailActions({
  actions,
  emptyLabel,
}: {
  actions: Array<{ url: string; label: string; variant?: string }>;
  emptyLabel: string;
}) {
  if (!actions.length) {
    return (
      <div className="job-detail-actions job-detail-actions--inline job-detail-actions--empty">
        <p>{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="job-detail-actions job-detail-actions--inline">
      {actions.map((action) => {
        const isMailto = action.url.toLowerCase().startsWith("mailto:");
        return (
          <a
            key={action.url}
            href={action.url}
            {...(isMailto ? {} : { target: "_blank", rel: "noopener noreferrer" })}
            className={
              action.variant === "primary"
                ? "job-detail-action-btn job-detail-action-btn--primary"
                : "job-detail-action-btn job-detail-action-btn--secondary"
            }
            data-testid={action.variant === "primary" ? "official-apply-link" : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            {isPdfUrl(action.url) ? "📄" : isMailto ? "✉️" : "🔗"} {action.label}
            {!isMailto ? " ↗" : ""}
          </a>
        );
      })}
    </div>
  );
}
