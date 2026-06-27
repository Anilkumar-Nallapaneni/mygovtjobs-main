import { useEffect, useState } from "react";
import { loadOfficialFeed } from "@/lib/officialFeed";

/**
 * Loads official RSS snapshot (shared module cache with App ticker).
 * Pass `enabled: false` to defer the network fetch until after first paint.
 */
export function useOfficialFeed(enabled = true) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    loadOfficialFeed()
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    items: Array.isArray(data?.items) ? data.items : [],
    generatedAt: data?.generatedAt || null,
    sourceReports: Array.isArray(data?.sourceReports) ? data.sourceReports : [],
    error,
    loading,
  };
}
