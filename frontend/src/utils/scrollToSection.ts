function resolveScrollBehavior(
  requested: "auto" | "smooth" | "instant",
): ScrollBehavior {
  if (requested === "instant") return "auto";
  if (typeof window === "undefined") return requested;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "auto";
  // Smooth programmatic scroll fights touch scrolling on phones and reads as jitter.
  if (window.matchMedia("(pointer: coarse)").matches) return "auto";
  return requested;
}

/** Scroll to a section after React state updates have painted. Falls back if target is hidden. */
export function scrollToSection(
  sectionId: string | null | undefined,
  {
    behavior = "smooth",
    delayMs = 0,
  }: { behavior?: "auto" | "smooth" | "instant"; delayMs?: number } = {},
) {
  const scrollBehavior = resolveScrollBehavior(behavior);
  const run = () => {
    const fallbacks = ["state-jobs-panel", "main-jobs", "official-headlines", "alert-section"];
    const candidates = sectionId ? [sectionId, ...fallbacks.filter((id) => id !== sectionId)] : fallbacks;

    for (const id of candidates) {
      const el = document.getElementById(id);
      if (!el) continue;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const nav = document.querySelector(".navbar");
      const navHeight = nav instanceof HTMLElement ? nav.offsetHeight : 0;
      const top = el.getBoundingClientRect().top + window.scrollY - navHeight - 8;
      window.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior });
      return;
    }
  };

  if (delayMs > 0) {
    requestAnimationFrame(() => {
      window.setTimeout(run, delayMs);
    });
    return;
  }
  requestAnimationFrame(run);
}
