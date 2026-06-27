import { describe, expect, it } from "vitest";

import { resolveJobDept } from "@/utils/resolveJobDept";
import type { JobRecord } from "@/types/job";

describe("resolveJobDept", () => {
  it("uses official site name when dept is a raw hostname", () => {
    const job: JobRecord = {
      dept: "www.upsc.gov.in",
      detail: { source: "upsc" },
    };
    expect(resolveJobDept(job).label).toContain("Union Public Service Commission");
  });

  it("prefers structured recruitment board from overview table", () => {
    const job = {
      dept: "Official notification",
      detail: {
        source: "psc-mh",
        content_sections: [
          {
            heading: "Overview",
            tables: [[{ label: "Recruitment Board", value: "Maharashtra Public Service Commission" }]],
          },
        ],
      },
    } as JobRecord;
    expect(resolveJobDept(job).label).toBe("Maharashtra Public Service Commission");
  });

  it("returns portal URL from official sites catalog", () => {
    const job: JobRecord = { detail: { source: "ssc" } };
    const resolved = resolveJobDept(job);
    expect(resolved.portalUrl).toMatch(/ssc\.gov\.in/i);
  });
});
