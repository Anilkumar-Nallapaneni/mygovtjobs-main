import type { Subject } from "./studyContent";

export const degreeSubjects: Subject[] = [
  {
    id: "gate-cs-study",
    name: "GATE (engineering)",
    stream: ["afterDegree"],
    icon: "🔧",
    textbooks: [
      { title: "GATE 2027 official website (IIT Madras)", author: "GATE organising institute", essential: true },
      { title: "AICTE model undergraduate curriculum", author: "AICTE", essential: false },
    ],
    chapters: [
      { title: "Engineering mathematics", important: true, keyTopics: ["Linear algebra", "Calculus", "Probability", "Discrete maths for CS"] },
      { title: "Core branch subjects", important: true, keyTopics: ["Use your B.Tech syllabus as the GATE map", "Prioritise high-weight topics from the official GATE paper list"] },
      { title: "General Aptitude", important: true, keyTopics: ["Verbal ability", "Numerical ability", "Official GA syllabus PDF"] },
      { title: "Practice routine", important: true, keyTopics: ["Timed original drills on EduPath", "Official previous papers from the GATE download page only"] },
    ],
    notes: [
      { title: "GATE 8-week revision checklist", type: "pdf", free: true },
      { title: "How to use the official GATE paper download page", type: "notes", free: true },
    ],
  },
  {
    id: "cat-study",
    name: "CAT (MBA entrance)",
    stream: ["afterDegree"],
    icon: "📈",
    textbooks: [
      { title: "CAT official website (IIMs)", author: "CAT / IIMs", essential: true },
      { title: "NCERT Maths Class 11", author: "NCERT", essential: false },
      { title: "NCERT Maths Class 12", author: "NCERT", essential: false },
    ],
    chapters: [
      { title: "Quantitative Ability", important: true, keyTopics: ["Arithmetic", "Algebra", "Geometry", "Number properties"] },
      { title: "VARC", important: true, keyTopics: ["Reading practice from quality non-fiction", "Para jumbles as logic, not guesswork"] },
      { title: "DILR", important: true, keyTopics: ["Sets", "Tables", "Games and tournaments", "Time boxing"] },
      { title: "Test temperament", important: true, keyTopics: ["Sectional time", "Skip rules", "Error log"] },
    ],
    notes: [
      { title: "CAT weekly study grid", type: "pdf", free: true },
    ],
  },
  {
    id: "upsc-cse-study",
    name: "UPSC CSE",
    stream: ["afterDegree"],
    icon: "🏛️",
    textbooks: [
      { title: "UPSC official examinations page", author: "UPSC", essential: true },
      { title: "NCERT Indian Constitution at Work", author: "NCERT", essential: true },
      { title: "NCERT Indian Economic Development", author: "NCERT", essential: true },
      { title: "NCERT Themes in Indian History Part I", author: "NCERT", essential: false },
    ],
    chapters: [
      { title: "Prelims GS map", important: true, keyTopics: ["Polity", "Economy", "History", "Geography", "Environment", "Science basics"] },
      { title: "CSAT", important: true, keyTopics: ["Comprehension", "Basic numeracy", "Logical reasoning"] },
      { title: "Mains writing", important: true, keyTopics: ["Introduction-body-conclusion", "Article and report citations", "Time per question"] },
      { title: "Official papers", important: true, keyTopics: ["Download only from upsc.gov.in previous-question-papers"] },
    ],
    notes: [
      { title: "UPSC weekly current-affairs method", type: "pdf", free: true },
    ],
  },
  {
    id: "neet-pg-study",
    name: "NEET PG",
    stream: ["afterDegree"],
    icon: "🏥",
    textbooks: [
      { title: "NBEMS / NEET PG official portal", author: "NBEMS", essential: true },
      { title: "NMC UG curriculum page", author: "NMC", essential: false },
    ],
    chapters: [
      { title: "Clinical recall", important: true, keyTopics: ["Medicine", "Surgery", "OBG", "Paediatrics", "as in your MBBS professional exams"] },
      { title: "Pre-clinical refresh", important: true, keyTopics: ["Anatomy", "Physiology", "Biochemistry high-yield tables you already used in MBBS"] },
      { title: "Official notices", important: true, keyTopics: ["Information bulletin on natboard.edu.in only", "Avoid unofficial memory-based PDFs"] },
    ],
    notes: [
      { title: "NEET PG revision hygiene", type: "pdf", free: true },
    ],
  },
];

export const pgSubjects: Subject[] = [
  {
    id: "ugc-net-study",
    name: "UGC NET / college teaching",
    stream: ["afterPG"],
    icon: "📚",
    textbooks: [
      { title: "UGC NET official NTA page", author: "NTA", essential: true },
      { title: "UGC regulations hub", author: "UGC", essential: true },
    ],
    chapters: [
      { title: "Paper I teaching aptitude", important: true, keyTopics: ["Learners", "Assessment", "ICT in education", "Research ethics"] },
      { title: "Paper II subject", important: true, keyTopics: ["Follow the current official subject syllabus PDF", "Map it onto your Master's papers"] },
      { title: "Assistant professor hiring", important: true, keyTopics: ["NET/SET eligibility", "API/research as the university advertises"] },
    ],
    notes: [
      { title: "NET Paper I weekly plan", type: "pdf", free: true },
    ],
  },
];
