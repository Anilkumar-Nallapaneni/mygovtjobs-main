/** Deep-merge locale overrides onto the canonical en.json tree (overrides win). */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown> | null | undefined
): T {
  if (!source || typeof source !== "object") return target;
  const out = { ...target } as T;
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = out[key];
    if (
      sv &&
      typeof sv === "object" &&
      !Array.isArray(sv) &&
      tv &&
      typeof tv === "object" &&
      !Array.isArray(tv)
    ) {
      (out as Record<string, unknown>)[key] = deepMerge(
        tv as Record<string, unknown>,
        sv as Record<string, unknown>
      );
    } else if (sv !== undefined) {
      (out as Record<string, unknown>)[key] = sv;
    }
  }
  return out;
}
