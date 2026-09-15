import { describe, expect, it } from "vitest";

import {
  extractOfficialHelpdeskEmails,
  extractOfficialHelpdeskUrl,
} from "@/utils/officialContact";

describe("officialContact", () => {
  it("keeps official helpdesk emails and drops gmail", () => {
    const emails = extractOfficialHelpdeskEmails({
      email: "this@gmail.com",
      detail: {
        summary: "Write to helpdesk@ssc.gov.in or ssc-cr@nic.in. Ignore hr@yahoo.com.",
      },
    });
    expect(emails[0]).toBe("helpdesk@ssc.gov.in");
    expect(emails).toContain("ssc-cr@nic.in");
    expect(emails.some((e) => e.includes("gmail") || e.includes("yahoo"))).toBe(false);
  });

  it("uses stored helpdesk_emails from ingest", () => {
    expect(
      extractOfficialHelpdeskEmails({
        detail: { helpdesk_emails: ["helpdesk@ssc.gov.in"] },
      })
    ).toEqual(["helpdesk@ssc.gov.in"]);
  });

  it("finds IBPS CGRS grievance portal", () => {
    expect(
      extractOfficialHelpdeskUrl({
        detail: {
          summary: "In case of queries / complaints please log on to https://cgrs.ibps.in",
        },
      })
    ).toBe("https://cgrs.ibps.in");
  });
});
