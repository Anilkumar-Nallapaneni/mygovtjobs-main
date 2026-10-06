export const LAST_VERIFIED = "2026-09-01";

export const officialPortals = [
  { id: "nta", name: "National Testing Agency", exams: "JEE Main, NEET, CUET", url: "https://nta.ac.in/" },
  { id: "jee-main", name: "JEE Main", exams: "JEE Main", url: "https://jeemain.nta.nic.in/" },
  { id: "jee-advanced", name: "JEE Advanced", exams: "JEE Advanced", url: "https://jeeadv.ac.in/" },
  { id: "neet", name: "NEET UG", exams: "NEET UG", url: "https://neet.nta.nic.in/" },
  { id: "cuet", name: "CUET UG", exams: "CUET", url: "https://exams.nta.ac.in/CUET-UG/" },
  { id: "ncert", name: "NCERT textbooks", exams: "Class I-XII textbooks", url: "https://ncert.nic.in/textbook.php" },
  { id: "upsc", name: "UPSC previous papers", exams: "NDA and UPSC CSE", url: "https://www.upsc.gov.in/examinations/previous-question-papers" },
  { id: "clat", name: "Consortium of NLUs", exams: "CLAT", url: "https://consortiumofnlus.ac.in/" },
  { id: "bitsat", name: "BITS Admissions", exams: "BITSAT", url: "https://www.bitsadmission.com/" },
  { id: "tg-eapcet", name: "TG EAPCET", exams: "TG EAPCET", url: "https://eapcet.tgche.ac.in/" },
  { id: "ap-eapcet", name: "AP EAPCET", exams: "AP EAPCET", url: "https://cets.apsche.ap.gov.in/" },
  { id: "tgbie", name: "Telangana Intermediate (TGBIE)", exams: "TS Inter MPC, BiPC, MEC, CEC, HEC", url: "https://tgbie.cgg.gov.in/" },
  { id: "bieap", name: "Andhra Pradesh Intermediate (BIEAP)", exams: "AP Inter MPC, BiPC, MEC, CEC", url: "https://bie.ap.gov.in/" },
  { id: "icai", name: "ICAI", exams: "CA Foundation", url: "https://www.icai.org/" },
  { id: "ipmat", name: "IIM Indore IPMAT", exams: "IPMAT", url: "https://www.iimidr.ac.in/" },
  { id: "aicte", name: "AICTE", exams: "B.Tech model curriculum", url: "https://www.aicte-india.org/" },
  { id: "nmc", name: "National Medical Commission", exams: "MBBS CBME curriculum", url: "https://www.nmc.org.in/information-desk/for-colleges/ug-curriculum/" },
  { id: "ugc", name: "University Grants Commission", exams: "B.Com and B.Sc model curriculum", url: "https://www.ugc.gov.in/" },
  { id: "bci", name: "Bar Council of India", exams: "BA LLB / LLB", url: "https://www.barcouncilofindia.org/" },
  { id: "gate", name: "GATE 2027 (IIT Madras)", exams: "GATE", url: "https://gate2027.iitm.ac.in/" },
  { id: "cat", name: "CAT (IIMs)", exams: "CAT", url: "https://iimcat.ac.in/" },
  { id: "nirf", name: "NIRF India Rankings", exams: "College ranking and median salary", url: "https://www.nirfindia.org/" },
  { id: "dgt", name: "Directorate General of Training", exams: "ITI Craftsmen Training Scheme", url: "https://www.dgt.gov.in/en/CTS" },
  { id: "pci", name: "Pharmacy Council of India", exams: "B.Pharm", url: "https://www.pci.nic.in/" },
  { id: "inc", name: "Indian Nursing Council", exams: "B.Sc Nursing", url: "https://indiannursingcouncil.org/" },
  { id: "ugc-net", name: "UGC NET (NTA)", exams: "UGC NET", url: "https://ugcnet.nta.nic.in/" },
];

export const examOfficialUrls = {
  "JEE Main": "https://jeemain.nta.nic.in/",
  "JEE Advanced": "https://jeeadv.ac.in/",
  NEET: "https://neet.nta.nic.in/",
  BITSAT: "https://www.bitsadmission.com/",
  EAMCET: "https://eapcet.tgche.ac.in/",
  NDA: "https://upsc.gov.in/",
  CLAT: "https://consortiumofnlus.ac.in/",
  "CA Foundation": "https://www.icai.org/",
  IPMAT: "https://www.iimidr.ac.in/",
  CUET: "https://exams.nta.ac.in/CUET-UG/",
  GATE: "https://gate2027.iitm.ac.in/",
  CAT: "https://iimcat.ac.in/",
  "UPSC CSE": "https://www.upsc.gov.in/",
  "NEET PG": "https://natboard.edu.in/",
};

export const examPapersUrls = {
  "JEE Main": "https://jeemain.nta.nic.in/",
  "JEE Advanced": "https://jeeadv.ac.in/",
  NEET: "https://neet.nta.nic.in/",
  BITSAT: "https://www.bitsadmission.com/",
  EAMCET: "https://eapcet.tgche.ac.in/",
  NDA: "https://www.upsc.gov.in/examinations/previous-question-papers",
  CLAT: "https://consortiumofnlus.ac.in/",
  "CA Foundation": "https://www.icai.org/",
  IPMAT: "https://www.iimidr.ac.in/",
  CUET: "https://exams.nta.ac.in/CUET-UG/",
  GATE: "https://gate2027.iitm.ac.in/download",
  CAT: "https://iimcat.ac.in/",
  "UPSC CSE": "https://www.upsc.gov.in/examinations/previous-question-papers",
  "NEET PG": "https://natboard.edu.in/",
};

export const ncertBookUrls = {
  "NCERT Physics Class 11": "https://ncert.nic.in/textbook.php?keph1=0-8",
  "NCERT Physics Class 12": "https://ncert.nic.in/textbook.php?leph1=0-8",
  "NCERT Chemistry Class 11": "https://ncert.nic.in/textbook.php?kech1=0-7",
  "NCERT Chemistry Class 12": "https://ncert.nic.in/textbook.php?lech1=0-9",
  "NCERT Maths Class 11": "https://ncert.nic.in/textbook.php?kemh1=0-16",
  "NCERT Maths Class 12": "https://ncert.nic.in/textbook.php?lemh1=0-6",
  "NCERT Biology Class 11": "https://ncert.nic.in/textbook.php?kebo1=0-22",
  "NCERT Biology Class 12": "https://ncert.nic.in/textbook.php?lebo1=0-16",
  "NCERT Macroeconomics Class 12": "https://ncert.nic.in/textbook.php?leec2=0-6",
  "NCERT Indian Economic Development": "https://ncert.nic.in/textbook.php?leec1=0-10",
  "NCERT Business Studies Class 11 & 12": "https://ncert.nic.in/textbook.php?kebs1=0-11",
  "NCERT Indian Constitution at Work": "https://ncert.nic.in/textbook.php?keps1=0-10",
  "NCERT Political Science Theory": "https://ncert.nic.in/textbook.php?keps2=0-10",
  "NCERT Themes in World History Class 11": "https://ncert.nic.in/textbook.php?kewh1=0-11",
  "NCERT Themes in Indian History Part I": "https://ncert.nic.in/textbook.php?lehs1=0-4",
};

export const officialStudyUrls = {
  "GATE 2027 official website (IIT Madras)": "https://gate2027.iitm.ac.in/",
  "AICTE model undergraduate curriculum": "https://www.aicte-india.org/",
  "CAT official website (IIMs)": "https://iimcat.ac.in/",
  "UPSC official examinations page": "https://www.upsc.gov.in/examinations",
  "NBEMS / NEET PG official portal": "https://natboard.edu.in/",
  "NMC UG curriculum page": "https://www.nmc.org.in/information-desk/for-colleges/ug-curriculum/",
  "UGC NET official NTA page": "https://ugcnet.nta.nic.in/",
  "UGC regulations hub": "https://www.ugc.gov.in/",
};

export function getExamOfficialUrl(examName) {
  return examOfficialUrls[examName] || "";
}

export function getExamPapersUrl(examName, paperOfficialUrl) {
  return paperOfficialUrl || examPapersUrls[examName] || getExamOfficialUrl(examName);
}

export function getNcertBookUrl(title) {
  return ncertBookUrls[title];
}

export function getOfficialStudyUrl(title) {
  return ncertBookUrls[title] || officialStudyUrls[title];
}

export function displayHost(url) {
  try {
    return new globalThis.URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, "");
  }
}
