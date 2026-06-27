import { useEffect, useState } from "react";

export type ArchiveTopic = string | null;

type ArchivePayload = {
  generatedAt?: string | null;
  count?: number;
  items?: unknown[];
};

export function useOfficialArchive(topic: ArchiveTopic) {
  const [data, setData] = useState<ArchivePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!topic) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    fetch(`/data/official-archives/${topic}.json`, { cache: "default" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setData(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [topic]);

  return {
    items: Array.isArray(data?.items) ? data.items : [],
    generatedAt: data?.generatedAt || null,
    error,
  };
}
