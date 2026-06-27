import { useTranslation } from "react-i18next";
import type { HeadlineStatusBadge as Badge } from "@/lib/officialFeed";

type HeadlineStatusBadgeProps = {
  badge: Badge;
};

export default function HeadlineStatusBadge({ badge }: HeadlineStatusBadgeProps) {
  const { t } = useTranslation();
  if (!badge) return null;

  const label =
    badge === "out"
      ? t("headlines.statusOut", { defaultValue: "Out" })
      : badge === "declared"
        ? t("headlines.statusDeclared", { defaultValue: "Declared" })
        : t("headlines.statusDownload", { defaultValue: "Download" });

  return (
    <span className={`official-headlines__status official-headlines__status--${badge}`}>
      {label}
    </span>
  );
}
