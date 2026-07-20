/** Reveal React root and hide the LCP island shell (see index.html #lcp-shell). */

function stylesheetsReady(): boolean {
  if (typeof document === "undefined") return true;
  const sheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
  if (!sheets.length) return true;
  return sheets.every((link) => {
    // print→all deferred CSS still counts as a stylesheet; wait until media is all or sheet loaded.
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

  // Safety — never block shell forever if a stylesheet hangs.
  const timer = window.setTimeout(finish, 2_500);
  cleanupFns.push(() => window.clearTimeout(timer));

  if (stylesheetsReady()) finish();

  const cleanup = () => {
    for (const c of cleanupFns) c();
  };
  return cleanup;
}

export function markAppReady(): void {
  if (typeof document === "undefined") return;
  if (document.body.classList.contains("app-ready")) return;
  document.body.classList.add("app-ready");
  const shell = document.getElementById("lcp-shell");
  if (shell) {
    shell.setAttribute("aria-busy", "false");
    shell.setAttribute("hidden", "");
  }
}

/** Reveal React after critical CSS is applied — cuts FOUC/CLS from deferred stylesheets. */
export function scheduleMarkAppReady(): () => void {
  let cancelled = false;
  let innerCleanup: (() => void) | undefined;

  const reveal = () => {
    if (cancelled) return;
    requestAnimationFrame(() => {
      if (cancelled) return;
      markAppReady();
    });
  };

  innerCleanup = whenStylesReady(reveal);

  return () => {
    cancelled = true;
    innerCleanup?.();
  };
}
