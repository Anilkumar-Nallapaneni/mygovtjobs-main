/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import JobCard from "@/components/jobs/JobCard";

function renderCard(
  job: Record<string, unknown>,
  props: Partial<Parameters<typeof JobCard>[0]> = {}
) {
  return render(
    <I18nextProvider i18n={i18n}>
      <JobCard job={job as never} {...props} />
    </I18nextProvider>
  );
}

afterEach(() => cleanup());

describe("JobCard dates", () => {
  it("shows only last date, not posted date", () => {
    renderCard({
      id: "1",
      slug: "test-job",
      title: "SSC CGL 2026",
      dept: "SSC",
      category: "ssc",
      status: "live",
      publishedDate: "2026-06-01",
      lastDate: "2026-08-15",
      vacancies: 100,
      state: "All India",
      qual: "Graduate",
    });

    expect(screen.queryByText(/^Posted$/i)).toBeNull();
    // Only once — highlight box, not also in the footer.
    expect(screen.getAllByText(/Last Date to apply/i)).toHaveLength(1);
    expect(screen.getAllByText(/Aug 15, 2026|15 Aug 2026/).length).toBeGreaterThan(0);
  });

  it("shows last date when published date also exists", () => {
    renderCard({
      id: "2",
      slug: "dup-dates-job",
      title: "VNSGU Associate Professor Recruitment 2026",
      dept: "VNSGU",
      category: "state",
      status: "live",
      publishedDate: "2026-06-01",
      lastDate: "2026-06-21",
      vacancies: 5,
      state: "Gujarat",
      qual: "PhD",
    });

    expect(screen.queryByText(/^Posted$/i)).toBeNull();
    expect(screen.getAllByText(/Last Date to apply/i)).toHaveLength(1);
    expect(screen.getAllByText(/Jun 21, 2026|21 Jun/).length).toBeGreaterThan(0);
  });
});

describe("JobCard accessibility", () => {
  it("uses a stretch button instead of role=button on article", () => {
    const onClick = vi.fn();
    const { container } = renderCard(
      {
        id: "1",
        slug: "test-job",
        title: "UPSC CAPF 2026",
        dept: "UPSC",
        category: "upsc",
        status: "live",
      },
      { onClick }
    );

    const article = container.querySelector("article.job-card");
    expect(article?.getAttribute("role")).toBeNull();
    expect(screen.getByRole("button", { name: /View Details/i })).toBeTruthy();
  });

  it("opens detail via stretch button without nested interactive conflict", () => {
    const onClick = vi.fn();
    const { container } = renderCard(
      {
        id: "1",
        slug: "test-job",
        title: "Railway Group D",
        dept: "RRB",
        category: "railway",
        status: "live",
        pdfUrl: "https://rrb.gov.in/notification.pdf",
      },
      { onClick }
    );

    fireEvent.click(container.querySelector(".job-card__action") as HTMLButtonElement);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows View → inside the last-date box and no PDF link", () => {
    const { container } = renderCard({
      id: "1",
      slug: "test-job",
      title: "Railway Group D",
      dept: "RRB",
      category: "railway",
      status: "live",
      lastDate: "2026-08-15",
      pdfUrl: "https://rrb.gov.in/notification.pdf",
    });

    expect(container.querySelector(".job-card__pdf")).toBeNull();
    const cta = container.querySelector(".job-card__stats .job-card__cta");
    expect(cta).toBeTruthy();
    expect(cta?.textContent).toMatch(/View/i);
    expect(cta?.textContent).toMatch(/→/);
  });
});
