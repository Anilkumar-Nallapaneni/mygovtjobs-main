import { describe, expect, it } from "vitest";

import {
  buildUnifiedDetailActions,
  collectDetailLinksFromJob,
  dedupeDetailLinks,
  normalizeDetailUrl,
  resolveHtmlApplyHref,
  resolveJobApplyHref,
  sanitizeParagraphText,
  upgradeGenericApplyUrl,
} from "@/utils/jobDetailLinks";

describe("jobDetailLinks", () => {
  it("keeps government CDN PDFs and blocks aggregator hosts", () => {
    const url =
      "https://cdn.s3waas.gov.in/s328dd2c7955ce926456240b2ff0100bde/uploads/2026/03/17740041096394.pdf";
    expect(normalizeDetailUrl(url)).toBe(url);
    expect(normalizeDetailUrl("https://www.freejobalert.com/foo")).toBeNull();
  });

  it("collects apply_url, pdf_urls, and section links", () => {
    const job = {
      apply_url: "https://facapp.iitm.ac.in/apply",
      detail: {
        pdf_urls: ["https://facapp.iitm.ac.in/img/Advertisement_RA-2026.pdf"],
        content_sections: [
          {
            heading: "Important Links",
            links: [{ label: "Apply Online", url: "https://facapp.iitm.ac.in/apply" }],
          },
        ],
      },
    };

    const links = collectDetailLinksFromJob(job);
    expect(links.some((l) => l.url.includes("facapp.iitm.ac.in/apply"))).toBe(true);
    expect(links.some((l) => l.url.endsWith(".pdf"))).toBe(true);
    expect(links.length).toBe(2);
  });

  it("prefers portal over PDF for trusted apply href", () => {
    const job = {
      apply_url: "https://cdn.s3waas.gov.in/notice.pdf",
      detail: {
        content_sections: [
          {
            links: [{ url: "https://www.kawardha.gov.in/recruit", label: "Official Website" }],
          },
        ],
      },
    };
    expect(resolveJobApplyHref(job)).toBe("https://www.kawardha.gov.in/recruit");
  });

  it("resolves HTML apply from important links when apply_url is a PDF", () => {
    const job = {
      apply_url: "https://cdnbbsr.s3waas.gov.in/s3ec03f7cfdde9db36af8e0d9a6d123d5c/uploads/2026/05/2026052118.pdf",
      detail: {
        content_sections: [
          {
            heading: "How to Apply",
            links: [],
            lists: [
              [
                "Download the application form from the official website: https://jagatsinghpur.dcourts.gov.in.",
              ],
            ],
            paragraphs: [],
            tables: [],
          },
          {
            heading: "Important Links",
            links: [
              { url: "https://cdnbbsr.s3waas.gov.in/s3ec03f7cfdde9db36af8e0d9a6d123d5c/uploads/2026/05/2026052118.pdf", label: "Click here" },
              { url: "https://jagatsinghpur.dcourts.gov.in/", label: "Click here" },
            ],
            lists: [],
            paragraphs: [],
            tables: [],
          },
        ],
      },
    };
    expect(resolveHtmlApplyHref(job)).toMatch(/jagatsinghpur\.dcourts\.gov\.in/);
    expect(resolveJobApplyHref(job)).toContain("cdnbbsr.s3waas.gov.in");
  });

  it("labels ViewPdf.aspx links as notification PDFs", () => {
    const job = {
      apply_url: "https://upsssc.gov.in/ViewPdf.aspx?abc123",
      detail: {
        content_sections: [
          {
            heading: "Important Links",
            links: [{ label: "Click here", url: "https://upsssc.gov.in/ViewPdf.aspx?abc123" }],
          },
        ],
      },
    };
    const links = collectDetailLinksFromJob(job);
    expect(links.every((l) => l.label === "Download Notification PDF")).toBe(true);
  });

  it("prefers vacancy PDF over generic org homepage", () => {
    const job = {
      apply_url: "https://www.iith.ac.in",
      pdf_url: "https://www.iith.ac.in/assets/files/careers/staff/Adv_RAs_CSE-AI_May2026.pdf",
      detail: {
        notification_url: "https://www.iith.ac.in",
        pdf_urls: ["https://www.iith.ac.in/assets/files/careers/staff/Adv_RAs_CSE-AI_May2026.pdf"],
      },
    };
    expect(resolveJobApplyHref(job)).toBe(
      "https://www.iith.ac.in/assets/files/careers/staff/Adv_RAs_CSE-AI_May2026.pdf"
    );
  });

  it("uses apply portal from content sections over org homepage", () => {
    const job = {
      apply_url: "http://www.rrbcdg.gov.in/",
      detail: {
        content_sections: [
          {
            links: [{ label: "Official Link", url: "https://oirms-ir.gov.in/rrbdv" }],
          },
        ],
      },
    };
    expect(resolveJobApplyHref(job)).toBe("https://oirms-ir.gov.in/rrbdv");
  });

  it("prefers apply_urls from PDF enrich over notification PDF", () => {
    const job = {
      apply_url:
        "https://cdnbbsr.s3waas.gov.in/s3d51b416788b6ee70eb0c381c06efc9f1/uploads/2026/06/20260602123384032.pdf",
      detail: {
        apply_urls: ["https://recruitment.aiimsexams.ac.in/"],
        pdf_urls: [
          "https://cdnbbsr.s3waas.gov.in/s3d51b416788b6ee70eb0c381c06efc9f1/uploads/2026/06/20260602123384032.pdf",
        ],
      },
    };
    expect(resolveJobApplyHref(job)).toBe("https://recruitment.aiimsexams.ac.in/");
  });

  it("falls back to notification PDF when no HTML apply page exists", () => {
    const job = {
      apply_url:
        "https://cdnbbsr.s3waas.gov.in/s3d51b416788b6ee70eb0c381c06efc9f1/uploads/2026/06/20260602123384032.pdf",
      pdf_url:
        "https://cdnbbsr.s3waas.gov.in/s3d51b416788b6ee70eb0c381c06efc9f1/uploads/2026/06/20260602123384032.pdf",
      detail: {
        pdf_urls: [
          "https://cdnbbsr.s3waas.gov.in/s3d51b416788b6ee70eb0c381c06efc9f1/uploads/2026/06/20260602123384032.pdf",
        ],
      },
    };
    expect(resolveJobApplyHref(job)).toContain("20260602123384032.pdf");
  });

  it("dedupes links by normalized URL", () => {
    const out = dedupeDetailLinks([
      { label: "A", url: "https://ssc.nic.in/apply" },
      { label: "B", url: "https://ssc.nic.in/apply" },
    ]);
    expect(out).toHaveLength(1);
  });

  it("upgrades OSSC homepage to the online application portal", () => {
    expect(upgradeGenericApplyUrl("https://www.ossc.gov.in")).toBe(
      "https://www.ossc.gov.in/Public/OSSC/Default.aspx"
    );
  });

  it("upgrades district court homepage to recruitments listing", () => {
    expect(upgradeGenericApplyUrl("https://balangir.dcourts.gov.in")).toBe(
      "https://balangir.dcourts.gov.in/notice-category/recruitments/"
    );
  });

  it("resolves OSSC apply from homepage-only catalog rows", () => {
    const job = {
      apply_url: "https://www.ossc.gov.in",
      detail: {
        notification_url: "https://www.ossc.gov.in",
        content_sections: [
          {
            links: [{ label: "www.ossc.gov.in", url: "https://www.ossc.gov.in" }],
          },
        ],
      },
    };
    expect(resolveJobApplyHref(job)).toBe("https://www.ossc.gov.in/Public/OSSC/Default.aspx");
  });

  it("extracts bare www.ossc.gov.in from how-to-apply text", () => {
    const job = {
      detail: {
        howApply: ["Apply online only through www.ossc.gov.in before the last date."],
      },
    };
    const links = collectDetailLinksFromJob(job);
    expect(links.some((l) => l.url.includes("ossc.gov.in"))).toBe(true);
  });

  it("shows View Notification separately when only a PDF exists", () => {
    const pdf =
      "https://cdnbbsr.s3waas.gov.in/s3d51b416788b6ee70eb0c381c06efc9f1/uploads/2026/06/notice.pdf";
    const job = {
      apply_url: pdf,
      pdf_url: pdf,
      detail: {
        pdf_urls: [pdf],
        content_sections: [
          {
            heading: "Important Links",
            links: [{ url: pdf, label: "Download PDF" }],
          },
        ],
      },
    };
    const actions = buildUnifiedDetailActions(job);
    expect(actions[0]?.label).toBe("View Notification");
    expect(actions[0]?.url).toContain(".pdf");
    expect(actions.some((a) => a.label === "Apply Now")).toBe(false);
    expect(actions.some((a) => /Apply Now — View Notification/i.test(a.label))).toBe(false);
  });

  it("uses official website for Apply Now when apply_url is only a PDF", () => {
    const pdf =
      "https://cdnbbsr.s3waas.gov.in/s3ec03f7cfdde9db36af8e0d9a6d123d5c/uploads/2026/05/2026052118.pdf";
    const job = {
      apply_url: pdf,
      detail: {
        pdf_urls: [pdf],
        content_sections: [
          {
            heading: "Important Links",
            links: [
              { url: pdf, label: "Notification PDF" },
              { url: "https://jagatsinghpur.dcourts.gov.in/", label: "Official Website" },
            ],
          },
        ],
      },
    };
    const actions = buildUnifiedDetailActions(job);
    expect(actions[0]?.label).toBe("Apply Now");
    expect(actions[0]?.url).toContain("jagatsinghpur.dcourts.gov.in");
    expect(actions.some((a) => a.label === "View Notification")).toBe(true);
    expect(actions.find((a) => a.label === "View Notification")?.url).toContain(".pdf");
  });

  it("treats apprenticeshipindia.gov.in as a real apply portal", () => {
    const job = {
      title: "MPEZ ITI Trade Apprentice Recruitment 2026",
      apply_url: "https://www.apprenticeshipindia.gov.in/",
      detail: { notification_url: "https://www.apprenticeshipindia.gov.in/" },
    };
    expect(resolveHtmlApplyHref(job)).toBe("https://www.apprenticeshipindia.gov.in/");
    expect(buildUnifiedDetailActions(job)[0]?.label).toBe("Apply Now");
  });

  it("upgrades APEDA homepage to the recruitment listing for BEDF jobs", () => {
    expect(upgradeGenericApplyUrl("https://apeda.gov.in/")).toBe(
      "https://apeda.gov.in/recruitment-appointment"
    );
    const pdf =
      "https://apeda.gov.in/sites/default/files/recruitment_appointment/Consultant_bedf_0.pdf";
    const job = {
      title: "BEDF Consultant Recruitment 2026 - Apply Online",
      dept: "BEDF",
      post_name: "Consultant (Quality)",
      apply_url: "https://apeda.gov.in/",
      pdf_url: pdf,
      detail: {
        pdf_urls: [pdf],
        notification_url: "https://apeda.gov.in/",
        post_name: "Consultant (Quality)",
      },
    };
    expect(resolveHtmlApplyHref(job)).toBe("https://apeda.gov.in/recruitment-appointment");
    const actions = buildUnifiedDetailActions(job);
    expect(actions[0]?.label).toBe("Apply Now");
    expect(actions[0]?.url).toBe("https://apeda.gov.in/recruitment-appointment");
    expect(actions[1]?.label).toBe("View Notification");
    expect(actions[1]?.url).toContain(".pdf");
    expect(actions.some((a) => a.url === "https://apeda.gov.in/")).toBe(false);
  });

  it("shows separate Apply Now and View Notification when both exist", () => {
    const pdf =
      "https://cdnbbsr.s3waas.gov.in/s3d51b416788b6ee70eb0c381c06efc9f1/uploads/2026/06/notice.pdf";
    const apply = "https://recruitment.aiimsexams.ac.in/";
    const job = {
      apply_url: pdf,
      detail: {
        apply_urls: [apply],
        pdf_urls: [pdf],
      },
    };
    const actions = buildUnifiedDetailActions(job);
    expect(resolveHtmlApplyHref(job)).toBe(apply);
    expect(actions[0]?.label).toBe("Apply Now");
    expect(actions.some((a) => a.label === "View Notification")).toBe(true);
  });

  it("does not duplicate official website when same as apply portal", () => {
    const apply = "https://recruitment.aiimsexams.ac.in/";
    const job = {
      apply_url: apply,
      detail: {
        apply_urls: [apply],
        notification_url: apply,
        content_sections: [{ links: [{ url: apply, label: "Official Website" }] }],
      },
    };
    const actions = buildUnifiedDetailActions(job);
    expect(actions).toHaveLength(1);
    expect(actions[0]?.label).toBe("Apply Now");
  });

  it("builds unified actions with apply first then pdfs", () => {
    const job = {
      apply_url: "https://forms.gle/apply123",
      pdf_url: "https://www.iitdh.ac.in/notice.pdf",
      detail: {
        content_sections: [
          {
            links: [
              { url: "https://forms.gle/apply123", label: "Official Link" },
              { url: "https://www.iitdh.ac.in/notice.pdf", label: "Download Official Notification PDF" },
            ],
          },
        ],
      },
    };
    const actions = buildUnifiedDetailActions(job);
    expect(actions[0]?.variant).toBe("primary");
    expect(actions[0]?.label).toBe("Apply Now");
    expect(actions[0]?.url).toContain("forms.gle");
    expect(actions.some((a) => a.label === "View Notification")).toBe(true);
    expect(actions.find((a) => a.label === "View Notification")?.url).toContain(".pdf");
  });

  it("shows Apply Now from curated portal when job only has an org PDF", () => {
    const pdf =
      "https://www.npcil.nic.in/writereaddata/Orders/202601011132535578347News_01012026_02.pdf";
    const job = {
      apply_url: pdf,
      detail: {
        pdf_url: pdf,
        pdf_urls: [pdf],
        summary: "NPCIL recruitment notification summary for executive trainees.",
      },
    };
    expect(resolveHtmlApplyHref(job)).toMatch(/npcil\.nic\.in/i);
    expect(resolveHtmlApplyHref(job)).not.toMatch(/\.pdf/i);
    const actions = buildUnifiedDetailActions(job);
    expect(actions[0]?.label).toBe("Apply Now");
    expect(actions.some((a) => a.label === "View Notification")).toBe(true);
    expect(actions.find((a) => a.label === "View Notification")?.url).toContain(".pdf");
  });

  it("strips embedded URLs from paragraph text", () => {
    const urls = new Set(["https://forms.gle/abc"]);
    const out = sanitizeParagraphText("Apply here: https://forms.gle/abc before deadline.", urls);
    expect(out).not.toContain("https://");
    expect(out).toMatch(/before deadline/i);
  });

  it("preserves URLs that are not duplicate action-bar links", () => {
    const urls = new Set(["https://forms.gle/abc"]);
    const out = sanitizeParagraphText(
      "Official notice: https://ssc.gov.in/notification.pdf and apply: https://forms.gle/abc",
      urls
    );
    expect(out).toContain("ssc.gov.in");
    expect(out).not.toContain("forms.gle");
  });
});
