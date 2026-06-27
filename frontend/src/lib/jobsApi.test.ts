/** @vitest-environment happy-dom */
/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(),
}));

import { getSupabase } from "@/lib/supabase";
import {
  invalidateLiveJobsSnapshotPrefetch,
  prefetchLiveJobsSnapshot,
  subscribeToAlerts,
} from "@/lib/jobsApi";

describe("prefetchLiveJobsSnapshot", () => {
  afterEach(() => {
    invalidateLiveJobsSnapshotPrefetch();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("falls back to network when inline prefetch resolves empty (no self-deadlock)", async () => {
    window.__LIVE_JOBS_PREFETCH__ = Promise.resolve(null);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({
        items: [{ id: "1", slug: "test-job", title: "Test recruitment 2026", status: "live" }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const snap = await prefetchLiveJobsSnapshot();

    expect(snap.items).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalled();
  });
});

describe("subscribeToAlerts", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(getSupabase).mockReset();
  });

  it("uses Supabase insert when VITE_API_URL is empty", async () => {
    vi.stubEnv("VITE_API_URL", "");
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "sub-1" }, error: null }),
      }),
    });
    vi.mocked(getSupabase).mockResolvedValue({
      from: vi.fn().mockReturnValue({ insert }),
    } as never);

    const result = await subscribeToAlerts({
      channel: "email",
      channel_address: "user@example.com",
      state_codes: ["up"],
      categories: ["banking"],
    });

    expect(result).toEqual({ ok: true, id: "sub-1" });
    expect(insert).toHaveBeenCalledWith({
      channel: "email",
      channel_address: "user@example.com",
      state_codes: ["up"],
      categories: ["banking"],
      qualification_tags: [],
    });
  });
});
