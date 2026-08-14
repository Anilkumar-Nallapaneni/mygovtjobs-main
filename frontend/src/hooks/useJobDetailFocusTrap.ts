import { useEffect, type RefObject } from "react";

/** Trap focus + Escape-to-close for modal job detail; no-op body scroll lock for page layout. */
export function useJobDetailFocusTrap(
  panelRef: RefObject<HTMLDivElement | null>,
  onClose: () => void,
  layout: "page" | "modal"
) {
  useEffect(() => {
    const panel = panelRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    const getFocusable = () =>
      panel
        ? Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter(
            (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1
          )
        : [];

    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const nodes = getFocusable();
      if (!nodes.length) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const prevOverflow = document.body.style.overflow;
    if (layout === "modal") {
      document.body.style.overflow = "hidden";
    }
    document.addEventListener("keydown", onKey);
    const nodes = getFocusable();
    (nodes[0] || panel)?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, layout, panelRef]);
}
