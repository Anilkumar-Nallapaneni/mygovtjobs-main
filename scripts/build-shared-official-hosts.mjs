import fs from 'fs'

const fe = fs.readFileSync('frontend/src/utils/officialDomains.ts', 'utf8')
const be = fs.readFileSync('backend/app/utils/official_hosts.py', 'utf8')
const feStems = [...fe.match(/const OFFICIAL_STEMS = \[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
const beStems = [...be.match(/_OFFICIAL_STEMS = \(([\s\S]*?)\)/)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
const onlyFe = feStems.filter((s) => !beStems.includes(s)).sort()
const onlyBe = beStems.filter((s) => !feStems.includes(s)).sort()
const union = [...new Set([...feStems, ...beStems])].sort((a, b) => a.localeCompare(b))
console.log('fe', feStems.length, 'be', beStems.length, 'union', union.length)
console.log('onlyFe', onlyFe)
console.log('onlyBe', onlyBe)
fs.mkdirSync('shared', { recursive: true })
fs.writeFileSync(
  'shared/official-hosts.json',
  JSON.stringify(
    {
      $schemaComment:
        'Single source of truth for official recruitment hosts + aggregator blocks. Consumed by frontend, backend, and audit scripts.',
      blockedAggregators: [
        'freejobalert',
        'sarkariresult',
        'sarkarijob',
        'sarkarinaukri',
        'governmentjob',
        'indgovtjobs',
        'rojgarresult',
        'jobriya',
        'fresherslive',
      ],
      blockedCommercialBoards: ['naukri', 'indeed', 'shine', 'timesjobs', 'foundit', 'monster'],
      psuPrefixes: [
        'upsc',
        'ssc',
        'rrb',
        'ibps',
        'isro',
        'drdo',
        'bel',
        'coalindia',
        'ntpc',
        'nhai',
        'esic',
        'aiims',
        'jipmer',
        'nimhans',
        'nielit',
        'npcil',
        'pib',
        'bsnl',
        'ecil',
        'hal',
        'ongc',
        'oil',
        'irctc',
        'nfl',
        'eil',
        'iocl',
        'bhel',
      ],
      officialStems: union,
    },
    null,
    2
  ) + '\n'
)
console.log('wrote shared/official-hosts.json')
