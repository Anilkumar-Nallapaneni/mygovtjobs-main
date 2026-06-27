import { useEffect, useMemo, useState } from "react";
import { RESULT_TOPICS } from "@/data/resultTopics";
import { asOfficialFeedItems } from "@/lib/officialFeed";
import { useOfficialFeed } from "@/hooks/useOfficialFeed";
import { filterOfficialItems } from "@/utils/officialFilters";

/** Feed + archive counts per result topic (for /results/topics index). */
export function useOfficialTopicCounts() {
  const { items: feedItems } = useOfficialFeed();
  const [archiveByTopic, setArchiveByTopic] = useState<Record<string, unknown[]>>({});

  useEffect(() => {
    let cancelled = false;

    Promise.all(
      RESULT_TOPICS.map(async (topic) => {
        if (!topic.archiveFile) return [topic.topicKey, []] as const;
        try {
          const res = await fetch(`/data/official-archives/${topic.archiveFile}.json`, {
            cache: "default",
          });
          const json = res.ok ? await res.json() : null;
          const rows = Array.isArray(json?.items) ? json.items : [];
          return [topic.topicKey, rows] as const;
        } catch {
          return [topic.topicKey, []] as const;
        }
      })
    ).then((rows) => {
      if (cancelled) return;
      setArchiveByTopic(Object.fromEntries(rows));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const feedRows = asOfficialFeedItems(feedItems);
    const map = new Map<string, number>();

    for (const topic of RESULT_TOPICS) {
      const archiveRows = asOfficialFeedItems(archiveByTopic[topic.topicKey] ?? []);
      const seen = new Set<string>();
      const merged = [];
      for (const row of [...archiveRows, ...feedRows]) {
        const link = row.link || row.id;
        if (!link || seen.has(link)) continue;
        seen.add(link);
        merged.push(row);
      }
      map.set(topic.topicKey, filterOfficialItems(merged, { topicKey: topic.topicKey }).length);
    }

    return map;
  }, [archiveByTopic, feedItems]);
}
