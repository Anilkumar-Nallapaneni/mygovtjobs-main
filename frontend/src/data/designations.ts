/**
 * Designations act as user-friendly aliases mapping to job.title / job.dept / job.qual keywords.
 * Used to build SEO landing pages: /designation/clerk, /designation/officer, etc.
 */

export type DesignationDef = {
  slug: string
  label: string
  aliases: string[]
  description: string
}

export const DESIGNATIONS: DesignationDef[] = [
  {
    slug: 'clerk',
    label: 'Clerk',
    aliases: ['clerk', 'junior clerk', 'ldc', 'lower division clerk', 'ldc-clerk', 'stenographer', 'junior assistant', 'office assistant'],
    description: 'Clerical, LDC, junior assistant, and stenographer posts across central/state ministries and banks.',
  },
  {
    slug: 'officer',
    label: 'Officer',
    aliases: ['officer', 'probationary officer', 'po', 'assistant officer', 'grade officer', 'ias', 'ips', 'ifs'],
    description: 'Probationary officer, gazetted officer, IAS/IPS/IFS and equivalent posts.',
  },
  {
    slug: 'engineer',
    label: 'Engineer',
    aliases: ['engineer', 'junior engineer', 'je', 'assistant engineer', 'ae', 'executive engineer', 'draftsman'],
    description: 'JE, AE, executive engineer positions in railways, PSUs, PWD, and defence.',
  },
  {
    slug: 'teacher',
    label: 'Teacher',
    aliases: ['teacher', 'tgt', 'pgt', 'prt', 'lecturer', 'assistant professor', 'principal', 'headmaster'],
    description: 'TGT, PGT, PRT, professor and lecturer posts in KVS, NVS, Sainik schools, and universities.',
  },
  {
    slug: 'constable',
    label: 'Constable',
    aliases: ['constable', 'head constable', 'gd constable', 'sub inspector', 'si', 'assistant sub inspector', 'asi'],
    description: 'Police, paramilitary, BSF, CRPF, CISF constable, SI, ASI, HC recruitment.',
  },
  {
    slug: 'driver',
    label: 'Driver',
    aliases: ['driver', 'motor driver', 'staff driver', 'hgv driver'],
    description: 'Motor driver, staff driver and heavy-vehicle driver posts across departments.',
  },
  {
    slug: 'nurse',
    label: 'Nurse',
    aliases: ['nurse', 'staff nurse', 'anm', 'gnm', 'nursing officer', 'nursing sister'],
    description: 'Staff nurse, ANM, GNM, and nursing officer posts in AIIMS, ESIC, and state health departments.',
  },
  {
    slug: 'doctor',
    label: 'Doctor',
    aliases: ['doctor', 'medical officer', 'specialist', 'consultant', 'mbbs', 'general duty medical officer', 'gdmo'],
    description: 'Medical officer, specialist consultant, and GDMO posts in central/state health services.',
  },
  {
    slug: 'peon',
    label: 'Peon / MTS',
    aliases: ['peon', 'mts', 'multi tasking staff', 'chowkidar', 'attendant', 'orderly', 'group d'],
    description: 'Multi-Tasking Staff (MTS), peon, chowkidar, Group D posts.',
  },
  {
    slug: 'assistant',
    label: 'Assistant',
    aliases: ['assistant', 'assistant grade', 'personal assistant', 'junior secretariat assistant', 'jsa'],
    description: 'Assistant and personal assistant posts across SSC and central government ministries.',
  },
  {
    slug: 'apprentice',
    label: 'Apprentice',
    aliases: ['apprentice', 'trade apprentice', 'graduate apprentice', 'technician apprentice', 'iti apprentice'],
    description: 'Trade / graduate / technician / ITI apprentice openings in railways and PSUs.',
  },
  {
    slug: 'stenographer',
    label: 'Stenographer',
    aliases: ['stenographer', 'stenographer grade', 'personal secretary'],
    description: 'Stenographer grade C/D and personal secretary posts.',
  },
]

export function getDesignationBySlug(slug: string | null | undefined): DesignationDef | null {
  if (!slug) return null
  return DESIGNATIONS.find((d) => d.slug === slug.toLowerCase()) ?? null
}

export function jobMatchesDesignation(job: { title?: string; post_name?: string; dept?: string }, def: DesignationDef): boolean {
  const haystack = [job.title, job.post_name, job.dept].filter(Boolean).join(' ').toLowerCase()
  if (!haystack) return false
  return def.aliases.some((alias) => haystack.includes(alias.toLowerCase()))
}
