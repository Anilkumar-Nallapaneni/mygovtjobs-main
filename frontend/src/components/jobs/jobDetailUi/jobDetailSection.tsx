import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import type { CSSProperties, ReactNode } from "react";

export function Section({
  title,
  children,
  className = "",
  reveal = true,
  revealDelay = 0,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  reveal?: boolean;
  revealDelay?: number;
}) {
  const { ref, visible } = useRevealOnScroll<HTMLElement>();
  const revealClass =
    reveal ? `mgj-reveal${visible ? " mgj-reveal--visible" : ""}` : "";
  const style = reveal
    ? ({ "--mgj-reveal-delay": `${revealDelay}ms` } as CSSProperties)
    : undefined;

  return (
    <section
      ref={reveal ? ref : undefined}
      className={`job-detail-section ${revealClass} ${className}`.trim()}
      style={style}
    >
      {title ? <h3 className="job-detail-section-title">{title}</h3> : null}
      {children}
    </section>
  );
}
