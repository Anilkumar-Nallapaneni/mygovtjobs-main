export interface CollegeSubject {
  code: string;
  name: string;
  credits: number;
  type: "theory" | "lab" | "elective";
}

export interface CollegeSemester {
  semester: number;
  label?: string;
  subjects: CollegeSubject[];
}

export interface CollegeSyllabus {
  degree: string;
  stream: string;
  sourceName: string;
  sourceUrl: string;
  lastVerified: string;
  semesters: CollegeSemester[];
}

export interface InterSyllabus {
  stream: "mpc" | "bipc" | "mec" | "cec" | "hec";
  year: 11 | 12;
  sourceName: string;
  sourceUrl: string;
  lastVerified: string;
  subjects: { name: string; chapters: string[] }[];
}

export interface ExamGuide {
  id: string;
  name: string;
  fullName: string;
  icon: string;
  color: string;
  forStreams: string[];
  eligibility: string;
  frequency: string;
  pattern: string;
  totalMarks: number | string;
  duration: string;
  negativeMarking: string;
  syllabus: { section: string; topics: string[] }[];
  previousPapers: { year: number; sessions: string[]; officialUrl?: string }[];
  preparationTips: string[];
  importantDates: { event: string; date: string }[];
}
