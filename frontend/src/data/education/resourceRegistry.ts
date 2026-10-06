export type ResourceKind = "official" | "edupath-generated" | "external" | "catalogue-only";

export interface ResourceRecord {
  title: string;
  kind: ResourceKind;
  verified: boolean;
  sourceUrl?: string;
  sourceName?: string;
  lastVerified?: string;
  notes: string;
}

/**
 * Resource policy for EduPath.
 *
 * Official/copyrighted material is opened at its authoritative source.
 * EduPath-generated material is created by our own PDF service and is clearly
 * labelled as original content. Catalogue-only items are recommendations and
 * must never be presented as downloadable copies.
 */
export const resourcePolicy = {
  officialLabel: "Official source",
  generatedLabel: "EduPath original",
  catalogueLabel: "Recommended book",
  warning: "EduPath does not redistribute copyrighted textbooks or official exam papers. Official material opens at the authority/publisher source.",
};

export function getResourceRecord(title: string, officialUrl?: string): ResourceRecord {
  if (officialUrl) {
    return {
      title,
      kind: "official",
      verified: true,
      sourceUrl: officialUrl,
      notes: "Open the authoritative source; EduPath does not host a copied PDF.",
    };
  }

  return {
    title,
    kind: "catalogue-only",
    verified: false,
    notes: "Recommendation only. No downloadable copy is represented as an official resource.",
  };
}
