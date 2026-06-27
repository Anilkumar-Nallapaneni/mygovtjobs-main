/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import RelatedJobs from "@/components/jobs/RelatedJobs";
import type { JobRecord } from "@/types/job";

const jobs: JobRecord[] = [
  {
    id: "2",
    slug: "upsc-capf",
    title: "UPSC CAPF AC 2026",
    dept: "UPSC",
    category: "upsc",
    vacancies: 250,
    lastDate: "2026-07-01",
  } as JobRecord,
];

describe("RelatedJobs", () => {
  it("renders related job and calls onSelect", () => {
    const onSelect = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <RelatedJobs jobs={jobs} onSelect={onSelect} />
      </I18nextProvider>
    );

    expect(screen.getByText(/UPSC CAPF AC 2026/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /UPSC CAPF AC 2026/i }));
    expect(onSelect).toHaveBeenCalledWith(jobs[0]);
  });

  it("shows translated category label", () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <RelatedJobs jobs={jobs} onSelect={vi.fn()} />
      </I18nextProvider>
    );

    expect(container.querySelectorAll(".job-detail-related-cat").length).toBeGreaterThan(0);
    expect(container.textContent).toContain(i18n.t("category.upsc"));
  });
});
