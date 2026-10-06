import { LAST_VERIFIED } from "./officialSources";
import type { CollegeSyllabus } from "./educationTypes";

const AICTE = {
  sourceName: "AICTE model undergraduate curriculum",
  sourceUrl: "https://www.aicte-india.org/",
  lastVerified: LAST_VERIFIED,
};

const UGC = {
  sourceName: "UGC CBCS / LOCF model curriculum",
  sourceUrl: "https://www.ugc.gov.in/",
  lastVerified: LAST_VERIFIED,
};

const PCI = {
  sourceName: "Pharmacy Council of India",
  sourceUrl: "https://www.pci.nic.in/",
  lastVerified: LAST_VERIFIED,
};

const INC = {
  sourceName: "Indian Nursing Council",
  sourceUrl: "https://indiannursingcouncil.org/",
  lastVerified: LAST_VERIFIED,
};

export const extraCollegeSyllabi: CollegeSyllabus[] = [
  {
    degree: "B.Tech Mechanical",
    stream: "mpc",
    ...AICTE,
    semesters: [
      {
        semester: 1,
        subjects: [
          { code: "MA101", name: "Engineering Mathematics I", credits: 4, type: "theory" },
          { code: "PH101", name: "Engineering Physics", credits: 4, type: "theory" },
          { code: "ME101", name: "Engineering Graphics", credits: 3, type: "theory" },
          { code: "ME102", name: "Workshop Practice", credits: 2, type: "lab" },
          { code: "CS101", name: "Programming for Engineers", credits: 3, type: "theory" },
        ],
      },
      {
        semester: 2,
        subjects: [
          { code: "MA102", name: "Engineering Mathematics II", credits: 4, type: "theory" },
          { code: "CH101", name: "Engineering Chemistry", credits: 4, type: "theory" },
          { code: "ME201", name: "Engineering Mechanics", credits: 4, type: "theory" },
          { code: "ME202", name: "Material Science", credits: 3, type: "theory" },
          { code: "CH102", name: "Chemistry Lab", credits: 1, type: "lab" },
        ],
      },
      {
        semester: 3,
        subjects: [
          { code: "ME301", name: "Strength of Materials", credits: 4, type: "theory" },
          { code: "ME302", name: "Thermodynamics", credits: 4, type: "theory" },
          { code: "ME303", name: "Manufacturing Processes I", credits: 3, type: "theory" },
          { code: "ME304", name: "Fluid Mechanics", credits: 4, type: "theory" },
          { code: "ME305", name: "SOM Lab", credits: 1, type: "lab" },
        ],
      },
      {
        semester: 4,
        subjects: [
          { code: "ME401", name: "Kinematics of Machinery", credits: 4, type: "theory" },
          { code: "ME402", name: "Heat Transfer", credits: 4, type: "theory" },
          { code: "ME403", name: "Manufacturing Processes II", credits: 3, type: "theory" },
          { code: "ME404", name: "Machine Drawing", credits: 2, type: "lab" },
          { code: "ME405", name: "Fluid Mechanics Lab", credits: 1, type: "lab" },
        ],
      },
      {
        semester: 5,
        subjects: [
          { code: "ME501", name: "Dynamics of Machinery", credits: 4, type: "theory" },
          { code: "ME502", name: "Design of Machine Elements", credits: 4, type: "theory" },
          { code: "ME503", name: "IC Engines and Propulsion", credits: 3, type: "theory" },
          { code: "ME504", name: "Metrology and Measurements", credits: 3, type: "theory" },
          { code: "ME505", name: "CAD Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 6,
        subjects: [
          { code: "ME601", name: "CAD/CAM", credits: 4, type: "theory" },
          { code: "ME602", name: "Refrigeration and Air Conditioning", credits: 3, type: "theory" },
          { code: "ME603", name: "Industrial Engineering", credits: 3, type: "theory" },
          { code: "ME6XX", name: "Professional Elective I", credits: 3, type: "elective" },
          { code: "ME604", name: "Thermal Engineering Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 7,
        subjects: [
          { code: "ME701", name: "Automobile Engineering", credits: 3, type: "theory" },
          { code: "ME702", name: "Power Plant Engineering", credits: 3, type: "theory" },
          { code: "ME7XX", name: "Professional Elective II", credits: 3, type: "elective" },
          { code: "ME799", name: "Mini Project / Internship", credits: 3, type: "lab" },
        ],
      },
      {
        semester: 8,
        subjects: [
          { code: "ME8XX", name: "Professional Elective III", credits: 3, type: "elective" },
          { code: "ME8XY", name: "Open Elective", credits: 3, type: "elective" },
          { code: "ME899", name: "Major Project", credits: 10, type: "lab" },
        ],
      },
    ],
  },
  {
    degree: "B.Tech Civil",
    stream: "mpc",
    ...AICTE,
    semesters: [
      {
        semester: 1,
        subjects: [
          { code: "MA101", name: "Engineering Mathematics I", credits: 4, type: "theory" },
          { code: "PH101", name: "Engineering Physics", credits: 4, type: "theory" },
          { code: "CE101", name: "Engineering Mechanics", credits: 4, type: "theory" },
          { code: "CE102", name: "Engineering Graphics", credits: 3, type: "lab" },
          { code: "CE103", name: "Surveying Field Work I", credits: 1, type: "lab" },
        ],
      },
      {
        semester: 2,
        subjects: [
          { code: "MA102", name: "Engineering Mathematics II", credits: 4, type: "theory" },
          { code: "CE201", name: "Building Materials and Construction", credits: 4, type: "theory" },
          { code: "CE202", name: "Surveying", credits: 4, type: "theory" },
          { code: "CE203", name: "Engineering Geology", credits: 3, type: "theory" },
          { code: "CE204", name: "Material Testing Lab", credits: 1, type: "lab" },
        ],
      },
      {
        semester: 3,
        subjects: [
          { code: "CE301", name: "Strength of Materials", credits: 4, type: "theory" },
          { code: "CE302", name: "Fluid Mechanics", credits: 4, type: "theory" },
          { code: "CE303", name: "Concrete Technology", credits: 3, type: "theory" },
          { code: "CE304", name: "Surveying Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 4,
        subjects: [
          { code: "CE401", name: "Structural Analysis I", credits: 4, type: "theory" },
          { code: "CE402", name: "Hydraulics and Hydraulic Machines", credits: 4, type: "theory" },
          { code: "CE403", name: "Geotechnical Engineering I", credits: 4, type: "theory" },
          { code: "CE404", name: "Hydraulics Lab", credits: 1, type: "lab" },
        ],
      },
      {
        semester: 5,
        subjects: [
          { code: "CE501", name: "Design of RCC Structures", credits: 4, type: "theory" },
          { code: "CE502", name: "Transportation Engineering", credits: 4, type: "theory" },
          { code: "CE503", name: "Environmental Engineering I", credits: 3, type: "theory" },
          { code: "CE504", name: "Geotech Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 6,
        subjects: [
          { code: "CE601", name: "Design of Steel Structures", credits: 4, type: "theory" },
          { code: "CE602", name: "Hydrology and Water Resources", credits: 3, type: "theory" },
          { code: "CE603", name: "Estimation and Costing", credits: 3, type: "theory" },
          { code: "CE6XX", name: "Professional Elective I", credits: 3, type: "elective" },
          { code: "CE604", name: "CAD Lab (Civil)", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 7,
        subjects: [
          { code: "CE701", name: "Foundation Engineering", credits: 3, type: "theory" },
          { code: "CE702", name: "Environmental Engineering II", credits: 3, type: "theory" },
          { code: "CE7XX", name: "Professional Elective II", credits: 3, type: "elective" },
          { code: "CE799", name: "Internship", credits: 3, type: "lab" },
        ],
      },
      {
        semester: 8,
        subjects: [
          { code: "CE8XX", name: "Professional Elective III", credits: 3, type: "elective" },
          { code: "CE899", name: "Major Project", credits: 10, type: "lab" },
        ],
      },
    ],
  },
  {
    degree: "B.Tech EEE",
    stream: "mpc",
    ...AICTE,
    semesters: [
      {
        semester: 1,
        subjects: [
          { code: "MA101", name: "Engineering Mathematics I", credits: 4, type: "theory" },
          { code: "PH101", name: "Engineering Physics", credits: 4, type: "theory" },
          { code: "EE101", name: "Basic Electrical Engineering", credits: 4, type: "theory" },
          { code: "CS101", name: "Programming in C", credits: 3, type: "theory" },
          { code: "EE102", name: "Electrical Workshop", credits: 1, type: "lab" },
        ],
      },
      {
        semester: 2,
        subjects: [
          { code: "MA102", name: "Engineering Mathematics II", credits: 4, type: "theory" },
          { code: "EE201", name: "Network Theory", credits: 4, type: "theory" },
          { code: "EE202", name: "Electronic Devices", credits: 3, type: "theory" },
          { code: "EE203", name: "Electrical Measurements", credits: 3, type: "theory" },
          { code: "EE204", name: "Networks Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 3,
        subjects: [
          { code: "EE301", name: "Electrical Machines I", credits: 4, type: "theory" },
          { code: "EE302", name: "Analog Electronics", credits: 4, type: "theory" },
          { code: "EE303", name: "Electromagnetic Fields", credits: 3, type: "theory" },
          { code: "EE304", name: "Machines Lab I", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 4,
        subjects: [
          { code: "EE401", name: "Electrical Machines II", credits: 4, type: "theory" },
          { code: "EE402", name: "Power Electronics", credits: 4, type: "theory" },
          { code: "EE403", name: "Control Systems", credits: 4, type: "theory" },
          { code: "EE404", name: "Electronics Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 5,
        subjects: [
          { code: "EE501", name: "Power Systems I", credits: 4, type: "theory" },
          { code: "EE502", name: "Microprocessors and Microcontrollers", credits: 3, type: "theory" },
          { code: "EE503", name: "Signals and Systems", credits: 3, type: "theory" },
          { code: "EE504", name: "Power Electronics Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 6,
        subjects: [
          { code: "EE601", name: "Power Systems II", credits: 4, type: "theory" },
          { code: "EE602", name: "Electrical Drives", credits: 3, type: "theory" },
          { code: "EE6XX", name: "Professional Elective I", credits: 3, type: "elective" },
          { code: "EE603", name: "Power Systems Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 7,
        subjects: [
          { code: "EE701", name: "Switchgear and Protection", credits: 3, type: "theory" },
          { code: "EE702", name: "Utilisation of Electrical Energy", credits: 3, type: "theory" },
          { code: "EE7XX", name: "Professional Elective II", credits: 3, type: "elective" },
          { code: "EE799", name: "Mini Project", credits: 3, type: "lab" },
        ],
      },
      {
        semester: 8,
        subjects: [
          { code: "EE8XX", name: "Professional Elective III", credits: 3, type: "elective" },
          { code: "EE899", name: "Major Project", credits: 10, type: "lab" },
        ],
      },
    ],
  },
  {
    degree: "BCA",
    stream: "mpc",
    ...UGC,
    semesters: [
      {
        semester: 1,
        subjects: [
          { code: "CA101", name: "Programming in C", credits: 4, type: "theory" },
          { code: "CA102", name: "Digital Logic", credits: 4, type: "theory" },
          { code: "CA103", name: "Mathematics for Computing", credits: 4, type: "theory" },
          { code: "CA104", name: "C Programming Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 2,
        subjects: [
          { code: "CA201", name: "Data Structures", credits: 4, type: "theory" },
          { code: "CA202", name: "OOP with Java / Python", credits: 4, type: "theory" },
          { code: "CA203", name: "Computer Organisation", credits: 3, type: "theory" },
          { code: "CA204", name: "DS Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 3,
        subjects: [
          { code: "CA301", name: "Database Management Systems", credits: 4, type: "theory" },
          { code: "CA302", name: "Operating Systems", credits: 4, type: "theory" },
          { code: "CA303", name: "Web Technologies", credits: 3, type: "theory" },
          { code: "CA304", name: "DBMS Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 4,
        subjects: [
          { code: "CA401", name: "Computer Networks", credits: 4, type: "theory" },
          { code: "CA402", name: "Software Engineering", credits: 3, type: "theory" },
          { code: "CA403", name: "Design and Analysis of Algorithms", credits: 4, type: "theory" },
          { code: "CA404", name: "Web Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 5,
        subjects: [
          { code: "CA501", name: "Python / Full-stack electives", credits: 4, type: "elective" },
          { code: "CA502", name: "Mobile Application Development", credits: 3, type: "theory" },
          { code: "CA5XX", name: "Open Elective", credits: 3, type: "elective" },
          { code: "CA599", name: "Minor Project", credits: 3, type: "lab" },
        ],
      },
      {
        semester: 6,
        subjects: [
          { code: "CA601", name: "Information Security", credits: 3, type: "theory" },
          { code: "CA6XX", name: "Professional Elective", credits: 3, type: "elective" },
          { code: "CA699", name: "Major Project", credits: 8, type: "lab" },
        ],
      },
    ],
  },
  {
    degree: "B.Pharm",
    stream: "bipc",
    ...PCI,
    semesters: [
      {
        semester: 1,
        subjects: [
          { code: "BP101", name: "Human Anatomy and Physiology I", credits: 4, type: "theory" },
          { code: "BP102", name: "Pharmaceutical Analysis I", credits: 4, type: "theory" },
          { code: "BP103", name: "Pharmaceutics I", credits: 4, type: "theory" },
          { code: "BP104", name: "Pharmaceutical Inorganic Chemistry", credits: 4, type: "theory" },
          { code: "BP105", name: "HAP I Lab", credits: 1, type: "lab" },
        ],
      },
      {
        semester: 2,
        subjects: [
          { code: "BP201", name: "Human Anatomy and Physiology II", credits: 4, type: "theory" },
          { code: "BP202", name: "Pharmaceutical Organic Chemistry I", credits: 4, type: "theory" },
          { code: "BP203", name: "Biochemistry", credits: 4, type: "theory" },
          { code: "BP204", name: "Pathophysiology", credits: 4, type: "theory" },
        ],
      },
      {
        semester: 3,
        subjects: [
          { code: "BP301", name: "Pharmaceutical Organic Chemistry II", credits: 4, type: "theory" },
          { code: "BP302", name: "Physical Pharmaceutics I", credits: 4, type: "theory" },
          { code: "BP303", name: "Pharmaceutical Microbiology", credits: 4, type: "theory" },
          { code: "BP304", name: "Pharmaceutical Engineering", credits: 4, type: "theory" },
        ],
      },
      {
        semester: 4,
        subjects: [
          { code: "BP401", name: "Pharmaceutical Organic Chemistry III", credits: 4, type: "theory" },
          { code: "BP402", name: "Medicinal Chemistry I", credits: 4, type: "theory" },
          { code: "BP403", name: "Physical Pharmaceutics II", credits: 4, type: "theory" },
          { code: "BP404", name: "Pharmacology I", credits: 4, type: "theory" },
          { code: "BP405", name: "Pharmacognosy I", credits: 4, type: "theory" },
        ],
      },
      {
        semester: 5,
        subjects: [
          { code: "BP501", name: "Medicinal Chemistry II", credits: 4, type: "theory" },
          { code: "BP502", name: "Industrial Pharmacy I", credits: 4, type: "theory" },
          { code: "BP503", name: "Pharmacology II", credits: 4, type: "theory" },
          { code: "BP504", name: "Pharmacognosy II", credits: 4, type: "theory" },
        ],
      },
      {
        semester: 6,
        subjects: [
          { code: "BP601", name: "Medicinal Chemistry III", credits: 4, type: "theory" },
          { code: "BP602", name: "Pharmacology III", credits: 4, type: "theory" },
          { code: "BP603", name: "Herbal Drug Technology", credits: 4, type: "theory" },
          { code: "BP604", name: "Biopharmaceutics and Pharmacokinetics", credits: 4, type: "theory" },
        ],
      },
      {
        semester: 7,
        subjects: [
          { code: "BP701", name: "Instrumental Methods of Analysis", credits: 4, type: "theory" },
          { code: "BP702", name: "Industrial Pharmacy II", credits: 4, type: "theory" },
          { code: "BP703", name: "Pharmacy Practice", credits: 4, type: "theory" },
          { code: "BP704", name: "Novel Drug Delivery Systems", credits: 4, type: "theory" },
        ],
      },
      {
        semester: 8,
        subjects: [
          { code: "BP801", name: "Biostatistics and Research Methodology", credits: 4, type: "theory" },
          { code: "BP802", name: "Social and Preventive Pharmacy", credits: 4, type: "theory" },
          { code: "BP8XX", name: "Elective / Project", credits: 6, type: "elective" },
        ],
      },
    ],
  },
  {
    degree: "B.Sc Nursing",
    stream: "bipc",
    ...INC,
    semesters: [
      {
        semester: 1,
        subjects: [
          { code: "NS101", name: "Anatomical and Physiological Basis of Nursing", credits: 6, type: "theory" },
          { code: "NS102", name: "Nursing Foundation I", credits: 6, type: "theory" },
          { code: "NS103", name: "Psychology", credits: 3, type: "theory" },
          { code: "NS104", name: "Foundation Skill Lab", credits: 2, type: "lab" },
        ],
      },
      {
        semester: 2,
        subjects: [
          { code: "NS201", name: "Biochemistry and Nutrition", credits: 4, type: "theory" },
          { code: "NS202", name: "Nursing Foundation II", credits: 6, type: "theory" },
          { code: "NS203", name: "Microbiology", credits: 3, type: "theory" },
          { code: "NS204", name: "Clinical posting — foundations", credits: 4, type: "lab" },
        ],
      },
      {
        semester: 3,
        subjects: [
          { code: "NS301", name: "Medical Surgical Nursing I", credits: 6, type: "theory" },
          { code: "NS302", name: "Pharmacology I", credits: 3, type: "theory" },
          { code: "NS303", name: "Pathology I", credits: 3, type: "theory" },
          { code: "NS304", name: "MSN clinical I", credits: 4, type: "lab" },
        ],
      },
      {
        semester: 4,
        subjects: [
          { code: "NS401", name: "Medical Surgical Nursing II", credits: 6, type: "theory" },
          { code: "NS402", name: "Pharmacology II", credits: 3, type: "theory" },
          { code: "NS403", name: "Professionalism and ethics", credits: 2, type: "theory" },
          { code: "NS404", name: "MSN clinical II", credits: 4, type: "lab" },
        ],
      },
      {
        semester: 5,
        subjects: [
          { code: "NS501", name: "Child Health Nursing", credits: 6, type: "theory" },
          { code: "NS502", name: "Mental Health Nursing", credits: 6, type: "theory" },
          { code: "NS503", name: "Nursing research and statistics intro", credits: 3, type: "theory" },
          { code: "NS504", name: "Paediatric and MH clinical", credits: 4, type: "lab" },
        ],
      },
      {
        semester: 6,
        subjects: [
          { code: "NS601", name: "Midwifery / OBG Nursing", credits: 6, type: "theory" },
          { code: "NS602", name: "Community Health Nursing I", credits: 5, type: "theory" },
          { code: "NS603", name: "OBG and community clinical", credits: 5, type: "lab" },
        ],
      },
      {
        semester: 7,
        subjects: [
          { code: "NS701", name: "Community Health Nursing II", credits: 5, type: "theory" },
          { code: "NS702", name: "Nursing Management and leadership", credits: 4, type: "theory" },
          { code: "NS703", name: "Internship posting I", credits: 6, type: "lab" },
        ],
      },
      {
        semester: 8,
        subjects: [
          { code: "NS801", name: "Integrated internship", credits: 12, type: "lab" },
          { code: "NS802", name: "Research project", credits: 4, type: "lab" },
        ],
      },
    ],
  },
];
