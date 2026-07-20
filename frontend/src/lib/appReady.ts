/** Reveal React root and hide the LCP island shell (see index.html #lcp-shell). */

let contentReady = false;
let stylesReadyLatch = false;
let revealScheduled = false;

function stylesheetsReady(): boolean {
  if (typeof document === "undefined") return true;
  const sheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
  if (!sheets.length) return true;
  return sheets.every((link) => {
    try {
      return Boolean(link.sheet) || link.media === "all" || link.dataset.loaded === "1";
    } catch {
      return true;
    }
  });
}

function whenStylesReady(fn: () => void): () => void {
  if (stylesheetsReady()) {
    fn();
    return () => undefined;
  }

  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    cleanup();
    fn();
  };

  const onLoad = (event: Event) => {
    const link = event.currentTarget as HTMLLinkElement;
    link.dataset.loaded = "1";
    if (stylesheetsReady()) finish();
  };

  const cleanupFns: Array<() => void> = [];
  for (const link of links) {
    if (link.sheet) {
      link.dataset.loaded = "1";
      continue;
    }
    link.addEventListener("load", onLoad);
    link.addEventListener("error", onLoad);
    cleanupFns.push(() => {
      link.removeEventListener("load", onLoad);
      link.removeEventListener("error", onLoad);
    });
  }

  const timer = window.setTimeout(finish, 2_500);
  cleanupFns.push(() => window.clearTimeout(timer));

  if (stylesheetsReady()) finish();

  const cleanup = () => {
    for (const c of cleanupFns) c();
  };
  return cleanup;
}

function tryReveal(): void {
  if (revealScheduled) return;
  if (!stylesReadyLatch || !contentReady) return;
  revealScheduled = true;
  // Double rAF: let React commit layout before measuring/hiding the shell.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      markAppReady();
    });
  });
}

export function markAppReady(): void {
  if (typeof document === "undefined") return;
  if (document.body.classList.contains("app-ready")) return;
  document.body.classList.add("app-ready");
  const shell = document.getElementById("lcp-shell");
  if (!shell) return;
  shell.setAttribute("aria-busy", "false");
  shell.setAttribute("hidden", "");
}

/** Call once first meaningful React content has mounted (HomePage / route page). */
export function notifyAppContentReady(): void {
  if (contentReady) return;
  contentReady = true;
  tryReveal();
}

/**
 * Arm style waiters. Content reveal still needs `notifyAppContentReady()`
 * (or the safety timeout) so we don't swap onto an empty Suspense fallback.
 */
export function scheduleMarkAppReady(): () => void {
  let cancelled = false;
  let innerCleanup: (() => void) | undefined;

  innerCleanup = whenStylesReady(() => {
    if (cancelled) return;
    stylesReadyLatch = true;
    tryReveal();
  });

  // Safety — never leave users on a permanent shell.
  const safety = window.setTimeout(() => {
    if (cancelled) return;
    contentReady = true;
    stylesReadyLatch = true;
    tryReveal();
  }, 4_500);

  return () => {
    cancelled = true;
    window.clearTimeout(safety);
    innerCleanup?.();
  };
}
