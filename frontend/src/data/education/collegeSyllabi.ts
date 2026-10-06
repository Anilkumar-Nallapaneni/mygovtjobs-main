import { LAST_VERIFIED } from "./officialSources";
import { extraCollegeSyllabi } from "./collegeSyllabiExtra";
import type { CollegeSyllabus } from "./educationTypes";

const AICTE = {
  sourceName: "AICTE model undergraduate curriculum",
  sourceUrl: "https://www.aicte-india.org/",
  lastVerified: LAST_VERIFIED,
};

const NMC = {
  sourceName: "National Medical Commission (CBME)",
  sourceUrl: "https://www.nmc.org.in/information-desk/for-colleges/ug-curriculum/",
  lastVerified: LAST_VERIFIED,
};

const UGC = {
  sourceName: "UGC CBCS / LOCF model curriculum",
  sourceUrl: "https://www.ugc.gov.in/",
  lastVerified: LAST_VERIFIED,
};

const BCI = {
  sourceName: "Bar Council of India Rules of Legal Education",
  sourceUrl: "https://www.barcouncilofindia.org/",
  lastVerified: LAST_VERIFIED,
};

const coreCollegeSyllabi: CollegeSyllabus[] = [
  {
    degree: "B.Tech CSE",
    stream: "mpc",
    ...AICTE,
    semesters: [
      {
        semester: 1,
        subjects: [
          { code: "MA101", name: "Engineering Mathematics I", credits: 4, type: "theory" },
          { code: "PH101", name: "Engineering Physics", credits: 4, type: "theory" },
          { code: "CS101", name: "Introduction to Programming (C)", credits: 3, type: "theory" },
          { code: "EE101", name: "Basic Electrical Engineering", credits: 3, type: "theory" },
          { code: "CS102", name: "Programming Lab (C)", credits: 2, type: "lab" },
          { code: "PH102", name: "Physics Lab", credits: 1, type: "lab" },
        ],
      },
      {
        semester: 2,
        subjects: [
          { code: "MA102", name: "Engineering Mathematics II", credits: 4, type: "theory" },
          { code: "CH101", name: "Engineering Chemistry", credits: 4, type: "theory" },
          { code: "CS201", name: "Data Structures", credits: 4, type: "theory" },
          { code: "ME101", name: "Engineering Mechanics", credits: 3, type: "theory" },
          { code: "CS202", name: "Data Structures Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 3,
        subjects: [
          { code: "MA201", name: "Discrete Mathematics", credits: 4, type: "theory" },
          { code: "CS301", name: "Object Oriented Programming (Java)", credits: 4, type: "theory" },
          { code: "CS302", name: "Digital Logic Design", credits: 4, type: "theory" },
          { code: "CS303", name: "Computer Organization & Architecture", credits: 3, type: "theory" },
          { code: "CS304", name: "OOP Lab (Java)", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 4,
        subjects: [
          { code: "MA202", name: "Probability & Statistics", credits: 4, type: "theory" },
          { code: "CS401", name: "Design & Analysis of Algorithms", credits: 4, type: "theory" },
          { code: "CS402", name: "Operating Systems", credits: 4, type: "theory" },
          { code: "CS403", name: "Database Management Systems", credits: 4, type: "theory" },
          { code: "CS404", name: "Algorithms Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 5,
        subjects: [
          { code: "CS501", name: "Computer Networks", credits: 4, type: "theory" },
          { code: "CS502", name: "Software Engineering", credits: 3, type: "theory" },
          { code: "CS503", name: "Theory of Computation", credits: 4, type: "theory" },
          { code: "CS504", name: "Compiler Design", credits: 3, type: "theory" },
          { code: "CS505", name: "Networks Lab", credits: 2, type: "lab" },
          { code: "CS5XX", name: "Professional Elective I", credits: 3, type: "elective" },
        ],
      },
      {
        semester: 6,
        subjects: [
          { code: "CS601", name: "Machine Learning", credits: 4, type: "theory" },
          { code: "CS602", name: "Web Technologies", credits: 3, type: "theory" },
          { code: "CS603", name: "Artificial Intelligence", credits: 3, type: "theory" },
          { code: "CS6XX", name: "Professional Elective II", credits: 3, type: "elective" },
          { code: "CS6XY", name: "Open Elective I", credits: 3, type: "elective" },
          { code: "CS604", name: "ML/AI Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 7,
        subjects: [
          { code: "CS701", name: "Cloud Computing", credits: 3, type: "theory" },
          { code: "CS702", name: "Cyber Security", credits: 3, type: "theory" },
          { code: "CS7XX", name: "Professional Elective III", credits: 3, type: "elective" },
          { code: "CS7XY", name: "Open Elective II", credits: 3, type: "elective" },
          { code: "CS799", name: "Mini Project", credits: 3, type: "lab" },
        ],
      },
      {
        semester: 8,
        subjects: [
          { code: "CS8XX", name: "Professional Elective IV", credits: 3, type: "elective" },
          { code: "CS8XY", name: "Open Elective III", credits: 3, type: "elective" },
          { code: "CS899", name: "Major Project", credits: 10, type: "lab" },
        ],
      },
    ],
  },
  {
    degree: "B.Tech ECE",
    stream: "mpc",
    ...AICTE,
    semesters: [
      {
        semester: 1,
        subjects: [
          { code: "MA101", name: "Engineering Mathematics I", credits: 4, type: "theory" },
          { code: "PH101", name: "Engineering Physics", credits: 4, type: "theory" },
          { code: "EC101", name: "Basic Electronics", credits: 3, type: "theory" },
          { code: "CS101", name: "Programming in C", credits: 3, type: "theory" },
          { code: "EC102", name: "Electronics Lab", credits: 2, type: "lab" },
          { code: "PH102", name: "Physics Lab", credits: 1, type: "lab" },
        ],
      },
      {
        semester: 2,
        subjects: [
          { code: "MA102", name: "Engineering Mathematics II", credits: 4, type: "theory" },
          { code: "EC201", name: "Network Analysis", credits: 4, type: "theory" },
          { code: "EC202", name: "Signals & Systems", credits: 4, type: "theory" },
          { code: "EC203", name: "Analog Electronics", credits: 3, type: "theory" },
          { code: "EC204", name: "Network Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 3,
        subjects: [
          { code: "EC301", name: "Digital Electronics", credits: 4, type: "theory" },
          { code: "EC302", name: "Electromagnetic Theory", credits: 4, type: "theory" },
          { code: "EC303", name: "Control Systems", credits: 3, type: "theory" },
          { code: "EC304", name: "Digital Electronics Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 4,
        subjects: [
          { code: "EC401", name: "Communication Systems", credits: 4, type: "theory" },
          { code: "EC402", name: "VLSI Design", credits: 3, type: "theory" },
          { code: "EC403", name: "Digital Signal Processing", credits: 3, type: "theory" },
          { code: "EC4XX", name: "Professional Elective I", credits: 3, type: "elective" },
          { code: "EC404", name: "Communication Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 5,
        subjects: [
          { code: "EC501", name: "Microprocessors and Microcontrollers", credits: 4, type: "theory" },
          { code: "EC502", name: "Digital Communication", credits: 3, type: "theory" },
          { code: "EC503", name: "Antenna and Wave Propagation", credits: 3, type: "theory" },
          { code: "EC504", name: "Linear Integrated Circuits", credits: 3, type: "theory" },
          { code: "EC505", name: "Microprocessor and Microcontroller Lab", credits: 2, type: "lab" },
          { code: "EC5XX", name: "Professional Elective II", credits: 3, type: "elective" },
        ],
      },
      {
        semester: 6,
        subjects: [
          { code: "EC601", name: "Microwave Engineering", credits: 3, type: "theory" },
          { code: "EC602", name: "Optical Communication", credits: 3, type: "theory" },
          { code: "EC603", name: "Computer Networks", credits: 3, type: "theory" },
          { code: "EC604", name: "Embedded Systems", credits: 3, type: "theory" },
          { code: "EC605", name: "Microwave and Optical Lab", credits: 2, type: "lab" },
          { code: "EC6XY", name: "Open Elective I", credits: 3, type: "elective" },
        ],
      },
      {
        semester: 7,
        subjects: [
          { code: "EC701", name: "Wireless Communication", credits: 3, type: "theory" },
          { code: "EC702", name: "Internet of Things", credits: 3, type: "theory" },
          { code: "EC7XX", name: "Professional Elective III", credits: 3, type: "elective" },
          { code: "EC7XY", name: "Open Elective II", credits: 3, type: "elective" },
          { code: "EC799", name: "Mini Project", credits: 3, type: "lab" },
        ],
      },
      {
        semester: 8,
        subjects: [
          { code: "EC8XX", name: "Professional Elective IV", credits: 3, type: "elective" },
          { code: "EC8XY", name: "Open Elective III", credits: 3, type: "elective" },
          { code: "EC899", name: "Major Project / Internship", credits: 10, type: "lab" },
        ],
      },
    ],
  },
  {
    degree: "MBBS",
    stream: "bipc",
    ...NMC,
    semesters: [
      {
        semester: 1,
        label: "Phase I — Pre-clinical",
        subjects: [
          { code: "AN101", name: "Anatomy", credits: 6, type: "theory" },
          { code: "PY101", name: "Physiology", credits: 6, type: "theory" },
          { code: "BI101", name: "Biochemistry", credits: 3, type: "theory" },
          { code: "AN102", name: "Anatomy Dissection Lab", credits: 4, type: "lab" },
          { code: "PY102", name: "Physiology Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 2,
        label: "Phase I — Pre-clinical (continued)",
        subjects: [
          { code: "AN201", name: "Anatomy (continued)", credits: 6, type: "theory" },
          { code: "PY201", name: "Physiology (continued)", credits: 6, type: "theory" },
          { code: "BI201", name: "Biochemistry (continued)", credits: 3, type: "theory" },
          { code: "EC201", name: "Early Clinical Exposure / AETCOM", credits: 2, type: "lab" },
          { code: "AN202", name: "Anatomy Lab", credits: 4, type: "lab" },
        ],
      },
      {
        semester: 3,
        label: "Phase II — Para-clinical",
        subjects: [
          { code: "PA301", name: "Pathology", credits: 6, type: "theory" },
          { code: "PH301", name: "Pharmacology", credits: 4, type: "theory" },
          { code: "MI301", name: "Microbiology", credits: 4, type: "theory" },
          { code: "PA302", name: "Pathology Lab", credits: 2, type: "lab" },
          { code: "CM301", name: "Community Medicine (introduction)", credits: 2, type: "theory" },
        ],
      },
      {
        semester: 4,
        label: "Phase II — Para-clinical (continued)",
        subjects: [
          { code: "PA401", name: "Pathology (systemic)", credits: 4, type: "theory" },
          { code: "PH401", name: "Pharmacology (continued)", credits: 4, type: "theory" },
          { code: "MI401", name: "Microbiology (continued)", credits: 3, type: "theory" },
          { code: "FM401", name: "Forensic Medicine (introduction)", credits: 2, type: "theory" },
          { code: "CM401", name: "Family Adoption Programme", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 5,
        label: "Phase III Part I",
        subjects: [
          { code: "FM501", name: "Forensic Medicine and Toxicology", credits: 4, type: "theory" },
          { code: "CM501", name: "Community Medicine", credits: 4, type: "theory" },
          { code: "OP501", name: "Ophthalmology", credits: 3, type: "theory" },
          { code: "EN501", name: "Otorhinolaryngology (ENT)", credits: 3, type: "theory" },
          { code: "CL501", name: "Clinical postings", credits: 4, type: "lab" },
        ],
      },
      {
        semester: 6,
        label: "Phase III Part II — Core clinical",
        subjects: [
          { code: "GM601", name: "General Medicine", credits: 6, type: "theory" },
          { code: "GS601", name: "General Surgery", credits: 6, type: "theory" },
          { code: "OG601", name: "Obstetrics and Gynaecology", credits: 5, type: "theory" },
          { code: "PE601", name: "Pediatrics", credits: 4, type: "theory" },
          { code: "CL601", name: "Medicine and Surgery clinics", credits: 4, type: "lab" },
        ],
      },
      {
        semester: 7,
        label: "Phase III Part II — Allied clinical",
        subjects: [
          { code: "OR701", name: "Orthopaedics (including trauma)", credits: 3, type: "theory" },
          { code: "DV701", name: "Dermatology, Venereology and Leprosy", credits: 2, type: "theory" },
          { code: "PS701", name: "Psychiatry", credits: 2, type: "theory" },
          { code: "AS701", name: "Anaesthesiology", credits: 2, type: "theory" },
          { code: "RD701", name: "Radiodiagnosis", credits: 2, type: "theory" },
          { code: "RM701", name: "Respiratory Medicine including Tuberculosis", credits: 2, type: "theory" },
        ],
      },
      {
        semester: 8,
        label: "Compulsory rotating internship",
        subjects: [
          { code: "IN801", name: "Internship — Medicine and allied", credits: 4, type: "lab" },
          { code: "IN802", name: "Internship — Surgery and allied", credits: 4, type: "lab" },
          { code: "IN803", name: "Internship — Obstetrics and Gynaecology", credits: 3, type: "lab" },
          { code: "IN804", name: "Internship — Community Medicine", credits: 3, type: "lab" },
          { code: "IN805", name: "Internship — Pediatrics and elective", credits: 2, type: "lab" },
        ],
      },
    ],
  },
  {
    degree: "B.Com",
    stream: "mec",
    ...UGC,
    semesters: [
      {
        semester: 1,
        subjects: [
          { code: "CO101", name: "Financial Accounting", credits: 4, type: "theory" },
          { code: "EC101", name: "Principles of Microeconomics", credits: 4, type: "theory" },
          { code: "BS101", name: "Business Organisation", credits: 3, type: "theory" },
          { code: "EN101", name: "Business Communication", credits: 3, type: "theory" },
          { code: "CO102", name: "Computer Applications in Business", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 2,
        subjects: [
          { code: "CO201", name: "Corporate Accounting", credits: 4, type: "theory" },
          { code: "EC201", name: "Macroeconomics", credits: 4, type: "theory" },
          { code: "BS201", name: "Business Law", credits: 3, type: "theory" },
          { code: "MA201", name: "Business Mathematics", credits: 3, type: "theory" },
          { code: "CO202", name: "Tally Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 3,
        subjects: [
          { code: "CO301", name: "Cost Accounting", credits: 4, type: "theory" },
          { code: "CO302", name: "Income Tax Law & Practice", credits: 3, type: "theory" },
          { code: "BS301", name: "Marketing Management", credits: 3, type: "theory" },
          { code: "EC301", name: "Indian Economy", credits: 3, type: "theory" },
          { code: "CO303", name: "Tax Software Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 4,
        subjects: [
          { code: "CO401", name: "Auditing", credits: 4, type: "theory" },
          { code: "CO402", name: "Management Accounting", credits: 4, type: "theory" },
          { code: "BS401", name: "Human Resource Management", credits: 3, type: "theory" },
          { code: "CO4XX", name: "Discipline Specific Elective I", credits: 3, type: "elective" },
        ],
      },
      {
        semester: 5,
        subjects: [
          { code: "CO501", name: "Fundamentals of Financial Management", credits: 4, type: "theory" },
          { code: "CO502", name: "Indirect Tax Law (GST)", credits: 4, type: "theory" },
          { code: "CO503", name: "Entrepreneurship", credits: 3, type: "theory" },
          { code: "CO504", name: "E-Commerce", credits: 3, type: "theory" },
          { code: "CO5XX", name: "Discipline Specific Elective II", credits: 3, type: "elective" },
        ],
      },
      {
        semester: 6,
        subjects: [
          { code: "CO601", name: "Banking and Insurance", credits: 4, type: "theory" },
          { code: "CO602", name: "International Business", credits: 3, type: "theory" },
          { code: "CO603", name: "Fundamentals of Investment", credits: 3, type: "theory" },
          { code: "CO604", name: "Personal Selling and Salesmanship", credits: 3, type: "theory" },
          { code: "CO699", name: "Project Work", credits: 4, type: "lab" },
        ],
      },
    ],
  },
  {
    degree: "B.Sc (Physical Sciences)",
    stream: "mpc",
    ...UGC,
    semesters: [
      {
        semester: 1,
        subjects: [
          { code: "PH101", name: "Mechanics", credits: 4, type: "theory" },
          { code: "CH101", name: "Atomic Structure, Bonding and Aliphatic Hydrocarbons", credits: 4, type: "theory" },
          { code: "MA101", name: "Differential Calculus", credits: 4, type: "theory" },
          { code: "PH102", name: "Mechanics Lab", credits: 2, type: "lab" },
          { code: "CH102", name: "Chemistry Lab I", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 2,
        subjects: [
          { code: "PH201", name: "Electricity and Magnetism", credits: 4, type: "theory" },
          { code: "CH201", name: "Chemical Thermodynamics and States of Matter", credits: 4, type: "theory" },
          { code: "MA201", name: "Differential Equations", credits: 4, type: "theory" },
          { code: "PH202", name: "Electricity and Magnetism Lab", credits: 2, type: "lab" },
          { code: "CH202", name: "Chemistry Lab II", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 3,
        subjects: [
          { code: "PH301", name: "Thermal Physics and Statistical Mechanics", credits: 4, type: "theory" },
          { code: "CH301", name: "Solutions, Electrochemistry and Functional Group Organic Chemistry", credits: 4, type: "theory" },
          { code: "MA301", name: "Real Analysis", credits: 4, type: "theory" },
          { code: "PH302", name: "Thermal Physics Lab", credits: 2, type: "lab" },
          { code: "CH302", name: "Chemistry Lab III", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 4,
        subjects: [
          { code: "PH401", name: "Waves and Optics", credits: 4, type: "theory" },
          { code: "CH401", name: "Coordination Chemistry and Organometallics", credits: 4, type: "theory" },
          { code: "MA401", name: "Algebra", credits: 4, type: "theory" },
          { code: "PH402", name: "Waves and Optics Lab", credits: 2, type: "lab" },
          { code: "CH402", name: "Chemistry Lab IV", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 5,
        subjects: [
          { code: "PH501", name: "Elements of Modern Physics", credits: 4, type: "theory" },
          { code: "PH502", name: "Quantum Mechanics", credits: 4, type: "theory" },
          { code: "CH5XX", name: "Discipline Specific Elective — Chemistry", credits: 4, type: "elective" },
          { code: "PH503", name: "Modern Physics Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 6,
        subjects: [
          { code: "PH601", name: "Solid State Physics", credits: 4, type: "theory" },
          { code: "PH602", name: "Nuclear and Particle Physics", credits: 4, type: "theory" },
          { code: "MA6XX", name: "Discipline Specific Elective — Mathematics", credits: 4, type: "elective" },
          { code: "PS699", name: "Dissertation / Project", credits: 4, type: "lab" },
        ],
      },
    ],
  },
  {
    degree: "B.Sc (Life Sciences)",
    stream: "bipc",
    ...UGC,
    semesters: [
      {
        semester: 1,
        subjects: [
          { code: "BO101", name: "Biodiversity (Microbes, Algae, Fungi and Archegoniate)", credits: 4, type: "theory" },
          { code: "ZO101", name: "Animal Diversity — Non-chordates", credits: 4, type: "theory" },
          { code: "CH101", name: "Atomic Structure, Bonding and Organic Chemistry", credits: 4, type: "theory" },
          { code: "BO102", name: "Botany Lab I", credits: 2, type: "lab" },
          { code: "ZO102", name: "Zoology Lab I", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 2,
        subjects: [
          { code: "BO201", name: "Plant Ecology and Taxonomy", credits: 4, type: "theory" },
          { code: "ZO201", name: "Animal Diversity — Chordates", credits: 4, type: "theory" },
          { code: "CH201", name: "Chemical Bonding, Thermodynamics and Functional Groups", credits: 4, type: "theory" },
          { code: "BO202", name: "Botany Lab II", credits: 2, type: "lab" },
          { code: "ZO202", name: "Zoology Lab II", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 3,
        subjects: [
          { code: "BO301", name: "Plant Anatomy and Embryology", credits: 4, type: "theory" },
          { code: "ZO301", name: "Physiology and Biochemistry of Animals", credits: 4, type: "theory" },
          { code: "CH301", name: "Solutions, Electrochemistry and Coordination Chemistry", credits: 4, type: "theory" },
          { code: "BO302", name: "Botany Lab III", credits: 2, type: "lab" },
          { code: "ZO302", name: "Zoology Lab III", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 4,
        subjects: [
          { code: "BO401", name: "Plant Physiology and Metabolism", credits: 4, type: "theory" },
          { code: "ZO401", name: "Genetics and Evolutionary Biology", credits: 4, type: "theory" },
          { code: "CH401", name: "Biomolecules and Organic Spectroscopy", credits: 4, type: "theory" },
          { code: "BO402", name: "Plant Physiology Lab", credits: 2, type: "lab" },
          { code: "ZO402", name: "Genetics Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 5,
        subjects: [
          { code: "BO501", name: "Molecular Biology and Biotechnology", credits: 4, type: "theory" },
          { code: "ZO501", name: "Immunology and Developmental Biology", credits: 4, type: "theory" },
          { code: "LS5XX", name: "Discipline Specific Elective I", credits: 4, type: "elective" },
          { code: "LS501", name: "Molecular Biology Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 6,
        subjects: [
          { code: "BO601", name: "Economic Botany and Plant Biotechnology", credits: 4, type: "theory" },
          { code: "ZO601", name: "Applied Zoology and Ecology", credits: 4, type: "theory" },
          { code: "LS6XX", name: "Discipline Specific Elective II", credits: 4, type: "elective" },
          { code: "LS699", name: "Dissertation / Project", credits: 4, type: "lab" },
        ],
      },
    ],
  },
  {
    degree: "BA LLB",
    stream: "cec",
    ...BCI,
    semesters: [
      {
        semester: 1,
        subjects: [
          { code: "LW101", name: "Legal Method", credits: 4, type: "theory" },
          { code: "LW102", name: "Law of Contract", credits: 4, type: "theory" },
          { code: "LW103", name: "Law of Tort including MV Accident and Consumer Protection", credits: 4, type: "theory" },
          { code: "PS101", name: "Political Science I", credits: 4, type: "theory" },
          { code: "EN101", name: "English I", credits: 3, type: "theory" },
        ],
      },
      {
        semester: 2,
        subjects: [
          { code: "LW201", name: "Special Contract", credits: 4, type: "theory" },
          { code: "LW202", name: "Constitutional Law I", credits: 4, type: "theory" },
          { code: "LW203", name: "Family Law I", credits: 4, type: "theory" },
          { code: "SO201", name: "Sociology I", credits: 4, type: "theory" },
          { code: "EN201", name: "English II", credits: 3, type: "theory" },
        ],
      },
      {
        semester: 3,
        subjects: [
          { code: "LW301", name: "Constitutional Law II", credits: 4, type: "theory" },
          { code: "LW302", name: "Family Law II", credits: 4, type: "theory" },
          { code: "LW303", name: "Law of Crimes I — Penal Code", credits: 4, type: "theory" },
          { code: "PS301", name: "Political Science II", credits: 4, type: "theory" },
          { code: "HS301", name: "History of Legal Institutions", credits: 3, type: "theory" },
        ],
      },
      {
        semester: 4,
        subjects: [
          { code: "LW401", name: "Law of Crimes II — Criminal Procedure", credits: 4, type: "theory" },
          { code: "LW402", name: "Law of Evidence", credits: 4, type: "theory" },
          { code: "LW403", name: "Property Law", credits: 4, type: "theory" },
          { code: "SO401", name: "Sociology II", credits: 4, type: "theory" },
          { code: "EC401", name: "Economics I", credits: 3, type: "theory" },
        ],
      },
      {
        semester: 5,
        subjects: [
          { code: "LW501", name: "Jurisprudence", credits: 4, type: "theory" },
          { code: "LW502", name: "Administrative Law", credits: 4, type: "theory" },
          { code: "LW503", name: "Labour and Industrial Law I", credits: 4, type: "theory" },
          { code: "LW504", name: "Environmental Law", credits: 4, type: "theory" },
          { code: "EC501", name: "Economics II", credits: 3, type: "theory" },
        ],
      },
      {
        semester: 6,
        subjects: [
          { code: "LW601", name: "Public International Law", credits: 4, type: "theory" },
          { code: "LW602", name: "Company Law", credits: 4, type: "theory" },
          { code: "LW603", name: "Labour and Industrial Law II", credits: 4, type: "theory" },
          { code: "LW604", name: "Civil Procedure Code and Limitation Act", credits: 4, type: "theory" },
          { code: "LW6XX", name: "Optional I — Human Rights Law", credits: 3, type: "elective" },
        ],
      },
      {
        semester: 7,
        subjects: [
          { code: "LW701", name: "Principles of Taxation Law", credits: 4, type: "theory" },
          { code: "LW702", name: "Intellectual Property Law", credits: 4, type: "theory" },
          { code: "LW703", name: "Interpretation of Statutes", credits: 3, type: "theory" },
          { code: "LW704", name: "Clinical I — Drafting, Pleading and Conveyance", credits: 4, type: "lab" },
          { code: "LW7XX", name: "Optional II", credits: 3, type: "elective" },
        ],
      },
      {
        semester: 8,
        subjects: [
          { code: "LW801", name: "Clinical II — Alternate Dispute Resolution", credits: 4, type: "lab" },
          { code: "LW8XX", name: "Optional III — Cyber Law", credits: 4, type: "elective" },
          { code: "LW8XY", name: "Optional IV — Banking and Insurance Law", credits: 4, type: "elective" },
          { code: "LW802", name: "Competition Law", credits: 3, type: "theory" },
        ],
      },
      {
        semester: 9,
        subjects: [
          { code: "LW901", name: "Clinical III — Professional Ethics and Accounting", credits: 4, type: "lab" },
          { code: "LW902", name: "Clinical IV — Moot Court Exercise and Internship", credits: 4, type: "lab" },
          { code: "LW9XX", name: "Optional V — Land Laws", credits: 4, type: "elective" },
          { code: "LW903", name: "Legal Aid and Clinical Legal Education", credits: 3, type: "lab" },
        ],
      },
      {
        semester: 10,
        subjects: [
          { code: "LW10XX", name: "Optional VI", credits: 4, type: "elective" },
          { code: "LW1001", name: "Dissertation", credits: 6, type: "lab" },
          { code: "LW1099", name: "Internship (BCI mandatory)", credits: 4, type: "lab" },
        ],
      },
    ],
  },
];

export const collegeSyllabi: CollegeSyllabus[] = [...coreCollegeSyllabi, ...extraCollegeSyllabi];
