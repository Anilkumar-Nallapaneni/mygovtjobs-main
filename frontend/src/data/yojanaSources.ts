export type YojanaSource = {
  id: string
  title: string
  ministry: string
  url: string
  description: string
  category: 'welfare' | 'insurance' | 'housing' | 'farmer' | 'women' | 'youth' | 'health' | 'skill'
}

export const YOJANA_SOURCES: YojanaSource[] = [
  {
    id: 'pm-kisan',
    title: 'PM Kisan Samman Nidhi',
    ministry: 'Ministry of Agriculture',
    url: 'https://pmkisan.gov.in/',
    description: 'Rs 6,000/year to eligible landholding farmer families.',
    category: 'farmer',
  },
  {
    id: 'pm-ujjwala',
    title: 'PM Ujjwala Yojana',
    ministry: 'Ministry of Petroleum',
    url: 'https://pmuy.gov.in/',
    description: 'LPG connections for women from BPL households.',
    category: 'women',
  },
  {
    id: 'ayushman-bharat',
    title: 'Ayushman Bharat PM-JAY',
    ministry: 'National Health Authority',
    url: 'https://pmjay.gov.in/',
    description: 'Health cover of Rs 5 lakh per family per year for 55 crore beneficiaries.',
    category: 'health',
  },
  {
    id: 'pm-awas-urban',
    title: 'PM Awas Yojana (Urban)',
    ministry: 'Ministry of Housing & Urban Affairs',
    url: 'https://pmaymis.gov.in/',
    description: 'Housing for All — urban housing subsidy scheme.',
    category: 'housing',
  },
  {
    id: 'pm-awas-gramin',
    title: 'PM Awas Yojana (Gramin)',
    ministry: 'Ministry of Rural Development',
    url: 'https://pmayg.nic.in/',
    description: 'Housing for All — rural housing subsidy scheme.',
    category: 'housing',
  },
  {
    id: 'pmjby',
    title: 'PM Jeevan Jyoti Bima Yojana',
    ministry: 'Ministry of Finance',
    url: 'https://jansuraksha.gov.in/',
    description: 'Rs 2 lakh life insurance at Rs 436/year.',
    category: 'insurance',
  },
  {
    id: 'pmsby',
    title: 'PM Suraksha Bima Yojana',
    ministry: 'Ministry of Finance',
    url: 'https://jansuraksha.gov.in/',
    description: 'Rs 2 lakh accidental insurance at Rs 20/year.',
    category: 'insurance',
  },
  {
    id: 'apy',
    title: 'Atal Pension Yojana',
    ministry: 'PFRDA',
    url: 'https://npscra.nsdl.co.in/scheme-details.php',
    description: 'Guaranteed monthly pension of Rs 1,000–5,000 for unorganised sector workers.',
    category: 'welfare',
  },
  {
    id: 'pm-svanidhi',
    title: 'PM SVANidhi',
    ministry: 'Ministry of Housing & Urban Affairs',
    url: 'https://pmsvanidhi.mohua.gov.in/',
    description: 'Working capital loans up to Rs 50,000 for street vendors.',
    category: 'welfare',
  },
  {
    id: 'pmkvy',
    title: 'PM Kaushal Vikas Yojana',
    ministry: 'Ministry of Skill Development',
    url: 'https://www.pmkvyofficial.org/',
    description: 'Free short-term skill training and certification.',
    category: 'skill',
  },
  {
    id: 'ncs',
    title: 'National Career Service',
    ministry: 'Ministry of Labour & Employment',
    url: 'https://www.ncs.gov.in/',
    description: 'Job search, career counselling, apprenticeship listings.',
    category: 'youth',
  },
  {
    id: 'sukanya',
    title: 'Sukanya Samriddhi Yojana',
    ministry: 'Ministry of Finance',
    url: 'https://www.indiapost.gov.in/',
    description: 'Small savings scheme for a girl child with attractive interest rate.',
    category: 'women',
  },
]
