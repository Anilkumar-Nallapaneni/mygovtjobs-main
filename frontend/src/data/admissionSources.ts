export type AdmissionSource = {
  id: string
  title: string
  agency: string
  url: string
  description: string
  category: 'engineering' | 'medical' | 'law' | 'university' | 'management' | 'design' | 'other'
}

export const ADMISSION_SOURCES: AdmissionSource[] = [
  {
    id: 'jee-main',
    title: 'JEE Main',
    agency: 'National Testing Agency',
    url: 'https://jeemain.nta.nic.in/',
    description: 'Joint Entrance Examination for engineering admissions to NITs, IIITs, GFTIs.',
    category: 'engineering',
  },
  {
    id: 'jee-advanced',
    title: 'JEE Advanced',
    agency: 'IIT (rotating)',
    url: 'https://jeeadv.ac.in/',
    description: 'Entrance for the 23 IITs. Only JEE Main top rankers may apply.',
    category: 'engineering',
  },
  {
    id: 'neet-ug',
    title: 'NEET UG',
    agency: 'National Testing Agency',
    url: 'https://neet.nta.nic.in/',
    description: 'National Eligibility cum Entrance Test for MBBS/BDS admissions.',
    category: 'medical',
  },
  {
    id: 'neet-pg',
    title: 'NEET PG',
    agency: 'National Board of Examinations',
    url: 'https://nbe.edu.in/',
    description: 'Postgraduate medical entrance for MD/MS/PG Diploma.',
    category: 'medical',
  },
  {
    id: 'cuet-ug',
    title: 'CUET UG',
    agency: 'National Testing Agency',
    url: 'https://cuet.nta.nic.in/',
    description: 'Common University Entrance Test for undergrad admissions to 45+ central universities.',
    category: 'university',
  },
  {
    id: 'cuet-pg',
    title: 'CUET PG',
    agency: 'National Testing Agency',
    url: 'https://cuet.nta.nic.in/',
    description: 'Central Universities PG entrance.',
    category: 'university',
  },
  {
    id: 'clat',
    title: 'CLAT',
    agency: 'Consortium of NLUs',
    url: 'https://consortiumofnlus.ac.in/',
    description: 'Common Law Admission Test for the 22 National Law Universities.',
    category: 'law',
  },
  {
    id: 'cat',
    title: 'CAT',
    agency: 'IIM (rotating)',
    url: 'https://iimcat.ac.in/',
    description: 'Common Admission Test for the 21 IIMs and other B-schools.',
    category: 'management',
  },
  {
    id: 'nid-dat',
    title: 'NID DAT',
    agency: 'National Institute of Design',
    url: 'https://admissions.nid.edu/',
    description: 'Design Aptitude Test for NID admissions.',
    category: 'design',
  },
  {
    id: 'nift',
    title: 'NIFT',
    agency: 'National Institute of Fashion Technology',
    url: 'https://www.nift.ac.in/',
    description: 'Entrance for NIFT undergraduate and postgraduate programmes.',
    category: 'design',
  },
  {
    id: 'gate',
    title: 'GATE',
    agency: 'IIT/IISc (rotating)',
    url: 'https://gate.iitb.ac.in/',
    description: 'Graduate Aptitude Test in Engineering — for M.Tech, PSU jobs, PhD.',
    category: 'engineering',
  },
  {
    id: 'ugc-net',
    title: 'UGC NET',
    agency: 'National Testing Agency',
    url: 'https://ugcnet.nta.nic.in/',
    description: 'Eligibility test for Assistant Professor / JRF in Indian universities.',
    category: 'university',
  },
]
