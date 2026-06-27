/** Flatten / unflatten helpers for src/i18n/locales/en.json */

export function toFlat(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out[path] = v;
    else Object.assign(out, toFlat(v, path));
  }
  return out;
}

export function cloneTree(v) {
  return JSON.parse(JSON.stringify(v));
}

/** Apply dot-path string overrides onto a deep clone of `enTree`. Skips unknown paths. */
export function localeFromFlat(enTree, flat) {
  const tree = cloneTree(enTree);
  for (const [path, value] of Object.entries(flat)) {
    if (typeof value !== "string" || !value.trim()) continue;
    const keys = path.split(".");
    let cur = tree;
    for (let i = 0; i < keys.length - 1; i++) {
      if (cur[keys[i]] == null || typeof cur[keys[i]] !== "object") {
        cur = null;
        break;
      }
      cur = cur[keys[i]];
    }
    if (cur == null || typeof cur !== "object") continue;
    cur[keys[keys.length - 1]] = value;
  }
  return tree;
}

export function countFilled(flat) {
  return Object.values(flat).filter((v) => typeof v === "string" && v.trim()).length;
}
