/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, within, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/i18n";
import HomeExamUpdatesRow from "@/components/home/HomeExamUpdatesRow";
import type { JobRecord } from "@/types/job";

const mockFeedItems = [
  {
    id: "feed-admit-1",
    title: "SSC Admit Card 2026",
    link: "https://ssc.gov.in/admit",
    sourceName: "SSC",
    dept: "SSC",
  },
  {
    id: "feed-result-1",
    title: "RRB Result Declared",
    link: "https://rrb.gov.in/result",
    sourceName: "RRB",
    dept: "RRB",
  },
];

vi.mock("@/hooks/useOfficialFeed", () => ({
  useOfficialFeed: () => ({
    items: mockFeedItems,
    loading: false,
    generatedAt: "2026-06-15T10:00:00Z",
    error: null,
  }),
}));

vi.mock("@/hooks/useOfficialArchivesBatch", () => ({
  useOfficialArchivesBatch: () => ({
    "admit-cards": [
      {
        id: "arch-admit-1",
        title: "UPSC Admit Card",
        link: "https://upsc.gov.in/admit",
        sourceName: "UPSC",
      },
    ],
    results: [
      {
        id: "arch-result-1",
        title: "Bihar Result 2026",
        link: "https://bpsc.bih.nic.in/result",
        sourceName: "BPSC",
      },
    ],
    "answer-keys": [],
    syllabus: [],
  }),
}));

const mockJob: JobRecord = {
  id: "job-1",
  slug: "railway-recruitment-2026",
  title: "Railway Recruitment 2026",
  dept: "Indian Railways",
  category: "railway",
  stateIds: ["all"],
  vacancies: 500,
  qual: "Graduate",
  lastDate: "2026-12-31",
  apply_url: "https://indianrailways.gov.in/notification.pdf",
  status: "live",
  published_at: "2026-06-10",
} as JobRecord;

function renderRow(overrides: Record<string, unknown> = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <HomeExamUpdatesRow jobs={[mockJob]} onJobClick={vi.fn()} {...overrides} />
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe("HomeExamUpdatesRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders lifecycle timeline and tabbed exam updates with Latest as first tab", () => {
    const { container } = renderRow();
    const section = container.querySelector(".home-exam-updates");
    expect(section).toBeTruthy();
    expect(container.querySelector(".exam-lifecycle")).toBeTruthy();
    expect(container.querySelector(".home-exam-tabs")).toBeTruthy();
    expect(container.querySelector(".home-discovery-chip__flag")).toBeTruthy();

    const latestTab = container.querySelector("#home-exam-tab-latest");
    expect(latestTab?.getAttribute("aria-selected")).toBe("true");

    const scoped = within(section as HTMLElement);
    expect(scoped.getByRole("link", { name: /all exam updates/i }).getAttribute("href")).toBe(
      "/results/topics"
    );
  });

  it("links latest notifications to internal job detail when slug exists", () => {
    const { container } = renderRow();
    const jobLinks = within(container).getAllByRole("link", { name: /Railway Recruitment 2026/i });
    expect(jobLinks[0]?.getAttribute("href")).toBe("/jobs/railway-recruitment-2026");
  });

  it("links feed and archive items externally with verified badge", () => {
    const { container } = renderRow();
    const admitTab = within(container).getByRole("tab", { name: /admit card/i });
    fireEvent.click(admitTab);

    const upsc = within(container).getByRole("link", { name: /UPSC Admit Card/i });
    expect(upsc.getAttribute("href")).toContain("upsc.gov.in");
    expect(upsc.getAttribute("target")).toBe("_blank");
    expect(container.textContent).toContain(".gov.in verified");
  });

  it("switches tab panel when a lifecycle step is selected", () => {
    const { container } = renderRow();
    const resultStep = within(container).getByRole("button", { name: /results/i });
    fireEvent.click(resultStep);

    const resultTab = container.querySelector("#home-exam-tab-sarkari-result");
    expect(resultTab?.getAttribute("aria-selected")).toBe("true");
    expect(within(container).getByRole("link", { name: /Bihar Result 2026/i })).toBeTruthy();
  });

  it("switches tabs via tab buttons including Latest", () => {
    const { container } = renderRow();
    const syllabusTab = within(container).getByRole("tab", { name: /syllabus/i });
    fireEvent.click(syllabusTab);
    expect(syllabusTab.getAttribute("aria-selected")).toBe("true");

    const latestTab = within(container).getByRole("tab", { name: /^latest$/i });
    fireEvent.click(latestTab);
    expect(latestTab.getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector(".home-discovery-chip__flag")).toBeTruthy();
  });
});
