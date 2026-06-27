import { useEffect, useState } from "react";

export type OfficialArchiveItem = {
  id?: string;
  title?: string;
  link?: string;
  sourceName?: string;
  dept?: string;
  summary?: string;
};

type ArchivePayload = {
  items?: OfficialArchiveItem[];
};

/**
 * Loads multiple official archive JSON files in one parallel batch (avoids N separate effects).
 */
export function useOfficialArchivesBatch(topics: readonly string[]) {
  const [itemsByTopic, setItemsByTopic] = useState<Record<string, OfficialArchiveItem[]>>({});
  const topicKey = topics.filter(Boolean).join("\0");

  useEffect(() => {
    const unique = [...new Set(topicKey.split("\0").filter(Boolean))];
    if (!unique.length) {
      setItemsByTopic({});
      return;
    }

    let cancelled = false;

    Promise.all(
      unique.map(async (topic) => {
        try {
          const res = await fetch(`/data/official-archives/${topic}.json`, { cache: "default" });
          if (!res.ok) return [topic, []] as const;
          const json = (await res.json()) as ArchivePayload;
          const items = Array.isArray(json?.items) ? json.items : [];
          return [topic, items] as const;
        } catch {
          return [topic, []] as const;
        }
      })
    ).then((entries) => {
      if (cancelled) return;
      setItemsByTopic(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
    };
  }, [topicKey]);

  return itemsByTopic;
}
