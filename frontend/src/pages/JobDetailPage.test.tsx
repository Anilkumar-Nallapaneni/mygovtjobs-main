/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import i18n from "@/i18n";
import JobDetailPage from "@/pages/JobDetailPage";
import { fetchJobBySlug } from "@/lib/jobsApi";
import type { JobRecord } from "@/types/job";

vi.mock("@/lib/jobsApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/jobsApi")>();
  return {
    ...actual,
    fetchJobBySlug: vi.fn().mockResolvedValue(null),
  };
});

const mockJob: JobRecord = {
  id: "1",
  slug: "ssc-cgl-2026",
  title: "SSC CGL 2026 Recruitment Notification",
  dept: "SSC",
  category: "ssc",
  state: "All India",
  stateIds: [],
  vacancies: 500,
  qual: "Graduate",
  lastDate: "2026-08-01",
  apply_url: "https://ssc.gov.in/notification.pdf",
  status: "live",
} as JobRecord;

const otherJob: JobRecord = {
  ...mockJob,
  id: "2",
  slug: "upsc-capf-2026",
  title: "UPSC CAPF 2026 Assistant Commandant",
  dept: "UPSC",
  category: "defence",
} as JobRecord;

function renderPage(slug: string, jobs: JobRecord[] = [mockJob], loading = false) {
  return render(
    <MemoryRouter initialEntries={[`/jobs/${slug}`]}>
      <I18nextProvider i18n={i18n}>
        <Routes>
          <Route path="/jobs/:slug" element={<JobDetailPage jobs={jobs} loading={loading} />} />
        </Routes>
      </I18nextProvider>
    </MemoryRouter>
  );
}

function renderTwoJobRoutes(jobs: JobRecord[]) {
  return render(
    <MemoryRouter initialEntries={["/jobs/ssc-cgl-2026"]}>
      <I18nextProvider i18n={i18n}>
        <Routes>
          <Route
            path="/jobs/:slug"
            element={
              <>
                <Link to="/jobs/upsc-capf-2026">Go UPSC</Link>
                <JobDetailPage jobs={jobs} loading={false} />
              </>
            }
          />
        </Routes>
      </I18nextProvider>
    </MemoryRouter>
  );
}

vi.mock("@/components/jobs/JobDetail", () => ({
  default: ({ job, onClose }: { job: JobRecord; onClose: () => void }) => (
    <div data-testid="job-detail-mock">
      <h1>{job.title}</h1>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

describe("JobDetailPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders job from list by slug", async () => {
    renderPage("ssc-cgl-2026");
    expect(await screen.findByTestId("job-detail-mock")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/SSC CGL/);
  });

  it("shows not found when slug missing from list", async () => {
    renderPage("missing-job-slug", []);
    expect(await screen.findByText(/not found|no longer listed/i)).toBeTruthy();
  });

  it("does not show the previous job after navigating to another slug", async () => {
    const fetchMock = vi.mocked(fetchJobBySlug);
    fetchMock.mockImplementation(async (slug: string) => {
      if (slug === "ssc-cgl-2026") {
        return {
          id: "1",
          slug: "ssc-cgl-2026",
          title: "Fetched SSC detail (stale after navigation)",
          dept: "SSC",
          category: "ssc",
          status: "live",
        };
      }
      if (slug === "upsc-capf-2026") {
        return {
          id: "2",
          slug: "upsc-capf-2026",
          title: "UPSC CAPF 2026 Assistant Commandant",
          dept: "UPSC",
          category: "defence",
          status: "live",
        };
      }
      return null;
    });

    renderTwoJobRoutes([mockJob, otherJob]);

    expect(await screen.findByTestId("job-detail-mock")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Fetched SSC detail/);

    fireEvent.click(screen.getByRole("link", { name: /Go UPSC/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/UPSC CAPF/);
    });
    expect(screen.getByRole("heading", { level: 1 }).textContent).not.toMatch(/Fetched SSC/);
  });
});
