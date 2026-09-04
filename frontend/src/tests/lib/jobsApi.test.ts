/** @vitest-environment happy-dom */
/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(),
}));

import { getSupabase } from "@/lib/supabase";
import {
  fetchJobBySlug,
  invalidateLiveJobsSnapshotPrefetch,
  markLiveJobsSnapshotFetched,
  prefetchLiveJobsSnapshot,
  resetLiveJobsSnapshotFetchClockForTests,
  shouldHardBustLiveJobsCache,
  LIVE_JOBS_HARD_BUST_MS,
  subscribeToAlerts,
} from "@/lib/jobsApi";

describe("prefetchLiveJobsSnapshot", () => {
  afterEach(() => {
    invalidateLiveJobsSnapshotPrefetch();
    resetLiveJobsSnapshotFetchClockForTests();
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

describe("shouldHardBustLiveJobsCache", () => {
  afterEach(() => {
    resetLiveJobsSnapshotFetchClockForTests();
  });

  it("does not hard-bust before the first successful fetch", () => {
    expect(shouldHardBustLiveJobsCache()).toBe(false);
  });

  it("soft-refreshes within the soft window", () => {
    const t0 = 1_000_000;
    markLiveJobsSnapshotFetched(t0);
    expect(shouldHardBustLiveJobsCache(t0 + 60_000)).toBe(false);
  });

  it("hard-busts after the soft window expires", () => {
    const t0 = 1_000_000;
    markLiveJobsSnapshotFetched(t0);
    expect(shouldHardBustLiveJobsCache(t0 + LIVE_JOBS_HARD_BUST_MS)).toBe(true);
  });
});

describe("fetchJobBySlug archive fallback", () => {
  afterEach(() => {
    invalidateLiveJobsSnapshotPrefetch();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("resolves expired archive slugs from jobs-archive.json in static mode", async () => {
    vi.stubEnv("VITE_JOBS_SOURCE", "static");
    const fetchMock = vi.fn(async (url: string) => {
      const href = String(url);
      if (href.includes("live-jobs.json")) {
        return {
          ok: true,
          headers: { get: () => "application/json" },
          json: async () => ({ items: [{ slug: "live-only", title: "Live" }] }),
        };
      }
      if (href.includes("jobs-archive.json")) {
        return {
          ok: true,
          headers: { get: () => "application/json" },
          json: async () => ({
            items: [
              {
                slug: "isro-careers-recruitment-to-the-post-of-technical-assistant-technician-b-draught-412bc5db",
                title: "ISRO LPSC",
                status: "expired",
                apply_url: "https://www.isro.gov.in/LPSCRecruitment13.html",
              },
            ],
          }),
        };
      }
      return { ok: false, headers: { get: () => "" }, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);

    const job = await fetchJobBySlug(
      "isro-careers-recruitment-to-the-post-of-technical-assistant-technician-b-draught-412bc5db"
    );

    expect(job?.title).toBe("ISRO LPSC");
    expect(job?.status).toBe("expired");
  });
});

describe("subscribeToAlerts", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(getSupabase).mockReset();
  });

  it("uses Supabase insert when VITE_API_URL is empty", async () => {
    vi.stubEnv("VITE_API_URL", "");
    // Anonymous insert must NOT chain `.select()` (anon has no SELECT policy → 42501).
    const insert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(getSupabase).mockResolvedValue({
      from: vi.fn().mockReturnValue({ insert }),
    } as never);

    const result = await subscribeToAlerts({
      channel: "email",
      channel_address: "user@example.com",
      state_codes: ["up"],
      categories: ["banking"],
    });

    expect(result).toEqual({ ok: true, id: "subscribed" });
    expect(insert).toHaveBeenCalledWith({
      channel: "email",
      channel_address: "user@example.com",
      state_codes: ["up"],
      categories: ["banking"],
      qualification_tags: [],
    });
  });

  it("derives authenticated alert ownership from the Supabase session", async () => {
    vi.stubEnv("VITE_API_URL", "");
    const insert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(getSupabase).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: "user-1" } } },
        }),
      },
      from: vi.fn().mockReturnValue({ insert }),
    } as never);

    const result = await subscribeToAlerts({
      channel: "email",
      channel_address: "owner@example.com",
    });

    expect(result.ok).toBe(true);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1" })
    );
  });
});
