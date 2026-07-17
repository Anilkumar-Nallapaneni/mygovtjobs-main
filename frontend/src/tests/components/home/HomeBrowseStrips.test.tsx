/** @vitest-environment happy-dom */
import { describe, expect, it, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/i18n";
import HomeBrowseStrips from "@/components/home/HomeBrowseStrips";
import type { JobRecord } from "@/types/job";

const mockJob: JobRecord = {
  id: "job-1",
  slug: "graduate-job-2026",
  title: "Graduate Recruitment 2026",
  dept: "SSC",
  category: "ssc",
  stateIds: ["all"],
  vacancies: 100,
  qual: "Graduate",
  lastDate: "2026-12-31",
  status: "live",
} as JobRecord;

function renderStrips() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <HomeBrowseStrips jobs={[mockJob]} />
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe("HomeBrowseStrips", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders education, profession, and org browse carousels", () => {
    const { container } = renderStrips();
    expect(container.querySelector(".home-browse-strips")).toBeTruthy();
    expect(container.querySelectorAll(".home-browse-strip--panel")).toHaveLength(3);
    expect(container.querySelector(".home-browse-strip__track--edu")).toBeTruthy();
    expect(container.querySelector(".home-browse-strip__track--prof")).toBeTruthy();
    expect(container.querySelector(".home-browse-strip__track--org")).toBeTruthy();

    const viewAllLinks = screen.getAllByRole("link", { name: /view all/i });
    expect(viewAllLinks[0]?.getAttribute("href")).toBe("/qualifications");
    expect(viewAllLinks[1]?.getAttribute("href")).toBe("/professions");
    expect(viewAllLinks[2]?.getAttribute("href")).toBe("/organizations");

    expect(screen.getByText(/Browse by Education/i)).toBeTruthy();
    expect(screen.getByText(/Browse by Profession/i)).toBeTruthy();
    expect(screen.getByText(/Browse by Recruitment Board/i)).toBeTruthy();
  });

  it("invokes browse navigation handlers on chip click", () => {
    const onQualificationSelect = vi.fn();
    const onProfessionSelect = vi.fn();
    const onOrgSelect = vi.fn();
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <HomeBrowseStrips
            jobs={[mockJob]}
            onQualificationSelect={onQualificationSelect}
            onProfessionSelect={onProfessionSelect}
            onOrgSelect={onOrgSelect}
          />
        </MemoryRouter>
      </I18nextProvider>
    );

    const graduate = container.querySelector('a[href="/qualification/graduate"]') as HTMLAnchorElement;
    graduate?.click();
    expect(onQualificationSelect).toHaveBeenCalledWith("graduate");

    const engineering = container.querySelector('a[href="/profession/engineering"]') as HTMLAnchorElement;
    engineering?.click();
    expect(onProfessionSelect).toHaveBeenCalledWith("engineering");
  });
});
