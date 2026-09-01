/** @vitest-environment happy-dom */
import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/i18n";
import ClosingDeadlinesStrip from "@/components/home/ClosingDeadlinesStrip";
import type { JobRecord } from "@/types/job";

const todayJob = {
  id: "today-1",
  slug: "iocl-closing-today",
  title: "IOCL Engineer Recruitment 2026",
  lastDate: "2026-09-01",
  status: "live",
} as JobRecord;

function renderStrip(today: JobRecord[] = [todayJob], week: JobRecord[] = []) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <ClosingDeadlinesStrip today={today} week={week} onJobClick={() => undefined} locale="en-IN" />
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe("ClosingDeadlinesStrip", () => {
  afterEach(() => cleanup());

  it("renders closing today rows and view-all links", () => {
    renderStrip();
    expect(screen.getByText(/IOCL Engineer Recruitment/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /IOCL Engineer Recruitment/i }).getAttribute("href")).toContain(
      "/jobs/iocl-closing-today"
    );
    const viewAll = screen.getAllByText(/View all/i);
    expect(viewAll[0].closest("a")?.getAttribute("href")).toContain("closing-today");
  });

  it("renders nothing when both lists are empty", () => {
    const { container } = renderStrip([], []);
    expect(container.querySelector(".closing-deadlines")).toBeNull();
  });
});
