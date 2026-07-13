export type ProfessionSeoSection = {
  id: 'intro' | 'eligibility' | 'recruiters' | 'howToApply'
  heading: string
  paragraphs: string[]
}

function block(
  id: ProfessionSeoSection['id'],
  heading: string,
  paragraphs: string[]
): ProfessionSeoSection {
  return { id, heading, paragraphs }
}

const SEO_BY_SLUG: Record<string, ProfessionSeoSection[]> = {
  medical: [
    block('intro', 'Medical jobs in the government sector', [
      'Medical government recruitment in India spans MBBS doctors, specialists, dental surgeons, paramedics, lab technicians, and allied health staff appointed by central ministries, state health directorates, autonomous hospitals, and public health missions. Unlike private hospital hiring, every post is filled through a written notification published on an official .gov.in portal or a verified hospital career page, with transparent eligibility, age limits, and selection method stated in the PDF.',
      'Live Govt Jobs aggregates these notifications daily from AIIMS, ESIC, NHM, state medical health services, municipal corporations, and PSU medical units. Each card on this page links directly to the original notification or apply portal — we block unofficial aggregators so you never land on a third-party form that charges fees.',
      'Whether you are a fresh MBBS graduate seeking medical officer posts, a specialist eyeing senior resident vacancies, or a paramedic targeting technician cadres, this listing filters live health-sector recruitment matched to medical qualifications and clinical roles.',
    ]),
    block('eligibility', 'Typical eligibility for medical government posts', [
      'Undergraduate medical posts (Medical Officer, Junior Resident) generally require MBBS from an MCI/NMC-recognised college with compulsory rotating internship and permanent registration with a state medical council. Specialist and faculty posts may need MD/MS/DNB or superspeciality degrees with relevant experience years as specified in the advertisement.',
      'Paramedical and allied posts accept diplomas or degrees in nursing, lab technology, radiography, physiotherapy, or pharmacy depending on the post code. Age limits commonly range from 18 to 40 years for general category candidates, with relaxations for SC/ST/OBC, PwBD, and ex-servicemen as per government rules cited in each PDF.',
      'Always verify domicile, internship completion date, and registration certificate requirements in the official notification before applying — state PSC and hospital recruitments differ on these points.',
    ]),
    block('recruiters', 'Top recruiters for medical government jobs', [
      'All India Institute of Medical Sciences (AIIMS) and other institutes of national importance publish faculty, resident, and nursing officer recruitment on their official websites. Employees State Insurance Corporation (ESIC) regularly advertises medical officer and specialist posts for its hospitals across states.',
      'State health departments and directorates of medical education recruit civil surgeons, block medical officers, staff nurses, and technicians through state PSC or direct walk-in drives. National Health Mission (NHM) and Ayushman Bharat units hire contractual and permanent staff for primary health centres and district hospitals.',
      'Defence medical corps, ordnance factory hospitals, railway hospitals, and PSU units (ONGC, Coal India medical services) also release MBBS and specialist vacancies. UPSC conducts combined medical services (CMS) examination for central health service posts.',
    ]),
    block('howToApply', 'How to apply for medical government recruitment', [
      'Open the job card and click through to the official PDF notification. Note the post name, pay level, qualification, age cut-off date, and last date for online application or walk-in interview.',
      'Register on the recruiting board portal (state PSC, AIIMS recruitment cell, ESIC career page, etc.) using a valid email and mobile number. Upload scanned degree certificates, internship completion proof, medical council registration, category certificate, and photograph as per specifications.',
      'Pay the application fee online if applicable, submit the form before the deadline, and download the confirmation page. For walk-in interviews, carry original documents and multiple sets of photocopies. Track admit cards and results on the same official portal — never pay agents claiming guaranteed selection.',
    ]),
  ],
  engineering: [
    block('intro', 'Engineering jobs in government and PSU sector', [
      'Engineering government jobs cover graduate engineer trainees, junior engineers, assistant engineers, and executive posts in public sector undertakings, central ministries, Indian Railways, metro corporations, and state public works departments. Recruitment is merit-based through competitive exams, GATE scores, or direct interviews as stated in each official notification.',
      'This page lists live B.Tech, B.E., and diploma engineering vacancies ingested from official .gov.in and PSU career portals. Every listing resolves to the board that published the advertisement — not job-aggregator mirrors.',
      'Whether you are a fresh graduate targeting PSU trainee posts or an experienced engineer eyeing assistant engineer vacancies in state PWD, filter by deadline and vacancy count then open the original PDF to confirm trade, domicile, and experience rules.',
    ]),
    block('eligibility', 'Eligibility for engineering government recruitment', [
      'Graduate posts typically require B.Tech or B.E. in civil, mechanical, electrical, electronics, or computer science from an AICTE-approved institution. Junior engineer and technician posts often accept three-year diploma in the relevant engineering trade.',
      'Age limits usually fall between 18 and 30–35 years for graduate cadre and up to 40 for experienced executive posts, with category relaxations per government norms. GATE qualification is mandatory for some PSU graduate trainee recruitments; SSC and RRB JE exams have their own syllabus and eligibility charts.',
      'Medical fitness, vision standards, and domicile requirements apply for railway and state engineering posts. Always verify whether the notification is for diploma, degree, or both before paying the application fee.',
    ]),
    block('recruiters', 'Major engineering recruiters', [
      'Public sector undertakings — BHEL, NTPC, ONGC, IOCL, POWERGRID, and NHPC — recruit engineers through GATE-based advertisements or campus engagement. Staff Selection Commission (SSC) conducts Junior Engineer (JE) examinations for central government departments.',
      'Railway Recruitment Boards (RRB) and RRC publish technician and JE vacancies for Indian Railways. State PSCs and PWD departments advertise assistant engineer and overseer posts. Metro rail, irrigation, and municipal engineering wings hire through state portals.',
      'Defence ordnance factories, BRO, and metro rail corporations release periodic engineering cadre notifications on official ministry and state websites.',
    ]),
    block('howToApply', 'How to apply', [
      'Read the official notification PDF for post-wise qualification, experience, and reservation rules. Create an account on the recruiting portal before the last date.',
      'Upload engineering degree or diploma marksheets, GATE scorecard if required, and identity documents. Keep application printouts and fee receipts. Monitor the same portal for admit cards, answer keys, and final results.',
      'For GATE-based PSU recruitment, ensure your GATE paper and score year match the advertisement. Never apply through unofficial websites charging extra registration fees.',
      'Document verification for engineering posts may require degree equivalency certificates for candidates who studied abroad — check AIU norms in the official PDF.',
    ]),
  ],
  nursing: [
    block('intro', 'Nursing careers in government hospitals', [
      'Government nursing recruitment includes staff nurse, nursing officer, ANM, GNM, community health nurse, and nursing superintendent posts in central hospitals, ESIC, AIIMS, state NHM, and district health facilities. Notifications specify qualification (B.Sc Nursing, GNM, ANM), registration with the state nursing council, and clinical experience where applicable.',
      'This listing narrows health-sector notifications to nursing-specific roles using official post titles and qualification keywords — so you see ward sister and staff nurse vacancies without unrelated doctor-only posts.',
      'Live Govt Jobs refreshes nursing listings daily from verified hospital and health department portals. Each apply link points to the original notification PDF — we do not list unofficial walk-in ads from social media reposts.',
    ]),
    block('eligibility', 'Nursing qualification and age norms', [
      'Staff nurse posts usually require B.Sc Nursing or GNM with valid registration. ANM posts accept auxiliary nurse midwife certificates from recognised institutions. Supervisory posts may need MSc Nursing or years of ward experience.',
      'Age criteria commonly range from 18 to 35–40 years with relaxations for reserved categories. Some states require Hindi or local language proficiency for government hospital postings.',
      'Internship completion date, nursing council registration number, and experience certificates must match the official PDF. Contractual NHM posts may have different bond and renewal terms than permanent state cadre.',
    ]),
    block('recruiters', 'Where nursing vacancies are published', [
      'AIIMS, ESIC, and central government hospitals advertise on institute career pages. State NHM and medical health services release bulk staff nurse recruitment through state health department portals.',
      'Railway hospitals, defence nursing services, and municipal corporation hospitals also publish periodic nursing cadre vacancies on official websites.',
      'State public service commissions occasionally conduct combined health worker examinations that include nursing officer cadre — watch for PSC bulletins alongside hospital direct recruitment.',
    ]),
    block('howToApply', 'Application steps for nursing posts', [
      'Download the official notification and confirm your nursing registration number and internship dates match requirements. Apply online on the board portal or attend walk-in drives with original certificates.',
      'For state NHM contracts, applications may route through NHM or state PSC websites. Save your application ID and check the same source for merit lists and joining letters.',
      'Track admit cards, skill test schedules, and joining letters only on the recruiting hospital or health department portal. Never pay agents for nursing selection in government hospitals.',
      'For multi-post notifications, note the post code on your application — ward sister, ICU nurse, and community health nurse cadres often have separate merit lists.',
      'Nursing bond agreements in state hospitals may require minimum service years — read bond clauses in the official PDF before accepting the post.',
    ]),
  ],
  pharmacy: [
    block('intro', 'Pharmacy jobs in government service', [
      'Pharmacy government recruitment includes pharmacist, drug inspector, hospital pharmacist, and store officer posts in central hospitals, ESIC, state health departments, railways, and municipal health units. Notifications specify D.Pharm or B.Pharm with state pharmacy council registration and sometimes experience in hospital or retail dispensing.',
      'Live Govt Jobs lists pharmacy cadre vacancies ingested from official .gov.in portals and verified hospital career pages. Each card resolves to the board that published the advertisement — we exclude unofficial mirrors that repost PDFs without source links.',
      'Use the expiring-soon sort on this page to prioritise applications before the last date, and open the original notification to confirm pay level, bond conditions, and domicile rules.',
    ]),
    block('eligibility', 'Pharmacy qualification and registration', [
      'Hospital pharmacist posts typically require a diploma or degree in pharmacy from a PCI-recognised institution plus valid registration with the state pharmacy council. Drug inspector and quality control posts may need B.Pharm with experience and knowledge of the Drugs and Cosmetics Act.',
      'Age limits commonly range from 18 to 35–40 years with relaxations for reserved categories as cited in each PDF. Some state NHM contracts accept fresh D.Pharm graduates for contractual pharmacist posts in primary health centres.',
      'Experience in hospital dispensing, inventory management, or cold-chain storage may be required for senior pharmacist posts. Verify whether registration with both state and central councils is needed for all-India institute recruitments.',
    ]),
    block('recruiters', 'Who hires pharmacists in government', [
      'ESIC hospitals, AIIMS, railway hospitals, and ordnance factory hospitals advertise pharmacist vacancies on institute websites. State medical health services and NHM release bulk staff pharmacist recruitment through state health portals.',
      'Food and drug administration departments recruit drug inspectors through state PSC examinations. PSU medical units and defence hospital chains also publish periodic pharmacy cadre notifications.',
      'Central and state drug control laboratories hire analytical chemists and pharmacists for quality testing roles through official ministry notifications.',
    ]),
    block('howToApply', 'How to apply for pharmacist posts', [
      'Download the official PDF from the job card and verify registration number, internship, and domicile requirements. Apply on the recruiting portal before the deadline and upload degree, registration certificate, and category documents.',
      'For walk-in interviews, carry originals and photocopies. Track merit lists on the same official site — never pay third parties for selection assurances.',
      'Drug inspector examinations may include a written test on pharmacy law and clinical pharmacology — prepare from the syllabus in the official PSC notification.',
      'Hospital pharmacist walk-ins often require original registration certificate and internship completion letter — check venue and reporting time in the PDF.',
      'Contractual pharmacist posts in NHM may convert to permanent cadre per state rules — confirm tenure and renewal terms in the advertisement.',
    ]),
  ],
  teaching: [
    block('intro', 'Teaching jobs in government schools and colleges', [
      'Teaching government recruitment spans primary teachers, TGT, PGT, lecturers, assistant professors, and principals in state schools, central universities, KVS, NVS, and state public service commissions. Notifications specify educational qualifications (B.Ed, D.El.Ed, NET/SET), subject specialisation, and TET or state eligibility test scores.',
      'This listing filters live teaching vacancies from official education department and PSC portals. Every apply link points to a verified government source — not tuition-centre aggregators.',
      'Use subject filters and expiring-soon sort to find TGT, PGT, and lecturer posts before the application window closes, then read the official PDF for medium of instruction and domicile requirements.',
    ]),
    block('eligibility', 'Teaching eligibility and certificates', [
      'School-level posts usually require graduation with B.Ed or D.El.Ed and a valid TET or CTET score where mandated. College and university posts need NET/SET or Ph.D as per UGC norms stated in the advertisement.',
      'Age limits vary by state and cadre — many state teacher recruitments allow up to 40 years for general category with relaxations. Domicile and language proficiency requirements are common in state board postings.',
      'Reserved category certificates, disability certificates, and experience in aided or government schools must be uploaded in the format specified on the recruiting portal.',
    ]),
    block('recruiters', 'Major teaching recruiters', [
      'Kendriya Vidyalaya Sangathan (KVS), Navodaya Vidyalaya Samiti (NVS), and DSSSB conduct central school teacher examinations. State education departments and state PSCs advertise district-wise teacher vacancies.',
      'Universities, colleges, and technical education boards release faculty and librarian posts on their official career pages. Samagra Shiksha and state mission societies hire contractual teachers through state portals.',
      'UGC and state higher education councils announce assistant professor vacancies through combined eligibility tests and direct recruitment on university websites.',
    ]),
    block('howToApply', 'Application process for teaching posts', [
      'Read the official notification for subject codes, experience, and certificate requirements. Register on the board portal, fill the form, upload marksheets and eligibility certificates, and pay fees if applicable.',
      'Keep application printouts and monitor the same portal for admit cards, answer keys, and final selection lists.',
      'For TET-qualified state teacher posts, confirm your TET paper and year match the notification before submitting the online form.',
      'Document verification for teaching posts may require B.Ed marksheets, TET scorecard, and domicile certificate at the district education office on the date specified in the merit list.',
      'KVS and NVS recruitments use separate subject codes — select the correct TGT or PGT paper when filling the online application form.',
    ]),
  ],
  law: [
    block('intro', 'Law and legal services in government', [
      'Legal government recruitment in India covers law officers in central ministries, public prosecutors, judicial clerks, legal assistants, and notary cadres in high courts, district courts, and tribunals. Every post is advertised through an official notification on a .gov.in portal, high court website, or state public service commission — with LLB eligibility, age limits, and selection method stated in the PDF.',
      'Live Govt Jobs lists law-sector vacancies matched from official notifications using legal role keywords — law officer, prosecutor, judicial assistant, and court clerk posts. Each card links to the original PDF or apply portal on a verified government domain, not unofficial job boards that charge registration fees.',
      'Whether you are a fresh LLB graduate targeting law officer trainee posts or an experienced advocate eyeing public prosecutor vacancies, this page filters live legal recruitment from official sources only.',
    ]),
    block('eligibility', 'Eligibility for legal government posts', [
      'Law officer and public prosecutor posts typically require an LLB degree from a Bar Council of India-recognised university and enrolment as an advocate. Some assistant law officer posts accept company secretary or MBA law combinations as specified in the advertisement.',
      'Judicial clerk and court assistant posts may accept LLB or graduate degrees with law diploma depending on the recruiting court. Age limits commonly range from 21 to 35–40 years with relaxations for SC/ST/OBC and PwBD categories as per the notification.',
      'High court and district court recruitments often require computer proficiency and local language knowledge. Always verify domicile, practice experience years, and registration certificate requirements in the official PDF before applying.',
    ]),
    block('recruiters', 'Who recruits for legal government jobs', [
      'Union ministries — home, finance, railways, and defence — advertise law officer and legal consultant posts on departmental career pages and through UPSC where applicable. State public service commissions conduct examinations for assistant public prosecutor and judicial service preliminary stages.',
      'High courts and district courts publish clerk, stenographer, and judicial assistant recruitment on their official websites. Tribunals (NCLT, CAT, ITAT) and regulatory bodies also release legal officer vacancies periodically.',
    ]),
    block('howToApply', 'How to apply for legal government recruitment', [
      'Open the job card and read the official notification PDF for post-wise qualification, experience, and reservation rules. Register on the recruiting portal (state PSC, high court recruitment cell, or ministry career page) before the last date.',
      'Upload LLB marksheets, bar council enrolment certificate, category documents, and photograph as per specifications. Pay the application fee online if applicable and download the confirmation page.',
      'Track admit cards, written test schedules, and interview calls only on the same official portal. Live Govt Jobs never collects applications or legal exam fees — we link you to the government source.',
    ]),
  ],
  finance: [
    block('intro', 'Finance and banking government jobs', [
      'Finance sector government recruitment spans IBPS clerk and probationary officer examinations, RBI Grade B, SBI specialist cadre, accounts officer posts in central ministries, and audit officer vacancies in CAG-linked departments. Unlike private bank hiring, every government finance post is filled through a transparent notification with prescribed qualification, age, and selection stages.',
      'This page aggregates live banking and finance vacancies ingested from official IBPS, RBI, SBI, and .gov.in career portals. Each listing resolves to the board that published the advertisement — we block unofficial aggregators that mirror notifications without source links.',
      'Use filters and expiring-soon sort to prioritise applications before deadlines, then open the original PDF to confirm educational qualification, computer literacy requirements, and interview pattern.',
    ]),
    block('eligibility', 'Banking and finance eligibility norms', [
      'Graduate banking posts (IBPS PO, clerk, RBI assistant) generally require a bachelor degree from a recognised university with specified minimum marks. Specialist officer posts may need CA, MBA finance, LLB, or professional qualifications as cited in the advertisement.',
      'Age limits for IBPS and RBI recruitments typically fall between 20 and 30–32 years for general category candidates, with relaxations for reserved categories per government rules. Proficiency in local language and computer operation is commonly mandatory.',
      'Accounts officer and audit assistant posts in ministries accept B.Com, M.Com, or CA inter depending on pay level. Always verify graduation percentage cut-off and experience requirements in the official notification.',
    ]),
    block('recruiters', 'Major finance and banking recruiters', [
      'Institute of Banking Personnel Selection (IBPS) conducts clerk, PO, and specialist officer examinations for participating public sector banks. Reserve Bank of India (RBI) publishes Grade B and assistant recruitment on rbi.org.in.',
      'State Bank of India (SBI) advertises PO, clerk, and specialist cadre posts on its official career portal. Central ministries, CAG offices, and PSU finance wings release accounts officer and internal audit vacancies on .gov.in sites.',
    ]),
    block('howToApply', 'How to apply for banking and finance posts', [
      'Read the official IBPS, RBI, or SBI notification for exam dates, application window, and fee structure. Register on the board portal using a valid email and mobile number linked to Aadhaar where required.',
      'Upload graduation marksheets, category certificate, photograph, and signature within prescribed file sizes. Complete fee payment before the deadline and save the registration number.',
      'Download call letters and check results only on the official website. Beware of phishing sites mimicking IBPS or RBI portals — always type the official URL or use links from this site’s verified job cards.',
      'Specialist officer posts may require professional qualification certificates (CA, MBA, LLB) attested by a gazetted officer — verify attestation rules in the notification.',
      'Keep your registered email and mobile number active until joining — banks send interview and document verification schedules electronically.',
    ]),
  ],
  dental: [
    block('intro', 'Dental government jobs in India', [
      'Dental government recruitment includes BDS dental surgeons, dental officers, senior residents, and hospital dentist posts in AIIMS, ESIC, army dental corps, railway hospitals, and state health directorates. Notifications specify BDS from a DCI-recognised college, compulsory internship, and permanent registration with a state dental council.',
      'Live Govt Jobs narrows health-sector notifications to dental-specific roles using BDS and dental surgeon keywords — so you see oral surgery and dental officer vacancies without unrelated MBBS-only posts. Every apply link points to an official .gov.in or hospital career page.',
    ]),
    block('eligibility', 'BDS eligibility and registration requirements', [
      'Dental surgeon and dental officer posts require BDS with completed rotating internship and valid state dental council registration. MDS specialists may be required for consultant and senior resident faculty posts in teaching hospitals.',
      'Age limits commonly range from 21 to 35–40 years with category relaxations as per each advertisement. Some ESIC and state NHM contracts accept fresh BDS graduates for contractual dental officer posts in district hospitals.',
      'Defence dental corps and UPSC dental posts may include physical standards and all-India service liability. Verify bond period, domicile, and NEET-based eligibility where cited in the PDF.',
      'MDS specialists may apply for consultant posts when the notification lists superspeciality requirements separately from general BDS dental surgeon cadre.',
    ]),
    block('recruiters', 'Top recruiters for dental government posts', [
      'Employees State Insurance Corporation (ESIC) and AIIMS institutes advertise dental officer and faculty posts on official career portals. State medical health services recruit civil dental surgeons through state PSC or direct recruitment drives.',
      'Indian Army and Indian Navy dental corps publish short-service and permanent commission vacancies on joinindianarmy.nic.in and joinindiannavy.gov.in. Railway hospitals and municipal corporation health units also release periodic BDS vacancies.',
    ]),
    block('howToApply', 'Application steps for dental posts', [
      'Download the official notification from the job card and confirm your BDS internship completion date and dental council registration number match requirements. Apply online on the recruiting portal before the last date.',
      'Upload degree certificate, internship completion proof, registration certificate, and category documents. For walk-in interviews, carry originals and multiple photocopy sets.',
      'Track merit lists and joining letters on the same official source. Never pay agents claiming guaranteed selection for government dental posts.',
      'Dental officer posts in teaching hospitals may require teaching experience or NEET-based faculty norms — read faculty-specific clauses in AIIMS and state medical university notifications.',
    ]),
  ],
  'iti-diploma': [
    block('intro', 'ITI and diploma government jobs', [
      'ITI and diploma government recruitment covers technician, tradesman, operator, and junior engineer posts in Indian Railways, ordnance factories, PSUs, defence workshops, and municipal corporations. These are among the highest-volume technical cadres in central and state government — filled through merit lists, trade tests, or written examinations as stated in each official notification.',
      'This page lists live ITI and diploma vacancies ingested from RRB, ordnance factory, PSU, and state department career portals. Each card links to the original notification PDF on a verified government domain.',
      'Filter by trade, deadline, or vacancy count to find electrician, fitter, welder, COPA, and mechanical diploma posts closing soon.',
    ]),
    block('eligibility', 'ITI and diploma qualification requirements', [
      'Technician and tradesman posts typically require a National Trade Certificate (NTC) or National Apprenticeship Certificate (NAC) in the relevant trade from an NCVT-affiliated ITI. Diploma engineering posts accept three-year polytechnic diplomas in civil, mechanical, electrical, or electronics trades.',
      'Age limits usually range from 18 to 30–35 years for ITI cadre and up to 40 for experienced technician posts, with relaxations for reserved categories. Medical fitness and height standards apply for railway and defence workshop recruitments.',
      'Some PSUs and metro corporations accept both ITI and diploma holders for the same post code — read the official PDF to confirm which trades and specialisations are eligible.',
    ]),
    block('recruiters', 'Major ITI and diploma recruiters', [
      'Railway Recruitment Boards (RRB) and Railway Recruitment Cells (RRC) publish technician, apprentice, and workshop staff vacancies for Indian Railways. Ordnance Factory Board and defence PSUs recruit ITI tradesmen through official OFB and ministry portals.',
      'BHEL, NTPC, SAIL, and other PSUs advertise technician and diploma engineer posts on their career websites. State PWD, irrigation, and municipal corporations release overseer and junior engineer vacancies through state PSC portals.',
    ]),
    block('howToApply', 'How to apply for ITI and diploma posts', [
      'Read the official notification for trade-wise eligibility, medical standards, and selection stages (CBT, trade test, or document verification). Register on the recruiting portal before the application deadline.',
      'Upload ITI marksheet, trade certificate, diploma marksheets, and identity documents as per file size limits. Pay application fee online if applicable and save the confirmation printout.',
      'Download admit cards and check results on the same official portal. For apprenticeship drives, verify stipend, training duration, and absorption rules in the PDF.',
      'Trade test centres and reporting dress code are specified in the admit card — arrive with original ITI certificate and tools if required for practical assessment.',
      'Apprenticeship stipend and hostel facility details are listed in ordnance factory and railway apprentice notifications — confirm before relocation.',
    ]),
  ],
  'any-degree': [
    block('intro', 'Any degree government jobs for graduates', [
      'Any-degree government recruitment covers graduate-level posts open to candidates holding a recognised bachelor degree — regardless of stream — including clerks, assistants, stenographers, tax assistants, and multi-tasking officer cadres in SSC, state PSC, and central ministries. These posts form the backbone of general cadre hiring across India.',
      'Live Govt Jobs lists graduate-level vacancies from official SSC, UPSC, state PSC, and departmental notifications. Each card resolves to the board that published the advertisement — not tuition-centre aggregators reposting PDFs without source links.',
      'Use search and filters to find posts accepting BA, B.Com, B.Sc, or BBA graduates, then open the original notification to confirm stream restrictions if any.',
    ]),
    block('eligibility', 'Graduate eligibility for general cadre posts', [
      'Most any-degree posts require a bachelor degree from a UGC-recognised university with minimum percentage marks as specified in the notification. Some posts restrict to science, commerce, or arts streams — always read the official PDF.',
      'Age limits for SSC CGL and CHSL commonly range from 18 to 32 years for general category with relaxations for reserved categories. State PSC graduate posts may allow up to 40 years depending on cadre.',
      'Computer proficiency, typing speed, and local language knowledge are frequently mandatory for clerk and assistant posts. Physical standards apply for police, forest, and uniformed services even when any degree is accepted.',
    ]),
    block('recruiters', 'Who recruits any-degree graduates', [
      'Staff Selection Commission (SSC) conducts CGL, CHSL, MTS, and GD examinations for central government ministries and attached offices. State public service commissions advertise graduate clerk, assistant, and revenue inspector posts.',
      'Railway Recruitment Boards, banking exams through IBPS, and municipal corporation recruitments also publish graduate-level vacancies on official portals throughout the year.',
    ]),
    block('howToApply', 'How to apply for graduate government posts', [
      'Identify the recruiting board from the job card and download the official notification PDF. Note exam tier structure, syllabus, and last date for online application.',
      'Register on the board portal, complete the application form, upload graduation marksheet and category certificate, and pay fee before deadline. Save registration ID and fee receipt.',
      'Prepare for tier-1 and tier-2 examinations as per the official syllabus. Track admit cards and results only on the recruiting board website.',
      'SSC and state PSC forms often require photo signature in JPEG format within strict KB limits — prepare files before the last hour of the deadline.',
      'Graduate apprentice and management trainee posts in PSUs may accept any degree — confirm stream restrictions in the official PDF before applying.',
    ]),
  ],
  aviation: [
    block('intro', 'Aviation and civil aviation government jobs', [
      'Aviation government recruitment includes Airports Authority of India (AAI) junior executive and manager posts, DGCA vacancies, air traffic control trainees, fire service cadre at airports, and ministry of civil aviation appointments. These roles combine technical aviation knowledge with government service benefits and are advertised exclusively on official AAI, DGCA, and .gov.in career pages.',
      'Live Govt Jobs lists civil aviation sector vacancies matched from official notifications — AAI, DGCA, and ministry portals. We do not list commercial airline pilot hiring from private carriers; focus here is on government and PSU aviation roles.',
    ]),
    block('eligibility', 'Aviation sector eligibility requirements', [
      'AAI junior executive posts typically require B.Tech/B.E. in electronics, electrical, or civil engineering, or BBA/MBA for finance and commercial disciplines as specified per post code. ATC trainee posts may require physics and mathematics at 10+2 level plus engineering degree.',
      'Age limits commonly range from 18 to 27–30 years for executive trainee cadre with relaxations for reserved categories. Medical fitness standards including vision and colour blindness tests apply for operational posts.',
      'DGCA and ministry appointments may require aviation law knowledge, experience in flight operations, or aerodrome safety certification. Verify experience years and licence requirements in each official PDF.',
      'Fire service and airport operations cadre may accept diploma holders with ICAO-aligned training — check post-wise qualification tables in the notification.',
    ]),
    block('recruiters', 'Major aviation government recruiters', [
      'Airports Authority of India (AAI) publishes the largest volume of civil aviation government recruitment on aai.aero and official employment news channels. Directorate General of Civil Aviation (DGCA) advertises technical and regulatory posts on dgca.gov.in.',
      'Ministry of Civil Aviation, Pawan Hans, and airport operator PSUs release specialist cadre vacancies on .gov.in portals. Metro airport fire services and security units also recruit through official notifications.',
    ]),
    block('howToApply', 'How to apply for AAI and aviation posts', [
      'Read the official AAI or DGCA notification for post-wise qualification, GATE score requirements if applicable, and selection stages. Register on the recruiting portal during the application window.',
      'Upload engineering degree, GATE scorecard, experience certificates, and category documents. Complete online fee payment and download the application confirmation.',
      'Monitor the same portal for CBT admit cards, skill test schedules, and final results. Beware of fake recruitment websites mimicking AAI branding.',
      'AAI recruitment often includes document verification at designated airports — carry originals of degree, GATE scorecard, and category certificates on the scheduled date.',
    ]),
  ],
  naval: [
    block('intro', 'Indian Navy and naval government jobs', [
      'Naval government recruitment covers Indian Navy sailor, Agniveer (SSR/MR), artificer apprentice, naval dockyard tradesman, and civilian posts in naval shipyards. Unlike generic defence listings, this page filters navy-specific notifications from joinindiannavy.gov.in and official dockyard career portals so army-only vacancies are excluded.',
      'Live Govt Jobs aggregates live naval recruitment from verified defence and PSU sources. Each card links to the official notification or apply portal — never third-party sites charging for sailor registration.',
    ]),
    block('eligibility', 'Navy sailor and Agniveer eligibility', [
      'Agniveer SSR and MR entries require 10+2 with specified marks in physics, chemistry, and mathematics or biology depending on trade. Age limits are typically 17.5 to 21 years for sailor entries with unmarried status as per notification.',
      'Dockyard apprentice and tradesman posts accept ITI certificates in relevant trades with age limits up to 25–27 years. Civilian naval depot posts may require graduate or diploma qualifications.',
      'Medical fitness, height, chest expansion, and vision standards are strictly enforced for uniformed entries. Tattoos, body mass index, and sports proficiency may be specified — verify in the official PDF.',
      'Women candidates should check entry schemes open to female sailors — eligibility and post availability vary by recruitment cycle on joinindiannavy.gov.in.',
    ]),
    block('recruiters', 'Naval recruitment authorities', [
      'Indian Navy publishes Agniveer, SSR, MR, and officer entries on joinindiannavy.gov.in. Naval dockyards — Mumbai, Visakhapatnam, Kochi — advertise apprentice and tradesman recruitment on official shipyard websites.',
      'Coast Guard affiliated technical posts and naval PSU units occasionally release cadre vacancies on .gov.in portals linked from this listing page.',
    ]),
    block('howToApply', 'How to apply for Indian Navy recruitment', [
      'Download the official Indian Navy notification and confirm age, educational, and medical eligibility before registering. Apply online on joinindiannavy.gov.in during the open registration window.',
      'Upload 10+2 marksheet, photograph, signature, and category certificate. Appear for computer-based test and physical fitness test at assigned centres as per admit card.',
      'Track merit lists and joining instructions only on the official navy portal. Never pay unauthorised persons for selection in sailor or Agniveer entries.',
      'PFT and medical standards for navy entries are strict — review height, weight, and vision criteria in the official notification before registering online.',
    ]),
  ],
  'hotel-management': [
    block('intro', 'Hotel management government jobs', [
      'Hotel management government recruitment includes catering supervisors and managers in Indian Railways (IRCTC), defence institute messes, tourism department hospitality cadre, and PSU hotel units. Notifications specify B.Sc Hotel Management, diploma in hospitality, or craft certificate courses depending on post level.',
      'This page lists hospitality-sector vacancies matched from official railway, defence, and tourism department notifications. Each apply link resolves to a verified .gov.in or PSU career portal.',
      'Railway catering supervisor posts often involve transfer across zones — read service mobility and shift duty clauses before accepting the appointment.',
    ]),
    block('eligibility', 'Hospitality qualification and experience', [
      'Supervisor and manager posts typically require a bachelor degree or diploma in hotel management from an AICTE or NCHMCT-recognised institution. Entry-level catering assistant posts may accept 10+2 with hospitality certificate.',
      'Age limits commonly range from 18 to 30–35 years with relaxations for reserved categories. Experience in institutional catering, railway pantry services, or star-rated hotels may be mandatory for senior posts.',
      'Food safety certification, knowledge of HACCP norms, and regional language skills are often cited in railway and defence catering notifications.',
    ]),
    block('recruiters', 'Who hires hotel management graduates in government', [
      'Indian Railways and IRCTC advertise catering supervisor, station vendor manager, and hospitality officer posts on official railway recruitment portals. Defence institutes and messes recruit catering officers through departmental notifications.',
      'State tourism departments, ITDC, and municipal corporation canteen units publish hospitality cadre vacancies on state .gov.in websites.',
      'Defence institute mess manager posts may require prior experience in bulk catering for hundreds of cadets — verify scale of operations in the PDF.',
    ]),
    block('howToApply', 'How to apply for hospitality government posts', [
      'Read the official notification for qualification, catering experience, and medical fitness requirements. Apply on the recruiting portal before the last date and upload degree, experience, and category documents.',
      'For walk-in drives at railway or defence units, carry original certificates and multiple photocopy sets. Save application ID and monitor the same portal for interview schedules.',
      'Practical cooking or pantry management tests may be part of selection — confirm test syllabus and ingredients policy in the official notification.',
    ]),
  ],
  'sports-quota': [
    block('intro', 'Sports quota government jobs', [
      'Sports quota government recruitment reserves posts for candidates with documented national, state, or university-level sports achievements — common in Indian Railways, police departments, PSUs, and paramilitary forces. Each notification specifies eligible games, certificate level, and achievement period.',
      'Live Govt Jobs lists sports quota vacancies matched from official notifications using sports quota and sportsperson keywords. Every card links to the original PDF on a verified government domain.',
      'Eligible games and achievement years change per recruitment cycle — always match your sports certificate to the represented game list in the current PDF.',
    ]),
    block('eligibility', 'Sports quota certificate requirements', [
      'Candidates must hold a valid sports certificate from the recognised federation or Sports Authority of India (SAI) as specified in the notification. National championship participation, medal positions, or representation certificates are commonly required.',
      'Educational qualification may range from 10th pass to graduate degree depending on post level. Age relaxations are often granted for sportsperson candidates beyond standard government limits — verify in each PDF.',
      'Medical fitness and trial performance in the represented sport may form part of selection. Domicile and category reservation rules still apply alongside sports quota benefits.',
    ]),
    block('recruiters', 'Departments with sports quota recruitment', [
      'Indian Railways and Railway Recruitment Boards publish sports quota posts for represented games on official RRB portals. State police departments and PSCs advertise constable and clerk sports quota vacancies.',
      'PSUs including ONGC, SAIL, and coal India occasionally release sports quota cadre notifications on their career websites.',
    ]),
    block('howToApply', 'How to apply under sports quota', [
      'Download the official notification and confirm your sport, achievement level, and certificate date fall within eligibility. Apply online or attend document verification as instructed in the PDF.',
      'Upload sports certificate, educational documents, and category proof. Appear for trial or physical test if scheduled — dates are published on the same official portal.',
      'Track final merit lists on the recruiting board website. Keep original certificates for verification at joining.',
      'Sports trial dates and venues are announced on the official portal after document verification — carry kit and medical fitness proof as instructed.',
    ]),
  ],
  architecture: [
    block('intro', 'Architecture and planning government jobs', [
      'Architecture government recruitment includes CPWD architect, town and country planning officer, PWD architectural assistant, and urban development authority posts requiring B.Arch or planning degrees. Notifications specify Council of Architecture (COA) registration and sometimes minimum experience in public works projects.',
      'Live Govt Jobs lists architecture cadre vacancies matched from CPWD, state PWD, smart city missions, and urban local body notifications using B.Arch and town planning keywords.',
      'Smart city and AMRUT project posts may be contractual with defined tenure — confirm permanency and pay level in the official advertisement.',
    ]),
    block('eligibility', 'B.Arch and planning eligibility', [
      'Architect posts typically require B.Arch from a COA-approved institution with valid COA registration. Town planning officer posts may need B.Plan or M.Plan from an AICTE-recognised college.',
      'Age limits commonly range from 21 to 35–40 years with relaxations for reserved categories. Experience in government projects, AutoCAD proficiency, and knowledge of NBC building codes may be mandatory for senior posts.',
      'Some state urban development authorities accept diploma in architecture for draughtsman and assistant posts — verify post code requirements in the official PDF.',
    ]),
    block('recruiters', 'Architecture recruiters in government', [
      'Central Public Works Department (CPWD) and state PWD departments advertise architect and draughtsman posts on official ministry and state portals. Smart city, AMRUT, and urban development missions hire planning consultants and officers through government tenders and direct recruitment.',
      'Metro rail corporations, development authorities, and municipal corporations release architectural assistant vacancies on .gov.in career pages.',
    ]),
    block('howToApply', 'How to apply for architect government posts', [
      'Read the official notification for qualification, COA registration, and portfolio or experience requirements. Apply on the recruiting portal before the deadline.',
      'Upload B.Arch degree, COA registration certificate, experience letters, and category documents. Pay application fee if applicable and save confirmation.',
      'Track written test or interview schedules on the same official source. Never submit original drawings or portfolios to unauthorised agents.',
      'CPWD and state PWD interviews may require presentation of executed project drawings — prepare a portfolio of government or academic work as permitted in the notification.',
    ]),
  ],
  agriculture: [
    block('intro', 'Agriculture government jobs in India', [
      'Agriculture government recruitment spans ICAR scientist and technician posts, Krishi Vigyan Kendra (KVK) officers, state agriculture extension officers, horticulture department vacancies, and animal husbandry cadre in state krishi departments. India’s public agriculture sector hires graduates in agronomy, horticulture, soil science, and veterinary sciences through official ICAR and state .gov.in portals.',
      'Live Govt Jobs aggregates live agriculture-sector notifications from ICAR institutes, state agriculture universities, and official krishi department websites. Each listing links to the original PDF — not private agri-job aggregators.',
      'KVK and extension officer posts often require willingness to serve in rural blocks — confirm posting location and travel allowance in the official PDF.',
    ]),
    block('eligibility', 'Agriculture degree and experience norms', [
      'Extension officer and KVK posts typically require B.Sc Agriculture, horticulture, or animal husbandry from a recognised agricultural university. Scientist posts need MSc or Ph.D with NET/ASRB qualification as specified.',
      'Age limits commonly range from 21 to 35–40 years with relaxations for reserved categories. Field experience in crop demonstration, soil testing, or livestock management may be required for state department posts.',
      'Some state krishi missions hire diploma holders for technician and seed inspector cadres — verify educational requirements per post code in the notification.',
    ]),
    block('recruiters', 'Major agriculture recruiters', [
      'Indian Council of Agricultural Research (ICAR) and agricultural universities publish scientist, technician, and farm manager recruitment on icar.org.in and institute career pages. State agriculture and horticulture departments advertise extension officer bulk vacancies.',
      'National Bank for Agriculture and Rural Development (NABARD), seed corporations, and cooperative marketing federations release specialist cadre posts on official portals.',
    ]),
    block('howToApply', 'How to apply for agriculture government posts', [
      'Download the official ICAR or state krishi department notification and confirm qualification, domicile, and experience requirements. Apply online on the recruiting portal before the last date.',
      'Upload degree marksheets, NET/ASRB scorecard if required, and category certificate. Pay fee and save registration details.',
      'Monitor the same portal for interview schedules and final selection lists. Field posts may require document verification at district agriculture offices.',
      'ASRB and ICAR scientist recruitments may include presentation and viva — prepare research summary and publications as cited in the advertisement.',
    ]),
  ],
  arts: [
    block('intro', 'Arts and humanities government jobs', [
      'Arts and humanities government recruitment covers BA and MA graduate posts — clerks, assistants, welfare officers, cultural department assistants, librarians, and social sector cadres in SSC, state PSC, and central ministries. These listings help humanities graduates find official notifications that accept arts degrees without a technical specialisation.',
      'Live Govt Jobs filters graduate-level vacancies from official sources using arts and humanities qualification keywords. Each card links to the recruiting board’s PDF or apply portal on a verified government domain.',
      'Cultural department and museum posts may value subject MA degrees — use search to find history, economics, and sociology-specific notifications on this page.',
    ]),
    block('eligibility', 'BA and MA graduate eligibility', [
      'Clerk and assistant posts under SSC CHSL and CGL accept any recognised bachelor degree including BA. Subject-specific posts — history lecturer, economics assistant — require MA in the relevant discipline as cited in the notification.',
      'Age limits for central graduate posts typically range from 18 to 32 years with category relaxations. State PSC posts may allow up to 40 years. Typing, computer, and local language skills are commonly required for clerical cadres.',
      'Cultural department and museum posts may require portfolio or subject expertise in fine arts, archaeology, or sociology — always read the official PDF for stream restrictions.',
    ]),
    block('recruiters', 'Who recruits arts and humanities graduates', [
      'Staff Selection Commission (SSC) and state public service commissions publish the majority of arts-eligible graduate vacancies. Ministries of culture, social justice, and education advertise subject specialist assistants.',
      'Universities, libraries, and autonomous cultural bodies release librarian and research assistant posts on official career pages.',
    ]),
    block('howToApply', 'How to apply for arts graduate government posts', [
      'Identify the recruiting board from the job card and read the official notification for qualification and exam pattern. Register on the portal during the application window.',
      'Upload graduation or postgraduation marksheets, category certificate, and photograph. Complete fee payment and download confirmation before the deadline.',
      'Prepare for tier examinations per the official syllabus. Track admit cards and results only on the recruiting board website.',
      'State PSC arts graduate posts may include descriptive papers in regional language — confirm medium of examination in the official notification.',
    ]),
  ],
}

function genericSections(label: string, field: string): ProfessionSeoSection[] {
  return [
    block('intro', `${label} in government recruitment`, [
      `${label} government jobs in India are filled through official notifications published on verified .gov.in portals, public service commissions, and departmental career pages. Each vacancy specifies qualification, age, pay scale, and selection process in a downloadable PDF — transparency that private hiring often lacks.`,
      `This page tracks live ${field} recruitment from official sources only. Use the filters and sort options to find posts closing soon or with the highest vacancy counts, then open the original notification to apply.`,
      `Live Govt Jobs refreshes listings daily from central ministries, state PSC websites, PSU career pages, and autonomous bodies. We do not republish aggregator links — every card on this page should resolve to an official government domain or PDF.`,
    ]),
    block('eligibility', 'General eligibility guidelines', [
      'Eligibility varies by post level: degree, diploma, or certificate requirements are listed explicitly in each notification. Age limits typically follow government service rules (often 18–40 years) with relaxations for reserved categories.',
      'Domicile, experience, physical standards, and language proficiency may apply for state-specific or uniformed services. Always read the official PDF before applying — never rely on unofficial summaries alone.',
      'If a notification lists both direct recruitment and examination-based selection, confirm which mode applies to your qualification and category before paying any application fee.',
    ]),
    block('recruiters', 'Common recruiting bodies', [
      'Union Public Service Commission (UPSC), Staff Selection Commission (SSC), railway recruitment boards, state public service commissions, and ministry departments publish the majority of central and state government vacancies.',
      'Public sector undertakings, municipal corporations, universities, and autonomous bodies also release direct recruitment for specialised cadres in this sector.',
      'State-level departments often advertise on their own websites in addition to PSC bulletins — this page aggregates those official notices when they match this profession filter.',
    ]),
    block('howToApply', 'How to apply through official channels', [
      'Click a job card to open the official notification PDF or apply link. Register on the recruiting portal, fill the form, upload documents, and pay fees if required before the last date.',
      'Download admit cards and check results only on the same official website. Live Govt Jobs never collects applications or payments — we link you to the government source.',
      'Save your registration ID, fee receipt, and a copy of the submitted form. If the last date is near, use the expiring-soon sort on this page to prioritise open applications.',
    ]),
  ]
}

const LABELS: Record<string, { label: string; field: string }> = {
  law: { label: 'Law and legal services', field: 'law officer, prosecutor, and judicial assistant' },
  finance: { label: 'Finance and banking', field: 'banking, accounts, and finance officer' },
  pharmacy: { label: 'Pharmacy', field: 'pharmacist and drug inspector' },
  teaching: { label: 'Teaching', field: 'school teacher, lecturer, and faculty' },
  'iti-diploma': { label: 'ITI and diploma trades', field: 'technician and tradesman' },
  'any-degree': { label: 'Any graduate degree', field: 'graduate clerk and assistant' },
  dental: { label: 'Dental', field: 'BDS dental surgeon and dental officer' },
  aviation: { label: 'Aviation and civil aviation', field: 'AAI, DGCA, and airport authority' },
  naval: { label: 'Indian Navy and naval', field: 'navy sailor, Agniveer, and dockyard' },
  'hotel-management': { label: 'Hotel management and hospitality', field: 'catering and hospitality supervisor' },
  'sports-quota': { label: 'Sports quota', field: 'sportsperson reserved cadre' },
  architecture: { label: 'Architecture and planning', field: 'architect and town planning officer' },
  agriculture: { label: 'Agriculture and allied sciences', field: 'agriculture extension and ICAR' },
  arts: { label: 'Arts and humanities', field: 'BA and MA graduate general cadre' },
}

export function getProfessionSeoSections(slug: string): ProfessionSeoSection[] {
  if (SEO_BY_SLUG[slug]) return SEO_BY_SLUG[slug]
  const meta = LABELS[slug]
  if (!meta) return []
  return genericSections(meta.label, meta.field)
}

export function professionSeoWordCount(slug: string): number {
  return getProfessionSeoSections(slug)
    .flatMap((s) => s.paragraphs)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length
}
