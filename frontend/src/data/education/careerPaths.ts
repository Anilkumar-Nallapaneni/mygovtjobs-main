// ────────────────────────────────────────────
//  Full Career Journey: 10th → +2 → Degree → PG → Jobs
// ────────────────────────────────────────────

import { afterDegreeFamilies, afterTenthFamilies, afterTwelfthFamilies } from "./careerPathFamilies";
import { extraMockTests } from "./originalMocks";

export interface CareerStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  eligibility: string;
  icon: string;
  color: string;
  bgColor: string;
  avgSalary?: string;
  topRecruiters?: string[];
}

export interface CareerPath {
  id: string;
  name: string;
  stage: "after10th" | "after12th" | "afterDegree" | "afterPG";
  icon: string;
  description: string;
  duration: string;
  eligibility: string;
  difficulty: "Easy" | "Moderate" | "Hard" | "Very Hard";
  avgStartingSalary: string;
  salarySource?: string;
  salarySourceUrl?: string;
  scope: "High" | "Medium" | "Low";
  color: string;
  bgColor: string;
  borderColor: string;
  steps: CareerStep[];
  exams: string[];
  topColleges: string[];
  keySkills: string[];
  jobRoles: string[];
  nextSteps: string[];
}

// ── After 10th ──

export const afterTenthPaths: CareerPath[] = [
  {
    id: "inter-mpc",
    name: "Intermediate MPC",
    stage: "after10th",
    icon: "📐",
    description: "Maths, Physics, Chemistry — gateway to engineering, B.Sc, and competitive exams.",
    duration: "2 years",
    eligibility: "10th pass",
    difficulty: "Moderate",
    avgStartingSalary: "₹3-8 LPA (after degree)",
    scope: "High",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-100",
    steps: [
      { id: "class11", title: "Class 11", subtitle: "Build foundation", description: "Master fundamentals in Physics, Chemistry, Mathematics. Start JEE/NEET foundation.", duration: "1 year", eligibility: "10th pass", icon: "📖", color: "text-indigo-600", bgColor: "bg-indigo-50" },
      { id: "class12", title: "Class 12", subtitle: "Board + Entrance prep", description: "Complete syllabus, board exams, and intensive entrance exam preparation.", duration: "1 year", eligibility: "Class 11 pass", icon: "📝", color: "text-indigo-600", bgColor: "bg-indigo-50" },
      { id: "entrance", title: "Entrance Exams", subtitle: "JEE / EAMCET / BITSAT", description: "Appear for engineering entrance exams to secure college admission.", duration: "3-6 months", eligibility: "12th pass/appeared", icon: "🎯", color: "text-indigo-600", bgColor: "bg-indigo-50" },
    ],
    exams: ["JEE Main", "JEE Advanced", "BITSAT", "TS EAMCET", "AP EAPCET", "NDA", "CUET"],
    topColleges: ["IITs", "NITs", "BITS Pilani", "IIIT Hyderabad", "VIT", "SRM", "JNTU", "Osmania"],
    keySkills: ["Mathematical Thinking", "Problem Solving", "Analytical Skills", "Physics Concepts"],
    jobRoles: ["Engineer", "Scientist", "Data Analyst", "Software Developer", "Defence Officer"],
    nextSteps: ["B.Tech", "B.Sc", "BCA", "Integrated M.Sc", "NDA"],
  },
  {
    id: "inter-bipc",
    name: "Intermediate BiPC",
    stage: "after10th",
    icon: "🧬",
    description: "Biology, Physics, Chemistry — pathway to medicine, pharmacy, and life sciences.",
    duration: "2 years",
    eligibility: "10th pass",
    difficulty: "Hard",
    avgStartingSalary: "₹4-12 LPA (after degree)",
    scope: "High",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-100",
    steps: [
      { id: "class11", title: "Class 11", subtitle: "Build biology foundation", description: "Master Botany, Zoology, Physics, Chemistry fundamentals.", duration: "1 year", eligibility: "10th pass", icon: "📖", color: "text-emerald-600", bgColor: "bg-emerald-50" },
      { id: "class12", title: "Class 12", subtitle: "Board + NEET prep", description: "Complete syllabus and intensive NEET preparation.", duration: "1 year", eligibility: "Class 11 pass", icon: "📝", color: "text-emerald-600", bgColor: "bg-emerald-50" },
      { id: "neet", title: "NEET Exam", subtitle: "Medical entrance", description: "Appear for NEET to secure MBBS/BDS/B.Pharm admission.", duration: "3-6 months", eligibility: "12th pass with PCB", icon: "🎯", color: "text-emerald-600", bgColor: "bg-emerald-50" },
    ],
    exams: ["NEET", "AIIMS", "JIPMER", "TS EAMCET (Medical)", "GPAT"],
    topColleges: ["AIIMS", "JIPMER", "CMC Vellore", "MAMC", "JSS Medical", "Kasturba Medical"],
    keySkills: ["Biology", "Chemistry", "Memorization", "Scientific Temper", "Patient Care"],
    jobRoles: ["Doctor", "Dentist", "Pharmacist", "Nurse", "Lab Technician", "Biotechnologist"],
    nextSteps: ["MBBS", "BDS", "B.Pharm", "B.Sc Nursing", "B.Sc Biology", "BAMS", "BHMS"],
  },
  {
    id: "inter-mec",
    name: "Intermediate MEC",
    stage: "after10th",
    icon: "📊",
    description: "Maths, Economics, Commerce — foundation for business, finance, and management careers.",
    duration: "2 years",
    eligibility: "10th pass",
    difficulty: "Moderate",
    avgStartingSalary: "₹3-6 LPA (after degree)",
    scope: "Medium",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-100",
    steps: [
      { id: "class11", title: "Class 11", subtitle: "Commerce fundamentals", description: "Learn Accountancy, Business Studies, Economics basics.", duration: "1 year", eligibility: "10th pass", icon: "📖", color: "text-amber-600", bgColor: "bg-amber-50" },
      { id: "class12", title: "Class 12", subtitle: "Board exams + CA/CS prep", description: "Complete board exams and prepare for CA Foundation.", duration: "1 year", eligibility: "Class 11 pass", icon: "📝", color: "text-amber-600", bgColor: "bg-amber-50" },
    ],
    exams: ["CA Foundation", "CS Foundation", "IPMAT", "CUET", "CMA Foundation"],
    topColleges: ["SRCC Delhi", "Lady Shri Ram", "Christ University", "Symbiosis", "Narsee Monjee"],
    keySkills: ["Accounting", "Financial Analysis", "Business Communication", "Economics"],
    jobRoles: ["Chartered Accountant", "Company Secretary", "Banker", "Financial Analyst", "MBA"],
    nextSteps: ["B.Com", "BBA", "CA", "CS", "CMA", "BMS"],
  },
  {
    id: "inter-cec",
    name: "Intermediate CEC",
    stage: "after10th",
    icon: "⚖️",
    description: "Civics, Economics, Commerce — humanities-plus-commerce path toward BA, law, and civil-services prep.",
    duration: "2 years",
    eligibility: "10th pass",
    difficulty: "Moderate",
    avgStartingSalary: "₹3-7 LPA (after degree)",
    salarySource: "First pay depends on the degree you take next (BA, B.Com, BA LLB). There is no separate NIRF median for Intermediate CEC.",
    salarySourceUrl: "https://www.nirfindia.org/",
    scope: "Medium",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-100",
    steps: [
      { id: "class11", title: "Class 11", subtitle: "Civics, economics, commerce", description: "Political Science/Civics, Economics, and Commerce/Accountancy as taught by TGBIE/BIEAP.", duration: "1 year", eligibility: "10th pass", icon: "📖", color: "text-purple-600", bgColor: "bg-purple-50" },
      { id: "class12", title: "Class 12", subtitle: "Boards + CUET/CLAT foundation", description: "Finish Inter papers and start CUET domain tests or CLAT reading if you want law.", duration: "1 year", eligibility: "Class 11 pass", icon: "📝", color: "text-purple-600", bgColor: "bg-purple-50" },
    ],
    exams: ["CUET", "CLAT", "AILET", "IPMAT"],
    topColleges: ["NLUs (after CLAT)", "University of Delhi", "Osmania University", "Arts and law colleges via CUET"],
    keySkills: ["Political Science", "Economics", "Commerce", "Writing", "Current Affairs"],
    jobRoles: ["Lawyer", "Civil Services aspirant", "Journalist", "Policy researcher", "Banker (after B.Com/BA)"],
    nextSteps: ["BA", "B.Com", "BA LLB", "BBA", "UPSC after graduation"],
  },
  {
    id: "iti",
    name: "ITI (Craftsmen Training)",
    stage: "after10th",
    icon: "🛠️",
    description: "National Trade Certificate through DGT's Craftsmen Training Scheme — electrician, fitter, COPA, mechanic, and other NSQF trades.",
    duration: "6 months to 2 years (trade-wise)",
    eligibility: "10th pass (some trades accept 8th; check the trade syllabus)",
    difficulty: "Easy",
    avgStartingSalary: "₹1.5-4 LPA typical first job",
    salarySource: "DGT Craftsmen Training Scheme. First wages vary by trade and state. Many graduates continue as apprentices under the Apprentices Act before a regular job.",
    salarySourceUrl: "https://www.dgt.gov.in/en/CTS",
    scope: "Medium",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-100",
    steps: [
      { id: "trade", title: "ITI trade training", subtitle: "CTS / NTC", description: "Classroom plus workshop in an affiliated ITI. Duration is 6 months to 2 years depending on the NSQF trade.", duration: "6 months-2 years", eligibility: "As per trade", icon: "🔧", color: "text-orange-600", bgColor: "bg-orange-50" },
      { id: "aitt", title: "AITT / NTC", subtitle: "National Trade Certificate", description: "All India Trade Test under NCVT/DGT. Successful trainees receive the National Trade Certificate.", duration: "Exam cycle", eligibility: "Training complete", icon: "📜", color: "text-orange-600", bgColor: "bg-orange-50" },
      { id: "apprentice", title: "Apprenticeship", subtitle: "Optional NAC", description: "On-the-job apprenticeship; National Apprenticeship Certificate after the ATS exam where applicable.", duration: "1-2 years", eligibility: "NTC or as notified", icon: "🏭", color: "text-orange-600", bgColor: "bg-orange-50" },
    ],
    exams: ["State ITI admission / counselling", "AITT (NCVT)", "Apprenticeship ATS"],
    topColleges: ["Government ITIs", "DGT-affiliated private ITIs listed on NCVTMIS"],
    keySkills: ["Trade workshop practice", "Safety", "Tools and measurements", "Employability skills"],
    jobRoles: ["Electrician", "Fitter", "Mechanic", "COPA / IT support", "Welder", "Technician"],
    nextSteps: ["Industry job", "Apprenticeship", "Diploma (where lateral entry exists)", "CITS (instructor)", "State technician posts"],
  },
  {
    id: "inter-diploma",
    name: "Diploma (Polytechnic)",
    stage: "after10th",
    icon: "🔧",
    description: "Hands-on technical training — direct entry into B.Tech 2nd year after completion.",
    duration: "3 years",
    eligibility: "10th pass",
    difficulty: "Easy",
    avgStartingSalary: "₹2-5 LPA",
    salarySource: "Polytechnic first jobs vary by state and branch. Lateral-entry B.Tech then follows engineering campus medians, not the diploma stipend.",
    salarySourceUrl: "https://www.aicte-india.org/",
    scope: "Medium",
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-100",
    steps: [
      { id: "d1", title: "Year 1", subtitle: "Basic engineering", description: "Engineering basics, workshop practice, communication skills.", duration: "1 year", eligibility: "10th pass", icon: "📖", color: "text-teal-600", bgColor: "bg-teal-50" },
      { id: "d2", title: "Year 2", subtitle: "Specialization begins", description: "Core subjects of your chosen branch.", duration: "1 year", eligibility: "Year 1 pass", icon: "🔧", color: "text-teal-600", bgColor: "bg-teal-50" },
      { id: "d3", title: "Year 3", subtitle: "Advanced + Internship", description: "Advanced topics and industrial training.", duration: "1 year", eligibility: "Year 2 pass", icon: "🏭", color: "text-teal-600", bgColor: "bg-teal-50" },
    ],
    exams: ["Polytechnic Entrance (State level)", "Lateral Entry to B.Tech"],
    topColleges: ["Government Polytechnics", "JNTU affiliated colleges", "Private Polytechnics"],
    keySkills: ["Practical Engineering", "Workshop Skills", "Technical Drawing", "Computer Applications"],
    jobRoles: ["Junior Engineer", "Technician", "Supervisor", "B.Tech (Lateral Entry)"],
    nextSteps: ["B.Tech (Lateral Entry - 2nd year)", "Government Jobs (JE)", "Industry Jobs"],
  },
  ...afterTenthFamilies,
];

// ── After +2 (Intermediate) ──

export const afterTwelfthPaths: CareerPath[] = [
  {
    id: "btech-cse",
    name: "B.Tech CSE",
    stage: "after12th",
    icon: "💻",
    description: "Bachelor of Technology in Computer Science — top-paying engineering branch with massive demand.",
    duration: "4 years",
    eligibility: "12th PCM + JEE/EAMCET/BITSAT",
    difficulty: "Hard",
    avgStartingSalary: "₹6-18 LPA campus band",
    salarySource: "NIRF 2025 Engineering publishes UG 4-year median salary by institute. Top IIT medians are often in the mid-to-high teens of LPA; most colleges are far lower. The chip is a broad campus band, not a guarantee.",
    salarySourceUrl: "https://www.nirfindia.org/Rankings/2025/EngineeringRanking.html",
    scope: "High",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-100",
    steps: [
      { id: "y1", title: "Year 1", subtitle: "Foundation", description: "Maths, Physics, Chemistry, Programming basics, Engineering graphics.", duration: "1 year", eligibility: "12th + Entrance", icon: "📖", color: "text-blue-600", bgColor: "bg-blue-50" },
      { id: "y2", title: "Year 2", subtitle: "Core CS", description: "Data Structures, Algorithms, OOP, Digital Logic, Computer Organization.", duration: "1 year", eligibility: "Year 1 pass", icon: "💻", color: "text-blue-600", bgColor: "bg-blue-50" },
      { id: "y3", title: "Year 3", subtitle: "Advanced + Specialization", description: "Operating Systems, DBMS, Computer Networks, Machine Learning, Electives.", duration: "1 year", eligibility: "Year 2 pass", icon: "🧠", color: "text-blue-600", bgColor: "bg-blue-50" },
      { id: "y4", title: "Year 4", subtitle: "Projects + Placement", description: "Major project, internships, campus placements.", duration: "1 year", eligibility: "Year 3 pass", icon: "🎓", color: "text-blue-600", bgColor: "bg-blue-50" },
    ],
    exams: ["GATE", "Campus Placements", "AMCAT", "CoCubes"],
    topColleges: ["IIT Bombay", "IIT Delhi", "IIT Madras", "NIT Trichy", "BITS Pilani", "IIIT Hyderabad", "VIT", "SRM"],
    keySkills: ["Programming (Python, Java, C++)", "Data Structures", "Algorithms", "Web Development", "Machine Learning"],
    jobRoles: ["Software Engineer", "Data Scientist", "Full Stack Developer", "ML Engineer", "Product Manager", "DevOps Engineer"],
    nextSteps: ["M.Tech CSE", "MS (Abroad)", "MBA", "MS Data Science", "PhD"],
  },
  {
    id: "btech-ece",
    name: "B.Tech ECE",
    stage: "after12th",
    icon: "📡",
    description: "Electronics & Communication Engineering — hardware, VLSI, telecom, and embedded systems.",
    duration: "4 years",
    eligibility: "12th PCM + JEE/EAMCET/BITSAT",
    difficulty: "Hard",
    avgStartingSalary: "₹4-12 LPA campus band",
    salarySource: "NIRF 2025 Engineering UG 4-year medians. ECE campus numbers are usually below CSE at the same college.",
    salarySourceUrl: "https://www.nirfindia.org/Rankings/2025/EngineeringRanking.html",
    scope: "High",
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-100",
    steps: [
      { id: "y1", title: "Year 1", subtitle: "Foundation", description: "Maths, Physics, Chemistry, Basic Electronics, Programming.", duration: "1 year", eligibility: "12th + Entrance", icon: "📖", color: "text-violet-600", bgColor: "bg-violet-50" },
      { id: "y2", title: "Year 2", subtitle: "Core Electronics", description: "Network Analysis, Signals & Systems, Analog Electronics, Digital Electronics.", duration: "1 year", eligibility: "Year 1 pass", icon: "📡", color: "text-violet-600", bgColor: "bg-violet-50" },
      { id: "y3", title: "Year 3", subtitle: "Communication + VLSI", description: "Communication Systems, VLSI Design, DSP, Control Systems.", duration: "1 year", eligibility: "Year 2 pass", icon: "🔧", color: "text-violet-600", bgColor: "bg-violet-50" },
      { id: "y4", title: "Year 4", subtitle: "Projects + Placement", description: "Major project, internships, campus placements.", duration: "1 year", eligibility: "Year 3 pass", icon: "🎓", color: "text-violet-600", bgColor: "bg-violet-50" },
    ],
    exams: ["GATE", "Campus Placements", "ISRO Scientist", "DRDO"],
    topColleges: ["IIT Bombay", "IIT Madras", "NIT Warangal", "BITS Pilani", "JNTU Hyderabad"],
    keySkills: ["VLSI Design", "Embedded Systems", "Signal Processing", "Communication Systems", "Python/C"],
    jobRoles: ["Hardware Engineer", "VLSI Design Engineer", "Telecom Engineer", "ISRO Scientist", "Embedded Systems Engineer"],
    nextSteps: ["M.Tech ECE", "MS VLSI", "MBA", "PhD", "PSU (GATE)"],
  },
  {
    id: "mbbs",
    name: "MBBS",
    stage: "after12th",
    icon: "🩺",
    description: "Bachelor of Medicine and Surgery — become a doctor. 5.5 years including internship.",
    duration: "5.5 years",
    eligibility: "12th PCB + NEET",
    difficulty: "Very Hard",
    avgStartingSalary: "₹5-12 LPA",
    scope: "High",
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-100",
    steps: [
      { id: "y1", title: "Year 1-2", subtitle: "Pre-Clinical", description: "Anatomy, Physiology, Biochemistry — building blocks of medicine.", duration: "1 year", eligibility: "NEET Qualified", icon: "📖", color: "text-rose-600", bgColor: "bg-rose-50" },
      { id: "y2", title: "Year 2-3", subtitle: "Para-Clinical", description: "Pathology, Pharmacology, Microbiology, Forensic Medicine.", duration: "1 year", eligibility: "Year 1 pass", icon: "🔬", color: "text-rose-600", bgColor: "bg-rose-50" },
      { id: "y3", title: "Year 3-4", subtitle: "Clinical", description: "Medicine, Surgery, OB/GYN, Pediatrics, Ophthalmology, ENT.", duration: "1.5 years", eligibility: "Year 2 pass", icon: "🏥", color: "text-rose-600", bgColor: "bg-rose-50" },
      { id: "y4", title: "Internship", subtitle: "1 year rotating", description: "Hands-on clinical experience across departments.", duration: "1 year", eligibility: "Year 3 pass", icon: "👨‍⚕️", color: "text-rose-600", bgColor: "bg-rose-50" },
    ],
    exams: ["NEET PG", "INICET", "FMGE (for foreign graduates)"],
    topColleges: ["AIIMS Delhi", "JIPMER", "CMC Vellore", "MAMC Delhi", "JSS Medical", "Kasturba Medical"],
    keySkills: ["Medical Knowledge", "Patient Care", "Diagnosis", "Surgery", "Empathy", "Communication"],
    jobRoles: ["Doctor (MBBS)", "Medical Officer", "Government Doctor", "Private Practice", "Researcher"],
    nextSteps: ["MD/MS (Specialization)", "DM/MCh (Super Specialization)", "MBBS + MBA (Hospital Management)"],
  },
  {
    id: "bcom",
    name: "B.Com / BBA",
    stage: "after12th",
    icon: "💼",
    description: "Commerce and management degrees — pathways to CA, banking, MBA, and business careers.",
    duration: "3 years",
    eligibility: "12th (any stream) / CUET",
    difficulty: "Moderate",
    avgStartingSalary: "₹3-7 LPA",
    scope: "Medium",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-100",
    steps: [
      { id: "y1", title: "Year 1", subtitle: "Fundamentals", description: "Financial Accounting, Business Economics, Business Law.", duration: "1 year", eligibility: "12th pass", icon: "📖", color: "text-amber-600", bgColor: "bg-amber-50" },
      { id: "y2", title: "Year 2", subtitle: "Core Commerce", description: "Corporate Accounting, Cost Accounting, Marketing, Taxation.", duration: "1 year", eligibility: "Year 1 pass", icon: "💼", color: "text-amber-600", bgColor: "bg-amber-50" },
      { id: "y3", title: "Year 3", subtitle: "Specialization", description: "Auditing, Management Accounting, Electives, Internships.", duration: "1 year", eligibility: "Year 2 pass", icon: "📊", color: "text-amber-600", bgColor: "bg-amber-50" },
    ],
    exams: ["CA Foundation → Intermediate → Final", "CS Executive", "CMA", "CUET PG", "CAT (after graduation)"],
    topColleges: ["SRCC Delhi", "St. Xavier's Mumbai", "Christ University", "Symbiosis", "Loyola Chennai"],
    keySkills: ["Accounting", "Financial Analysis", "Taxation", "Business Strategy", "Communication"],
    jobRoles: ["Chartered Accountant", "Financial Analyst", "Bank PO", "Business Manager", "Auditor"],
    nextSteps: ["MBA", "CA Final", "CS Professional", "CMA Final", "M.Com", "Banking (IBPS/SBI)"],
  },
  {
    id: "ba-law",
    name: "BA LLB (5-year)",
    stage: "after12th",
    icon: "⚖️",
    description: "Integrated law degree — become a lawyer, judge, or legal advisor.",
    duration: "5 years",
    eligibility: "12th pass + CLAT/AILET",
    difficulty: "Hard",
    avgStartingSalary: "₹4-10 LPA",
    scope: "High",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-100",
    steps: [
      { id: "y1", title: "Year 1-2", subtitle: "Arts Foundation", description: "Political Science, History, Economics, Sociology, English.", duration: "2 years", eligibility: "CLAT/AILET", icon: "📖", color: "text-purple-600", bgColor: "bg-purple-50" },
      { id: "y2", title: "Year 3-4", subtitle: "Law Core", description: "Constitutional Law, Criminal Law, Civil Law, Contract Law, IPC, CrPC.", duration: "2 years", eligibility: "Year 2 pass", icon: "⚖️", color: "text-purple-600", bgColor: "bg-purple-50" },
      { id: "y3", title: "Year 5", subtitle: "Specialization + Internship", description: "Electives, Moot Court, Internship at law firms/courts.", duration: "1 year", eligibility: "Year 4 pass", icon: "🏛️", color: "text-purple-600", bgColor: "bg-purple-50" },
    ],
    exams: ["CLAT", "AILET", "LSAT", "State Law CETs", "Judiciary (after graduation)"],
    topColleges: ["NLSIU Bangalore", "NALSAR Hyderabad", "NLU Delhi", "NLU Jodhpur", "Symbiosis Law", "Christ University"],
    keySkills: ["Legal Reasoning", "Argumentation", "Research", "Communication", "Analytical Thinking"],
    jobRoles: ["Lawyer", "Judge", "Legal Advisor", "Corporate Counsel", "Legal Journalist"],
    nextSteps: ["LLM", "Judiciary Exam", "UPSC (IAS/IPS)", "Corporate Law", "LLB (3-year)"],
  },
  {
    id: "bsc",
    name: "B.Sc",
    stage: "after12th",
    icon: "🔬",
    description: "Bachelor of Science — research, teaching, and government exam preparation.",
    duration: "3 years",
    eligibility: "12th (relevant stream)",
    difficulty: "Moderate",
    avgStartingSalary: "₹2.5-6 LPA",
    scope: "Medium",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-100",
    steps: [
      { id: "y1", title: "Year 1", subtitle: "Core Sciences", description: "Physics/Chemistry/Biology/Maths fundamentals.", duration: "1 year", eligibility: "12th pass", icon: "📖", color: "text-cyan-600", bgColor: "bg-cyan-50" },
      { id: "y2", title: "Year 2", subtitle: "Specialization", description: "Deep dive into chosen specialization.", duration: "1 year", eligibility: "Year 1 pass", icon: "🔬", color: "text-cyan-600", bgColor: "bg-cyan-50" },
      { id: "y3", title: "Year 3", subtitle: "Research + Projects", description: "Dissertation, research projects, competitive exam prep.", duration: "1 year", eligibility: "Year 2 pass", icon: "🎓", color: "text-cyan-600", bgColor: "bg-cyan-50" },
    ],
    exams: ["CUET PG", "IIT JAM", "GATE", "NET/SET", "Railway/SSC Exams"],
    topColleges: ["St. Stephen's Delhi", "Presidency College", "Loyola Chennai", "Hansraj Delhi", "Miranda House"],
    keySkills: ["Scientific Method", "Research", "Data Analysis", "Lab Skills", "Mathematical Modeling"],
    jobRoles: ["Research Assistant", "Lab Technician", "Teacher", "Government Officer", "Data Analyst"],
    nextSteps: ["M.Sc", "MCA", "B.Ed (Teaching)", "Government Exams", "MS (Abroad)"],
  },
  ...afterTwelfthFamilies,
];

// ── After Degree ──

export const afterDegreePaths: CareerPath[] = [
  {
    id: "mba",
    name: "MBA",
    stage: "afterDegree",
    icon: "📈",
    description: "Master of Business Administration — leadership roles in management, consulting, and entrepreneurship.",
    duration: "2 years",
    eligibility: "Bachelor's degree + CAT/XAT/GMAT",
    difficulty: "Hard",
    avgStartingSalary: "₹8-25 LPA typical campus",
    salarySource: "IIM Ahmedabad IPRS 2025 median maximum earning potential was ₹34.59 LPA for the PGP batch. That is one top B-school, not the national MBA median. NIRF Management rankings also publish medians.",
    salarySourceUrl: "https://www01.iima.ac.in/iprs/gallery/2025/PGP_Audit_Report_Finals_2025.pdf",
    scope: "High",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-100",
    steps: [
      { id: "y1", title: "Year 1", subtitle: "Core Management", description: "Finance, Marketing, HR, Operations, Business Analytics, Economics.", duration: "1 year", eligibility: "CAT/XAT/GMAT", icon: "📖", color: "text-indigo-600", bgColor: "bg-indigo-50" },
      { id: "y2", title: "Year 2", subtitle: "Specialization + Placement", description: "Choose specialization (Finance, Marketing, HR, Operations, IT), Internships, Final Placement.", duration: "1 year", eligibility: "Year 1 pass", icon: "🎓", color: "text-indigo-600", bgColor: "bg-indigo-50" },
    ],
    exams: ["CAT", "XAT", "GMAT", "NMAT", "SNAP", "CMAT", "MAT"],
    topColleges: ["IIM Ahmedabad", "IIM Bangalore", "IIM Calcutta", "ISB Hyderabad", "XLRI Jamshedpur", "FMS Delhi"],
    keySkills: ["Leadership", "Strategic Thinking", "Financial Analysis", "Marketing", "Data Analytics", "Communication"],
    jobRoles: ["Management Consultant", "Product Manager", "Investment Banker", "Marketing Manager", "Operations Head", "CEO/Founder"],
    nextSteps: ["Corporate Leadership", "Entrepreneurship", "Consulting", "PhD (Management)"],
  },
  {
    id: "mtech",
    name: "M.Tech / MS",
    stage: "afterDegree",
    icon: "🔧",
    description: "Master's in Engineering/Technology — specialization in your engineering domain.",
    duration: "2 years",
    eligibility: "B.Tech + GATE/GRE",
    difficulty: "Hard",
    avgStartingSalary: "₹6-18 LPA campus band",
    salarySource: "NIRF 2025 Engineering includes PG 2-year median salary. PSU recruitment through GATE uses organisation pay scales, not campus CTC.",
    salarySourceUrl: "https://www.nirfindia.org/Rankings/2025/EngineeringRanking.html",
    scope: "High",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-100",
    steps: [
      { id: "y1", title: "Year 1", subtitle: "Advanced Courses", description: "Specialized courses, research methodology, lab work.", duration: "1 year", eligibility: "GATE/GRE", icon: "📖", color: "text-blue-600", bgColor: "bg-blue-50" },
      { id: "y2", title: "Year 2", subtitle: "Thesis + Placement", description: "Master's thesis, research publication, campus placements.", duration: "1 year", eligibility: "Year 1 pass", icon: "🎓", color: "text-blue-600", bgColor: "bg-blue-50" },
    ],
    exams: ["GATE (India)", "GRE (Abroad)", "NET/SET (for teaching)"],
    topColleges: ["IITs", "NITs", "IIITs", "IISc Bangalore", "BITS Pilani"],
    keySkills: ["Research", "Specialized Technical Skills", "Problem Solving", "Publication", "Teaching"],
    jobRoles: ["Senior Engineer", "R&D Scientist", "University Professor", "Technical Lead", "PSU Officer"],
    nextSteps: ["PhD", "Industry Leadership", "Professor", "Research Scientist", "PSU (via GATE)"],
  },
  {
    id: "upsc",
    name: "UPSC Civil Services",
    stage: "afterDegree",
    icon: "🏛️",
    description: "IAS/IPS/IFS — serve the nation through administrative, police, or foreign services.",
    duration: "1-3 years (preparation)",
    eligibility: "Bachelor's degree, age 21-32",
    difficulty: "Very Hard",
    avgStartingSalary: "₹8-15 LPA (IAS) + benefits",
    salarySource: "IAS/IPS join on 7th CPC Level 10 plus allowances and government housing. This is a public pay scale, not a private CTC.",
    salarySourceUrl: "https://dopt.gov.in/",
    scope: "High",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-100",
    steps: [
      { id: "prelims", title: "Prelims", subtitle: "GS + CSAT", description: "General Studies Paper 1 and CSAT Paper 2 — screening test.", duration: "6 months", eligibility: "Bachelor's degree", icon: "📝", color: "text-amber-600", bgColor: "bg-amber-50" },
      { id: "mains", title: "Mains", subtitle: "9 Papers", description: "Essay, GS 1-4, Optional Subject (2 papers), Hindi, English.", duration: "4-6 months", eligibility: "Prelims qualified", icon: "📚", color: "text-amber-600", bgColor: "bg-amber-50" },
      { id: "interview", title: "Interview", subtitle: "Personality Test", description: "Board interview assessing personality, knowledge, and suitability.", duration: "1-2 months", eligibility: "Mains qualified", icon: "🎯", color: "text-amber-600", bgColor: "bg-amber-50" },
    ],
    exams: ["UPSC CSE Prelims", "UPSC CSE Mains", "Personality Test"],
    topColleges: ["Any recognized university"],
    keySkills: ["General Knowledge", "Analytical Thinking", "Ethics", "Current Affairs", "Optional Subject Expertise"],
    jobRoles: ["IAS Officer", "IPS Officer", "IFS Officer", "IRS Officer", "State Civil Services"],
    nextSteps: ["IAS/IPS/IFS Training", "District Administration", "Policy Making", "State Services"],
  },
  {
    id: "govt-exams",
    name: "Government Exams",
    stage: "afterDegree",
    icon: "🏛️",
    description: "Bank PO, SSC CGL, Railway, Defence — stable government careers.",
    duration: "6-12 months preparation",
    eligibility: "Bachelor's degree (varies by exam)",
    difficulty: "Moderate",
    avgStartingSalary: "₹3.5-8 LPA",
    scope: "Medium",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-100",
    steps: [
      { id: "preparation", title: "Preparation", subtitle: "6-12 months", description: "Quantitative Aptitude, Reasoning, English, General Awareness.", duration: "6-12 months", eligibility: "Bachelor's degree", icon: "📖", color: "text-emerald-600", bgColor: "bg-emerald-50" },
      { id: "exam", title: "Exam + Result", subtitle: "Prelims → Mains → Interview", description: "Appear for exam, clear stages, get final result.", duration: "3-6 months", eligibility: "Preparation complete", icon: "📝", color: "text-emerald-600", bgColor: "bg-emerald-50" },
    ],
    exams: ["IBPS PO", "SBI PO", "SSC CGL", "RRB NTPC", "SSC CHSL", "RRB Group D", "NTA UGC NET"],
    topColleges: ["Any recognized university"],
    keySkills: ["Quantitative Aptitude", "Reasoning", "English", "General Knowledge"],
    jobRoles: ["Bank PO", "Bank Clerk", "Income Tax Inspector", "Central Govt Officer", "Railway Officer"],
    nextSteps: ["Promotion within govt", "State PSC", "UPSC", "Departmental exams"],
  },
  {
    id: "ms-abroad",
    name: "MS (Abroad)",
    stage: "afterDegree",
    icon: "🌍",
    description: "Master's degree from international universities — global career opportunities.",
    duration: "1.5-2 years",
    eligibility: "Bachelor's degree + GRE/IELTS/TOEFL",
    difficulty: "Hard",
    avgStartingSalary: "$60K-$120K/year (US)",
    scope: "High",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-100",
    steps: [
      { id: "prep", title: "Preparation", subtitle: "GRE + IELTS/TOEFL", description: "Standardized tests, SOP, LORs, university shortlisting.", duration: "6-12 months", eligibility: "Bachelor's degree", icon: "📖", color: "text-cyan-600", bgColor: "bg-cyan-50" },
      { id: "ms", title: "MS Program", subtitle: "1.5-2 years", description: "Coursework + Thesis/Capstone + Internships.", duration: "1.5-2 years", eligibility: "GRE + Admission", icon: "🎓", color: "text-cyan-600", bgColor: "bg-cyan-50" },
    ],
    exams: ["GRE", "IELTS/TOEFL", "GMAT (for MBA)"],
    topColleges: ["MIT", "Stanford", "CMU", "UC Berkeley", "Georgia Tech", "TU Munich", "ETH Zurich"],
    keySkills: ["Research", "Technical Skills", "English Proficiency", "Global Mindset", "Networking"],
    jobRoles: ["Software Engineer (FAANG)", "Research Scientist", "Data Scientist", "Product Manager", "Consultant"],
    nextSteps: ["H1B Work Visa", "PhD", "Startup", "Return to India (Senior roles)"],
  },
  {
    id: "pg-neet",
    name: "MD / MS (Medical PG)",
    stage: "afterDegree",
    icon: "🏥",
    description: "Postgraduate medical specialization — become a specialist doctor.",
    duration: "3 years",
    eligibility: "MBBS + NEET PG",
    difficulty: "Very Hard",
    avgStartingSalary: "₹8-25 LPA",
    scope: "High",
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-100",
    steps: [
      { id: "y1", title: "Year 1", subtitle: "Clinical Specialization", description: "Advanced clinical training in chosen specialty.", duration: "1 year", eligibility: "NEET PG", icon: "📖", color: "text-rose-600", bgColor: "bg-rose-50" },
      { id: "y2", title: "Year 2", subtitle: "Advanced Training", description: "Hands-on procedures, research, thesis work.", duration: "1 year", eligibility: "Year 1 pass", icon: "🏥", color: "text-rose-600", bgColor: "bg-rose-50" },
      { id: "y3", title: "Year 3", subtitle: "Thesis + Final", description: "Master's thesis, final examinations, independent practice.", duration: "1 year", eligibility: "Year 2 pass", icon: "🎓", color: "text-rose-600", bgColor: "bg-rose-50" },
    ],
    exams: ["NEET PG", "INICET (AIIMS)", "FMGE"],
    topColleges: ["AIIMS", "JIPMER", "CMC Vellore", "PGIMER Chandigarh", "KGMU"],
    keySkills: ["Clinical Expertise", "Surgical Skills", "Patient Management", "Research", "Empathy"],
    jobRoles: ["Specialist Doctor", "Consultant", "HOD", "Medical Professor", "Private Practice"],
    nextSteps: ["DM/MCh (Super Specialization)", "Fellowship", "Private Hospital", "Government Hospital", "Abroad"],
  },
  ...afterDegreeFamilies,
];

// ── After PG ──

export const afterPGPaths: CareerPath[] = [
  {
    id: "phd",
    name: "PhD",
    stage: "afterPG",
    icon: "🎓",
    description: "Doctor of Philosophy — deepest academic specialization, research, and teaching.",
    duration: "3-6 years",
    eligibility: "Master's degree / GATE/NET/CSIR",
    difficulty: "Very Hard",
    avgStartingSalary: "₹6-15 LPA (Academia) / ₹12-30 LPA (Industry R&D)",
    scope: "High",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-100",
    steps: [
      { id: "coursework", title: "Coursework", subtitle: "Year 1", description: "Advanced courses, research methodology, literature review.", duration: "1 year", eligibility: "NET/GATE/CSIR", icon: "📖", color: "text-indigo-600", bgColor: "bg-indigo-50" },
      { id: "research", title: "Research", subtitle: "Year 2-4", description: "Original research, publications, conference presentations.", duration: "2-3 years", eligibility: "Coursework complete", icon: "🔬", color: "text-indigo-600", bgColor: "bg-indigo-50" },
      { id: "thesis", title: "Thesis Defense", subtitle: "Final", description: "Thesis submission, viva voce, final defense.", duration: "6-12 months", eligibility: "Research complete", icon: "🎓", color: "text-indigo-600", bgColor: "bg-indigo-50" },
    ],
    exams: ["NET/SET", "GATE", "CSIR NET", "Institute entrance exams"],
    topColleges: ["IITs", "IISc", "IIMs", "Central Universities", "JNU", "DU"],
    keySkills: ["Research", "Critical Thinking", "Publication", "Teaching", "Specialized Expertise"],
    jobRoles: ["Professor", "Research Scientist", "R&D Head", "Industry Scientist", "Policy Researcher"],
    nextSteps: ["Post-Doc", "Professor (Assistant → Associate → Full)", "Industry R&D", "Think Tank", "Entrepreneurship"],
  },
  {
    id: "industry",
    name: "Industry / Corporate",
    stage: "afterPG",
    icon: "🏢",
    description: "Direct industry entry after PG — senior roles in top companies.",
    duration: "Immediate",
    eligibility: "PG degree + Placement/Network",
    difficulty: "Moderate",
    avgStartingSalary: "₹8-30 LPA campus band",
    salarySource: "NIRF 2025 PG 2-year medians at top engineering institutes are often in the low-to-mid teens of LPA or higher. Company CTC is not the same as NIRF median salary.",
    salarySourceUrl: "https://www.nirfindia.org/",
    scope: "High",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-100",
    steps: [
      { id: "campus", title: "Campus Placement", subtitle: "During PG", description: "Appear for placement drives during final year.", duration: "3-6 months", eligibility: "Final year PG", icon: "🎯", color: "text-emerald-600", bgColor: "bg-emerald-50" },
      { id: "corporate", title: "Corporate Career", subtitle: "Ongoing", description: "Build career, promotions, leadership roles.", duration: "Ongoing", eligibility: "Placement secured", icon: "🏢", color: "text-emerald-600", bgColor: "bg-emerald-50" },
    ],
    exams: ["Company-specific Interviews", "Off-campus drives", "Referrals"],
    topColleges: ["Placement from top PG institutions"],
    keySkills: ["Domain Expertise", "Leadership", "Communication", "Problem Solving", "Team Management"],
    jobRoles: ["Senior Engineer", "Manager", "Consultant", "Director", "VP", "CTO", "CFO"],
    nextSteps: ["Executive MBA", "Leadership Programs", "Entrepreneurship", "Board Positions"],
  },
  {
    id: "entrepreneurship",
    name: "Entrepreneurship",
    stage: "afterPG",
    icon: "🚀",
    description: "Start your own company — turn ideas into businesses.",
    duration: "Ongoing",
    eligibility: "Any PG + Idea + Funding",
    difficulty: "Very Hard",
    avgStartingSalary: "Variable (₹0 to ₹Cr)",
    scope: "High",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-100",
    steps: [
      { id: "idea", title: "Ideation", subtitle: "Validate", description: "Market research, problem identification, MVP development.", duration: "3-6 months", eligibility: "PG graduate", icon: "💡", color: "text-orange-600", bgColor: "bg-orange-50" },
      { id: "build", title: "Build & Launch", subtitle: "6-12 months", description: "Product development, team building, initial funding.", duration: "6-12 months", eligibility: "Idea validated", icon: "🚀", color: "text-orange-600", bgColor: "bg-orange-50" },
      { id: "grow", title: "Scale", subtitle: "Ongoing", description: "Growth, funding rounds, market expansion.", duration: "Ongoing", eligibility: "Business running", icon: "📈", color: "text-orange-600", bgColor: "bg-orange-50" },
    ],
    exams: [],
    topColleges: [],
    keySkills: ["Vision", "Leadership", "Financial Management", "Marketing", "Risk Taking", "Resilience"],
    jobRoles: ["Founder", "CEO", "CTO", "Co-founder"],
    nextSteps: ["Scale to Series A/B/C", "IPO", "Acquisition", "Social Enterprise"],
  },
  {
    id: "teaching",
    name: "Teaching & Academia",
    stage: "afterPG",
    icon: "📚",
    description: "Teach at colleges and universities — shape the next generation.",
    duration: "Career-long",
    eligibility: "PG + NET/SET/PhD",
    difficulty: "Hard",
    avgStartingSalary: "₹5-12 LPA (Assistant Professor)",
    salarySource: "UGC 7th CPC Academic Level 10 starts at basic pay ₹57,700 plus DA and other allowances. Take-home varies by city. NET/SET is the eligibility exam, not a salary.",
    salarySourceUrl: "https://www.ugc.gov.in/",
    scope: "Medium",
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-100",
    steps: [
      { id: "net", title: "NET/SET Qualification", subtitle: "Eligibility", description: "Clear UGC NET or State SET for assistant professor eligibility.", duration: "6-12 months", eligibility: "Master's degree", icon: "📝", color: "text-violet-600", bgColor: "bg-violet-50" },
      { id: "professor", title: "Assistant Professor", subtitle: "Entry Level", description: "Teach undergraduate/postgraduate students, research.", duration: "Ongoing", eligibility: "NET qualified", icon: "📚", color: "text-violet-600", bgColor: "bg-violet-50" },
    ],
    exams: ["UGC NET", "State SET", "GATE (for IIT/NIT teaching)"],
    topColleges: ["IITs", "NITs", "Central Universities", "State Universities", "Private Colleges"],
    keySkills: ["Teaching", "Research", "Mentoring", "Publication", "Domain Expertise"],
    jobRoles: ["Assistant Professor", "Associate Professor", "Professor", "HOD", "Dean", "Vice Chancellor"],
    nextSteps: ["PhD (for career progression)", "Research Grants", "International Collaboration", "Academic Leadership"],
  },
];

// ── Stage Metadata ──

export const stageInfo = {
  after10th: {
    title: "After 10th Class",
    subtitle: "Choose your stream & foundation",
    description: "The first major decision of your academic career. Choose Intermediate (including HEC and vocational), Diploma, or ITI based on your interests and goals.",
    color: "text-primary",
    bgColor: "bg-primary/5",
  },
  after12th: {
    title: "After +2 (Intermediate)",
    subtitle: "Degree & Professional courses",
    description: "Time to pick your degree — engineering branches, health programmes, commerce, law, design, agriculture, CA, and more. This shapes your entire career.",
    color: "text-primary",
    bgColor: "bg-primary/5",
  },
  afterDegree: {
    title: "After Degree (Graduation)",
    subtitle: "Higher studies, jobs & competitive exams",
    description: "MBA, M.Tech, M.Sc, MCA, LLM, B.Ed, CA/CS, UPSC, State PSC, government jobs, MS abroad, or industry entry.",
    color: "text-primary",
    bgColor: "bg-primary/5",
  },
  afterPG: {
    title: "After PG (Post-Graduation)",
    subtitle: "Specialization, Research & Leadership",
    description: "PhD, Industry leadership, Entrepreneurship, or Academia. The highest level of career specialization.",
    color: "text-primary",
    bgColor: "bg-primary/5",
  },
};

// ── Mock Test Data ──

export interface MockQuestion {
  id: number;
  /** Database question id. Present only for tests loaded from Supabase. */
  dbId?: string;
  question: string;
  options: string[];
  /** Present only after the server grades the attempt. Never shipped in the question list. */
  correctAnswer?: number;
  explanation?: string;
  subject: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

export interface MockTest {
  id: string;
  title: string;
  exam: string;
  subject: string;
  duration: number; // minutes
  totalQuestions: number;
  totalMarks: number;
  stages: Array<"after10th" | "after12th" | "afterDegree" | "afterPG">;
  questions: MockQuestion[];
}

export const mockTests: MockTest[] = [
  {
    id: "jee-phys-1",
    title: "JEE Main Physics - Mechanics",
    exam: "JEE Main",
    subject: "Physics",
    duration: 30,
    totalQuestions: 10,
    totalMarks: 40,
    stages: ["after10th", "after12th"],
    questions: [
      { id: 1, question: "A body of mass 5 kg is moving with a velocity of 10 m/s. What is its kinetic energy?", options: ["250 J", "500 J", "100 J", "50 J"], subject: "Physics", difficulty: "Easy" },
      { id: 2, question: "The SI unit of force is:", options: ["Joule", "Newton", "Watt", "Pascal"], subject: "Physics", difficulty: "Easy" },
      { id: 3, question: "According to Newton's third law, every action has:", options: ["An equal reaction", "An equal and opposite reaction", "A proportional reaction", "No reaction"], subject: "Physics", difficulty: "Easy" },
      { id: 4, question: "The acceleration due to gravity on the Moon is approximately:", options: ["9.8 m/s²", "1.6 m/s²", "3.3 m/s²", "6.2 m/s²"], subject: "Physics", difficulty: "Medium" },
      { id: 5, question: "A projectile is launched at 45°. At what other angle (with same speed) will it have the same range?", options: ["30°", "60°", "45°", "90°"], subject: "Physics", difficulty: "Medium" },
      { id: 6, question: "Moment of inertia of a solid sphere about its diameter is:", options: ["2/5 MR²", "2/3 MR²", "MR²", "1/2 MR²"], subject: "Physics", difficulty: "Medium" },
      { id: 7, question: "The escape velocity from Earth is approximately:", options: ["7.2 km/s", "11.2 km/s", "15.4 km/s", "9.8 km/s"], subject: "Physics", difficulty: "Medium" },
      { id: 8, question: "In SHM, the maximum kinetic energy equals:", options: ["Maximum potential energy", "Half the maximum PE", "Double the maximum PE", "Zero"], subject: "Physics", difficulty: "Hard" },
      { id: 9, question: "The frequency of a spring-mass system depends on:", options: ["Mass only", "Spring constant only", "Both mass and spring constant", "Neither"], subject: "Physics", difficulty: "Hard" },
      { id: 10, question: "Two blocks connected by a string over a pulley. If m₁ = 4kg, m₂ = 6kg, find acceleration (frictionless).", options: ["2 m/s²", "4 m/s²", "1 m/s²", "9.8 m/s²"], subject: "Physics", difficulty: "Hard" },
    ],
  },
  {
    id: "neet-bio-1",
    title: "NEET Biology - Human Physiology",
    exam: "NEET",
    subject: "Biology",
    duration: 30,
    totalQuestions: 10,
    totalMarks: 40,
    stages: ["after10th", "after12th"],
    questions: [
      { id: 1, question: "The normal blood pressure of a healthy adult is:", options: ["120/80 mmHg", "140/90 mmHg", "100/60 mmHg", "160/100 mmHg"], subject: "Biology", difficulty: "Easy" },
      { id: 2, question: "Which chamber of the heart pumps blood to the entire body?", options: ["Right Atrium", "Left Atrium", "Right Ventricle", "Left Ventricle"], subject: "Biology", difficulty: "Easy" },
      { id: 3, question: "The functional unit of the kidney is:", options: ["Nephron", "Alveolus", "Neuron", "Hepatocyte"], subject: "Biology", difficulty: "Easy" },
      { id: 4, question: "Insulin is secreted by:", options: ["Alpha cells of pancreas", "Beta cells of pancreas", "Gamma cells of pancreas", "Liver cells"], subject: "Biology", difficulty: "Medium" },
      { id: 5, question: "The red blood cells are produced in:", options: ["Liver", "Spleen", "Red bone marrow", "Lymph nodes"], subject: "Biology", difficulty: "Medium" },
      { id: 6, question: "Which part of the brain controls balance and coordination?", options: ["Cerebrum", "Cerebellum", "Medulla", "Hypothalamus"], subject: "Biology", difficulty: "Medium" },
      { id: 7, question: "Hemoglobin binds most strongly with:", options: ["Carbon dioxide", "Oxygen", "Carbon monoxide", "Nitrogen"], subject: "Biology", difficulty: "Hard" },
      { id: 8, question: "The Counter Current Mechanism occurs in:", options: ["Liver", "Lungs", "Kidney (Loop of Henle)", "Heart"], subject: "Biology", difficulty: "Hard" },
      { id: 9, question: "ADH (Vasopressin) acts on:", options: ["Distal Convoluted Tubule", "Collecting Duct", "Proximal Convoluted Tubule", "Glomerulus"], subject: "Biology", difficulty: "Hard" },
      { id: 10, question: "The sinoatrial (SA) node is located in:", options: ["Left Atrium", "Right Atrium", "Left Ventricle", "Interventricular septum"], subject: "Biology", difficulty: "Medium" },
    ],
  },
  {
    id: "jee-math-1",
    title: "JEE Main Maths - Calculus",
    exam: "JEE Main",
    subject: "Mathematics",
    duration: 30,
    totalQuestions: 10,
    totalMarks: 40,
    stages: ["after10th", "after12th"],
    questions: [
      { id: 1, question: "If f(x) = x³, then f'(x) =", options: ["3x", "3x²", "x²", "3x³"], subject: "Mathematics", difficulty: "Easy" },
      { id: 2, question: "∫ 2x dx =", options: ["x² + C", "2x² + C", "x + C", "2 + C"], subject: "Mathematics", difficulty: "Easy" },
      { id: 3, question: "The derivative of sin(x) is:", options: ["cos(x)", "-cos(x)", "sin(x)", "-sin(x)"], subject: "Mathematics", difficulty: "Easy" },
      { id: 4, question: "lim(x→0) sin(x)/x =", options: ["0", "1", "∞", "Does not exist"], subject: "Mathematics", difficulty: "Medium" },
      { id: 5, question: "The integral ∫₀^π sin(x) dx equals:", options: ["0", "1", "2", "π"], subject: "Mathematics", difficulty: "Medium" },
      { id: 6, question: "If y = eˣ, then dy/dx =", options: ["xeˣ⁻¹", "eˣ", "eˣ⁺¹", "1/eˣ"], subject: "Mathematics", difficulty: "Easy" },
      { id: 7, question: "The area under y = x² from x=0 to x=2 is:", options: ["4", "8/3", "2", "4/3"], subject: "Mathematics", difficulty: "Medium" },
      { id: 8, question: "If f(x) = ln(x), then f'(x) =", options: ["x", "1/x", "ln(x)", "eˣ"], subject: "Mathematics", difficulty: "Easy" },
      { id: 9, question: "The order of the differential equation y'' + 3y' + 2y = 0 is:", options: ["1", "2", "3", "0"], subject: "Mathematics", difficulty: "Medium" },
      { id: 10, question: "∫ eˣ sin(x) dx using integration by parts equals:", options: ["eˣsin(x) - eˣcos(x))/2 + C", "eˣ(cos(x) + sin(x))/2 + C", "eˣsin(x)/2 + C", "eˣcos(x) + C"], subject: "Mathematics", difficulty: "Hard" },
    ],
  },
  ...extraMockTests,
];

// ── Resource Library ──

export interface Resource {
  id: string;
  title: string;
  category: "guide";
  subject: string;
  stage: "after10th" | "after12th" | "afterDegree" | "afterPG" | "all";
  format: "pdf" | "online" | "video";
  free: boolean;
  description: string;
  sourceName: string;
  lastVerified: string;
}

export const resourceLibrary: Resource[] = [
  { id: "r23", title: "JEE Main Preparation Strategy", category: "guide", subject: "All", stage: "after10th", format: "pdf", free: true, description: "Month-by-month JEE preparation plan", sourceName: "EduPath", lastVerified: "2026-09-01" },
  { id: "r24", title: "NEET Preparation Strategy", category: "guide", subject: "All", stage: "after10th", format: "pdf", free: true, description: "Complete NEET preparation roadmap", sourceName: "EduPath", lastVerified: "2026-09-01" },
  { id: "r25", title: "Career After 10th Complete Guide", category: "guide", subject: "Career", stage: "after10th", format: "pdf", free: true, description: "Everything you need to know about career options after 10th", sourceName: "EduPath", lastVerified: "2026-09-01" },
  { id: "r26", title: "Career After 12th Complete Guide", category: "guide", subject: "Career", stage: "after12th", format: "pdf", free: true, description: "Engineering, Medicine, Commerce, Law — complete comparison", sourceName: "EduPath", lastVerified: "2026-09-01" },
  { id: "r27", title: "Career After Degree Guide", category: "guide", subject: "Career", stage: "afterDegree", format: "pdf", free: true, description: "MBA, M.Tech, UPSC, Government jobs — what to choose", sourceName: "EduPath", lastVerified: "2026-09-01" },
  { id: "r28", title: "Career After PG Guide", category: "guide", subject: "Career", stage: "afterPG", format: "pdf", free: true, description: "PhD, industry leadership, teaching, and entrepreneurship — how to choose", sourceName: "EduPath", lastVerified: "2026-09-01" },
  { id: "r29", title: "PhD vs Industry after PG", category: "guide", subject: "Career", stage: "afterPG", format: "pdf", free: true, description: "Compare research, campus placement, and PSU routes using public NIRF medians and institute reports", sourceName: "EduPath", lastVerified: "2026-09-01" },
  { id: "r30", title: "UGC NET and college teaching", category: "guide", subject: "Career", stage: "afterPG", format: "pdf", free: true, description: "NET/SET eligibility, 7th CPC Academic Level 10, and how assistant professor hiring actually works", sourceName: "EduPath", lastVerified: "2026-09-01" },
  { id: "r31", title: "How to read NIRF and placement PDFs", category: "guide", subject: "Career", stage: "afterPG", format: "pdf", free: true, description: "Median vs mean, UG vs PG, IPRS maximum earning potential vs CTC — so salary chips are not mistaken for guarantees", sourceName: "EduPath", lastVerified: "2026-09-01" },
];

export const allPaths: CareerPath[] = [
  ...afterTenthPaths,
  ...afterTwelfthPaths,
  ...afterDegreePaths,
  ...afterPGPaths,
];
