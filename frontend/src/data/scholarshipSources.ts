export type ScholarshipSource = {
  id: string
  title: string
  agency: string
  url: string
  description: string
  category: 'central' | 'state' | 'minority' | 'women' | 'phd' | 'international'
}

export const SCHOLARSHIP_SOURCES: ScholarshipSource[] = [
  {
    id: 'nsp',
    title: 'National Scholarship Portal',
    agency: 'Ministry of Electronics & IT',
    url: 'https://scholarships.gov.in/',
    description: 'Single-window portal for 100+ central and state scholarship schemes.',
    category: 'central',
  },
  {
    id: 'pm-yasasvi',
    title: 'PM YASASVI',
    agency: 'Ministry of Social Justice',
    url: 'https://yet.nta.ac.in/',
    description: 'Scholarship for top OBC / EBC / DNT students in classes 9 & 11.',
    category: 'central',
  },
  {
    id: 'inspire',
    title: 'INSPIRE Scholarship',
    agency: 'Department of Science & Technology',
    url: 'https://online-inspire.gov.in/',
    description: 'Rs 80,000/yr for top 1% students pursuing natural/basic sciences.',
    category: 'central',
  },
  {
    id: 'up-scholarship',
    title: 'UP Scholarship',
    agency: 'Government of Uttar Pradesh',
    url: 'https://scholarship.up.gov.in/',
    description: 'Pre-Matric and Post-Matric scholarships for UP residents.',
    category: 'state',
  },
  {
    id: 'e-district-bihar',
    title: 'Bihar Post-Matric Scholarship',
    agency: 'Government of Bihar',
    url: 'https://pmsonline.bih.nic.in/',
    description: 'Post-matric scholarship for SC/ST/OBC students in Bihar.',
    category: 'state',
  },
  {
    id: 'mma-tn',
    title: 'Tamil Nadu Scholarship',
    agency: 'Government of Tamil Nadu',
    url: 'https://tnscholarship.tn.gov.in/',
    description: 'State scholarship for SC/ST and minority students.',
    category: 'state',
  },
  {
    id: 'maulana-azad',
    title: 'Maulana Azad National Fellowship',
    agency: 'Ministry of Minority Affairs',
    url: 'https://minorityaffairs.gov.in/',
    description: 'Financial assistance for minority students pursuing M.Phil/PhD.',
    category: 'minority',
  },
  {
    id: 'pragati',
    title: 'AICTE Pragati Scholarship',
    agency: 'AICTE',
    url: 'https://www.aicte-india.org/',
    description: 'Rs 50,000/yr for girl students in AICTE-approved technical courses.',
    category: 'women',
  },
  {
    id: 'saksham',
    title: 'AICTE Saksham Scholarship',
    agency: 'AICTE',
    url: 'https://www.aicte-india.org/',
    description: 'Rs 50,000/yr for specially-abled students in technical courses.',
    category: 'women',
  },
  {
    id: 'ugc-jrf',
    title: 'UGC JRF Fellowship',
    agency: 'University Grants Commission',
    url: 'https://www.ugc.ac.in/',
    description: 'Rs 37,000/mo for JRF candidates pursuing PhD.',
    category: 'phd',
  },
  {
    id: 'csir-jrf',
    title: 'CSIR JRF Fellowship',
    agency: 'Council of Scientific & Industrial Research',
    url: 'https://csirhrdg.res.in/',
    description: 'Junior Research Fellowship for science stream PhD.',
    category: 'phd',
  },
  {
    id: 'nos-ovs',
    title: 'National Overseas Scholarship',
    agency: 'Ministry of Social Justice',
    url: 'https://nosmsje.gov.in/',
    description: 'Overseas Masters/PhD funding for SC/ST/DNT scholars.',
    category: 'international',
  },
]
