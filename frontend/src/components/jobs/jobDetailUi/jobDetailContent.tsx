import { useTranslation } from "react-i18next";
import { translateSectionHeading } from "@/utils/jobDetailLabels";
import { sanitizeParagraphText } from "@/utils/jobDetailLinks";
import { Section } from "./jobDetailSection";
import { formatSummaryForDisplay, isDateTable, renderDataTable } from "./jobDetailFacts";

export function ContentSections({
  sections,
  skipDateTables = false,
  actionUrls,
}: {
  sections: Array<{
    heading?: string;
    paragraphs?: string[];
    tables?: Record<string, string>[][];
    lists?: string[][];
    links?: Array<{ label?: string; url?: string }>;
  }>;
  skipDateTables?: boolean;
  actionUrls: ReadonlySet<string>;
}) {
  const { t } = useTranslation();
  if (!sections?.length) return null;

  return sections.map((section, idx) => {
    const tables = (section.tables || []).filter((table) => {
      if (!skipDateTables || !isDateTable(table)) return true;
      return !/important\s*dates/i.test(section.heading || "");
    });

    const paragraphs = (section.paragraphs || [])
      .map((p) => formatSummaryForDisplay(sanitizeParagraphText(p, actionUrls)))
      .filter(Boolean);
    const lists = (section.lists || [])
      .map((list) =>
        list
          .map((item) => formatSummaryForDisplay(sanitizeParagraphText(item, actionUrls)))
          .filter(Boolean)
      )
      .filter((list) => list.length > 0);

    const hasContent = paragraphs.length || tables.length || lists.length;
    if (!hasContent && !section.heading) return null;

    const sectionTitle = translateSectionHeading(t, section.heading || "");

    return (
      <Section key={`${section.heading}-${idx}`} title={sectionTitle}>
        {paragraphs.map((paragraph, pIdx) => (
          <p key={pIdx} className="job-detail-summary">
            {paragraph}
          </p>
        ))}
        {tables.map((table, tIdx) => (
          <div key={tIdx}>{renderDataTable(table)}</div>
        ))}
        {lists.map((list, lIdx) => (
          <ul key={lIdx} className="job-detail-bullets">
            {list.map((item, iIdx) => (
              <li key={iIdx}>{item}</li>
            ))}
          </ul>
        ))}
      </Section>
    );
  });
}
