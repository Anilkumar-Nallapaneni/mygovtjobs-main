/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/i18n";
import type { JobRecord } from "@/types/job";

vi.mock("@/lib/contactApi", () => ({
  isContactApiConfigured: vi.fn(() => true),
  submitContactForm: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/adminApi", () => ({
  getStoredAdminKey: vi.fn(() => ""),
  setStoredAdminKey: vi.fn(),
  fetchAdminDashboard: vi.fn(),
  runIngest: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    configured: false,
    loading: false,
    user: null,
    profile: null,
    signInWithEmail: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));

vi.mock("@/hooks/useRecruitmentEvents", () => ({
  useRecruitmentEventsByType: () => ({
    rows: [
      {
        id: "rec-1",
        canonical_slug: "ssc-cgl-2026",
        organization: "SSC",
        title: "SSC CGL 2026",
        state_codes: [],
        status: "active",
        primary_job_id: "1",
        official_url: "https://ssc.gov.in/notice",
        events: [
          {
            id: "ev-1",
            recruitment_id: "rec-1",
            event_type: "result",
            event_date: "2026-08-10",
            title: "SSC CGL 2026 result",
            official_url: "https://ssc.gov.in/result",
            document_url: null,
            status: "announced",
          },
        ],
      },
    ],
    loading: false,
  }),
  useUpcomingRecruitmentCalendar: () => ({ rows: [], loading: false }),
}));

const mockJob: JobRecord = {
  id: "1",
  slug: "ssc-cgl-2026",
  title: "SSC CGL 2026",
  dept: "SSC",
  category: "ssc",
  state: "All India",
  vacancies: 100,
  qual: "Graduate",
  lastDate: "2026-08-01",
  status: "live",
} as JobRecord;

function renderPage(element: ReactElement, path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <I18nextProvider i18n={i18n}>{element}</I18nextProvider>
    </MemoryRouter>
  );
}

describe("page smoke tests", () => {
  afterEach(() => cleanup());

  it("LatestNotificationsPage renders title", async () => {
    const Page = (await import("@/pages/LatestNotificationsPage")).default;
    renderPage(<Page jobs={[mockJob]} loading={false} onJobClick={vi.fn()} />, "/jobs/latest-notifications");
    expect(screen.getByRole("heading", { level: 1, name: /latest/i })).toBeTruthy();
  }, 15_000);

  it("QualificationsIndexPage renders index title", async () => {
    const Page = (await import("@/pages/QualificationsIndexPage")).default;
    renderPage(<Page jobs={[mockJob]} />);
    expect(screen.getAllByRole("heading", { level: 1 }).length).toBeGreaterThan(0);
  });

  it("OrganizationsIndexPage renders index title", async () => {
    const Page = (await import("@/pages/OrganizationsIndexPage")).default;
    renderPage(<Page />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  it("ExploreHubPage renders explore title", async () => {
    const Page = (await import("@/pages/ExploreHubPage")).default;
    renderPage(<Page liveCount={100} orgCount={50} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  it("StatesIndexPage renders index title", async () => {
    const Page = (await import("@/pages/StatesIndexPage")).default;
    renderPage(<Page jobs={[mockJob]} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  it("FaqPage renders FAQ title", async () => {
    const Page = (await import("@/pages/FaqPage")).default;
    renderPage(<Page />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  it("ExamsIndexPage renders exams title", async () => {
    const Page = (await import("@/pages/ExamsIndexPage")).default;
    renderPage(<Page jobs={[mockJob]} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  it("ResultsTopicsIndexPage renders index title", async () => {
    const Page = (await import("@/pages/ResultsTopicsIndexPage")).default;
    renderPage(<Page />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  it("ResultsTopicPage renders unique syllabus hub content", async () => {
    const Page = (await import("@/pages/ResultsTopicPage")).default;
    renderPage(<Page />, "/results/syllabus");
    expect(screen.getByRole("heading", { level: 1, name: /syllabus/i })).toBeTruthy();
    expect(document.querySelector(".home-page-main")).toBeNull();
  });

  it("ResultsTopicPage 404s unknown topic slugs", async () => {
    const Page = (await import("@/pages/ResultsTopicPage")).default;
    renderPage(<Page />, "/results/not-a-real-topic");
    expect(screen.getByRole("heading", { level: 1, name: /not found/i })).toBeTruthy();
  });

  it("SarkariNaukriPage renders unique title and job list", async () => {
    const Page = (await import("@/pages/SarkariNaukriPage")).default;
    renderPage(<Page jobs={[mockJob]} />, "/sarkari-naukri");
    expect(screen.getByRole("heading", { level: 1, name: /sarkari naukri/i })).toBeTruthy();
    expect(screen.getByText(/official sarkari naukri/i)).toBeTruthy();
  });

  it("ResultsHubPage lists snapshot events", async () => {
    const Page = (await import("@/pages/ResultsHubPage")).default;
    renderPage(
      <Page eventType="result" pageTitle="Latest Government Job Results" />,
      "/latest-results",
    );
    expect(screen.getByRole("heading", { level: 1, name: /latest government job results/i })).toBeTruthy();
    expect(screen.getByText("SSC CGL 2026 result")).toBeTruthy();
    expect(screen.getByRole("table", { name: /latest government job results/i })).toBeTruthy();
  });

  it("ContactPage renders contact form", async () => {
    const Page = (await import("@/pages/ContactPage")).default;
    renderPage(<Page />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(document.querySelector(".contact-page__form")).toBeTruthy();
  });

  it("SitemapPage renders sitemap heading", async () => {
    const Page = (await import("@/pages/SitemapPage")).default;
    renderPage(<Page />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  it("StaticPage renders privacy content", async () => {
    const Page = (await import("@/pages/StaticPage")).default;
    const { PRIVACY_PAGE } = await import("@/pages/legalContent");
    renderPage(<Page {...PRIVACY_PAGE} />);
    expect(screen.getByRole("heading", { level: 1, name: /privacy/i })).toBeTruthy();
  });

  it("AccountPage shows not-configured message when auth disabled", async () => {
    const Page = (await import("@/pages/AccountPage")).default;
    renderPage(<Page />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  it("AdminDashboardPage shows unlock form", async () => {
    const Page = (await import("@/pages/AdminDashboardPage")).default;
    renderPage(<Page />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });
});
