import type { CSSProperties, ImgHTMLAttributes } from "react";
import { useTranslation } from "react-i18next";

type BrandLogoProps = {
  /** Scales the logo (maps to CSS `--brand-logo-height`). */
  height?: number;
  className?: string;
};

/** Cropped wordmark — Live Govt Jobs (`/logo.png`, transparent). */
const LOGO_ASPECT = 1486 / 558;

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
    src: "/logo.png",
    alt,
    className: `brand-logo ${className}`.trim(),
    style: {
      "--brand-logo-height": `${height}px`,
      "--brand-logo-width": `${width}px`,
    } as CSSProperties,
    width,
    height,
    decoding: "async",
    fetchpriority: "high",
  };

  return <img {...imgProps} />;
}
