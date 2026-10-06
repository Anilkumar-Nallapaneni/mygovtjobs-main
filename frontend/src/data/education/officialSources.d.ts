export const LAST_VERIFIED: string;

export type OfficialPortal = {
  id: string;
  name: string;
  exams: string;
  url: string;
};

export const officialPortals: OfficialPortal[];
export const examOfficialUrls: Record<string, string>;
export const examPapersUrls: Record<string, string>;
export const ncertBookUrls: Record<string, string>;

export function getExamOfficialUrl(examName: string): string;
export function getExamPapersUrl(examName: string, paperOfficialUrl?: string): string;
export function getNcertBookUrl(title: string): string | undefined;
export function getOfficialStudyUrl(title: string): string | undefined;
export function displayHost(url: string): string;
