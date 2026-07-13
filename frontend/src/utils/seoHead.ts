type MetaAttr = "name" | "property";

function metaSelector(attr: MetaAttr, key: string): string {
  return `meta[${attr}="${key}"]`;
}

function metaKey(attr: MetaAttr, key: string): string {
  return `${attr}:${key}`;
}

export type SeoHeadSession = {
  setTitle: (title: string) => void;
  upsertMeta: (key: string, content: string, attr?: MetaAttr) => void;
  upsertLink: (rel: string, href: string) => void;
  upsertJsonLd: (id: string, payload: Record<string, unknown>) => void;
  restore: () => void;
};

/** Apply head tags and restore previous values on cleanup. */
export function beginSeoHead(): SeoHeadSession {
  const prevTitle = document.title;
  const prevMetas = new Map<string, string | null>();
  const prevLinks = new Map<string, string | null>();
  const touchedMetas = new Set<string>();
  const touchedLinks = new Set<string>();
  const jsonLdIds: string[] = [];

  const setTitle = (title: string) => {
    document.title = title;
  };

  const upsertMeta = (key: string, content: string, attr: MetaAttr = "name") => {
    if (!content) return;
    const token = metaKey(attr, key);
    if (!touchedMetas.has(token)) {
      const existing = document.head.querySelector(metaSelector(attr, key));
      prevMetas.set(token, existing?.getAttribute("content") ?? null);
      touchedMetas.add(token);
    }
    let el = document.head.querySelector(metaSelector(attr, key));
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };

  const upsertLink = (rel: string, href: string) => {
    if (!href) return;
    if (!touchedLinks.has(rel)) {
      const existing = document.head.querySelector(`link[rel="${rel}"]`);
      prevLinks.set(rel, existing?.getAttribute("href") ?? null);
      touchedLinks.add(rel);
    }
    let el = document.head.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", rel);
      document.head.appendChild(el);
    }
    el.setAttribute("href", href);
  };

  const upsertJsonLd = (id: string, payload: Record<string, unknown>) => {
    document.getElementById(id)?.remove();
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = id;
    script.textContent = JSON.stringify(payload);
    document.head.appendChild(script);
    if (!jsonLdIds.includes(id)) jsonLdIds.push(id);
  };

  const restore = () => {
    document.title = prevTitle;

    for (const token of touchedMetas) {
      const [attr, key] = token.split(":") as [MetaAttr, string];
      const el = document.head.querySelector(metaSelector(attr, key));
      const prev = prevMetas.get(token);
      if (prev === undefined) continue;
      if (prev === null) el?.remove();
      else if (el) el.setAttribute("content", prev);
    }

    for (const rel of touchedLinks) {
      const el = document.head.querySelector(`link[rel="${rel}"]`);
      const prev = prevLinks.get(rel);
      if (prev === undefined) continue;
      if (prev === null) el?.remove();
      else if (el) el.setAttribute("href", prev);
    }

    for (const id of jsonLdIds) {
      document.getElementById(id)?.remove();
    }
  };

  return { setTitle, upsertMeta, upsertLink, upsertJsonLd, restore };
}
