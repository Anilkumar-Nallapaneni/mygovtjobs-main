import type { CSSProperties, ImgHTMLAttributes } from "react";
import { useTranslation } from "react-i18next";

type BrandLogoProps = {
  /** Scales the logo (maps to CSS `--brand-logo-height`). */
  height?: number;
  className?: string;
};

/** Cropped wordmark — Live Govt Jobs (`/logo.webp`, PNG fallback). */
const LOGO_ASPECT = 480 / 180;

/** React 18 DOM typing uses camelCase; the runtime attribute must be lowercase. */
type ImgWithFetchPriority = ImgHTMLAttributes<HTMLImageElement> & {
  fetchpriority?: "high" | "low" | "auto";
};

export default function BrandLogo({
  height = 48,
  className = "",
}: BrandLogoProps) {
  const { t } = useTranslation();
  const alt = t("brand.logoAlt", {
    defaultValue: "Live Govt Jobs — never miss a government notification",
  });
  const width = Math.round(height * LOGO_ASPECT);

  const imgProps: ImgWithFetchPriority = {
    src: "/logo-ui.png",
    alt,
    className: `brand-logo ${className}`.trim(),
    style: {
      "--brand-logo-height": `${height}px`,
      "--brand-logo-width": `${width}px`,
    } as CSSProperties,
    width,
    height,
    decoding: "async",
    // ~30 KB WebP is safe for LCP; preferred via <source> below.
    fetchpriority: "high",
  };

  return (
    <picture className="brand-logo-picture">
      <source type="image/webp" srcSet="/logo.webp" />
      <img {...imgProps} />
    </picture>
  );
}
