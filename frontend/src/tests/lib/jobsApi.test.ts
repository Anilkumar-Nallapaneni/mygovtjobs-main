/** @vitest-environment happy-dom */
/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(),
}));

import { getSupabase } from "@/lib/supabase";
import {
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

describe("subscribeToAlerts", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.mocked(getSupabase).mockReset();
  });

  it("posts to the alerts API and does not insert through Supabase", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.example.test");
    const insert = vi.fn();
    vi.mocked(getSupabase).mockResolvedValue({
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
      from: vi.fn().mockReturnValue({ insert }),
    } as never);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "sub-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await subscribeToAlerts({
      channel: "email",
      channel_address: "user@example.com",
      state_codes: ["up"],
      categories: ["banking"],
    });

    expect(result).toEqual({ ok: true, id: "sub-1" });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/alerts/subscribe"),
      expect.objectContaining({ method: "POST" })
    );
    expect(insert).not.toHaveBeenCalled();
  });

  it("sends the signed-in session and does not fall back when the API rejects", async () => {
    vi.stubEnv("VITE_API_URL", "");
    const insert = vi.fn();
    vi.mocked(getSupabase).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "token-1", user: { id: "user-1" } } },
        }),
      },
      from: vi.fn().mockReturnValue({ insert }),
    } as never);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "bot",
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await subscribeToAlerts({
      channel: "email",
      channel_address: "owner@example.com",
    });

    expect(result).toEqual({ ok: false, error: "failed" });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/alerts/subscribe"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer token-1" }),
      })
    );
    expect(insert).not.toHaveBeenCalled();
  });
});
