import type { CSSProperties, ImgHTMLAttributes } from "react";
import { useTranslation } from "react-i18next";

type BrandLogoProps = {
  /** Scales the logo (maps to CSS `--brand-logo-height`). */
  height?: number;
  className?: string;
  /** @deprecated Tagline is baked into logo.png */
  showTagline?: boolean;
};

/** Site logo — Live Govt Jobs wordmark (`/logo.png`). */
const LOGO_ASPECT = 520 / 197;

export default function BrandLogo({
  height = 48,
  className = "",
}: BrandLogoProps) {
  const { t } = useTranslation();
  const alt = t("brand.logoAlt", {
    defaultValue: "Live Govt Jobs — official government job alerts",
  });
  const width = Math.round(height * LOGO_ASPECT);

  return (
    <img
      src="/logo.png"
      alt={alt}
      className={`brand-logo ${className}`.trim()}
      style={
        {
          "--brand-logo-height": `${height}px`,
          "--brand-logo-width": `${width}px`,
        } as CSSProperties
      }
      width={width}
      height={height}
      decoding="async"
      {...({ fetchPriority: "high" } as ImgHTMLAttributes<HTMLImageElement>)}
    />
  );
}
