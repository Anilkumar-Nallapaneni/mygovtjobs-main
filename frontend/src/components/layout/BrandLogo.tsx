import type { CSSProperties, ImgHTMLAttributes } from "react";
import { useTranslation } from "react-i18next";

type BrandLogoProps = {
  /** Scales the logo (maps to CSS `--brand-logo-height`). */
  height?: number;
  className?: string;
};

/** Cropped wordmark — Live Govt Jobs (`/logo.png`, transparent). */
const LOGO_ASPECT = 1486 / 558;

export default function BrandLogo({
  height = 48,
  className = "",
}: BrandLogoProps) {
  const { t } = useTranslation();
  const alt = t("brand.logoAlt", {
    defaultValue: "Live Govt Jobs — never miss a government notification",
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
