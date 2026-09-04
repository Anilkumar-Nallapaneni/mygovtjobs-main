import type { CategoryId } from '@/data/categories'
import { STATES } from '@/data/states'

/** Factual hub copy — no traffic or ranking claims. */
const BOARD_SEO_BODY: Record<CategoryId, string> = {
  upsc:
    'The Union Public Service Commission publishes Civil Services and other central recruitments on upsc.gov.in. This hub lists live UPSC notifications from that official source only — apply links and PDFs stay on the Commission site.',
  ssc:
    'Staff Selection Commission recruitments (CGL, CHSL, MTS, GD, and others) are notified on ssc.gov.in / ssc.nic.in. Live Govt Jobs surfaces those official notices here so you can open the board portal before filling any form.',
  railways:
    'Railway Recruitment Boards publish CEN notifications, CEN-wise vacancies, and apply windows on the regional RRB websites. This page collects live railway recruitments from those .gov.in hosts.',
  banking:
    'IBPS, SBI, RBI, and public-sector banks publish officer and clerk recruitments on their official career pages. Listings here link to those bank or IBPS portals — never to third-party form mirrors.',
  police:
    'State police and CAPF recruitments (constable, SI, and specialised cadres) are notified on official police or PSC websites. Check domicile, physical, and age rules in the PDF before applying.',
  teaching:
    'Teaching and education recruitments include CTET, KVS, NVS, state TET, and university faculty notices. Each card points to the recruiting board or university .gov.in / .edu career page.',
  defence:
    'Defence civilian and service-related recruitments appear on indiannavy.nic.in, joinindianarmy.nic.in, and related official hosts. Live Govt Jobs does not collect application fees.',
  psu:
    'Public sector undertakings (ISRO, DRDO, IOCL, ports, and others) advertise on their career sites. This hub shows live PSU notifications with official apply URLs only.',
  health:
    'Health-sector government jobs include NHM, ESIC, AIIMS, and state health directorate notices. Verify registration and internship rules in the official PDF.',
  engineering:
    'Engineering posts in railways, PWDs, PSUs, and state services are listed from official notifications. GATE or diploma requirements are those stated by the recruiting body.',
  state:
    'State Public Service Commissions and department recruitments are published on each state PSC or e-recruitment portal. This hub groups those official state listings.',
}

function stateSeoBody(name: string): string {
  return `${name} government jobs include PSC, police, health, and department notifications published on official state portals. Live Govt Jobs links only to those .gov.in sources — confirm eligibility and last date on the recruiting body’s website.`
}

const STATE_SEO_BODY: Record<string, string> = Object.fromEntries(
  STATES.map((state) => [state.id, stateSeoBody(state.n)])
)

export function boardSeoBody(categoryId: string | null | undefined): string {
  if (!categoryId) return ''
  return BOARD_SEO_BODY[categoryId as CategoryId] || ''
}

export function stateSeoBodyForId(stateId: string | null | undefined): string {
  if (!stateId) return ''
  return STATE_SEO_BODY[stateId] || ''
}

