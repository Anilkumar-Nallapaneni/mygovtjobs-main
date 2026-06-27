/**
 * Replace Sarkari transliterations / Hindi loanwords with native "government" terms
 * in scripts/trees/flats/*.json, then run: npm run i18n:generate
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FLATS_DIR = path.join(__dirname, "trees/flats");

/** Explicit sidebar + exam heading labels per locale */
const LABELS = {
  hi: {
    "sidebar.sarkariJob": "सरकारी नौकरी",
    "sidebar.sarkariNaukri": "सरकारी नौकरियाँ",
    "sidebar.sarkariResult": "सरकारी परिणाम",
    "home.examRows.heading": "सरकारी परीक्षा जीवनचक्र",
  },
  bn: {
    "sidebar.sarkariJob": "সরকারি চাকরি",
    "sidebar.sarkariNaukri": "সরকারি চাকরি",
    "sidebar.sarkariResult": "সরকারি ফলাফল",
    "home.examRows.heading": "সরকারি পরীক্ষার জীবনচক্র",
  },
  te: {
    "sidebar.sarkariJob": "ప్రభుత్వ ఉద్యోగం",
    "sidebar.sarkariNaukri": "ప్రభుత్వ ఉద్యోగాలు",
    "sidebar.sarkariResult": "ప్రభుత్వ ఫలితం",
    "home.examRows.heading": "ప్రభుత్వ పరీక్ష జీవితచక్రం",
  },
  mr: {
    "sidebar.sarkariJob": "सरकारी नोकरी",
    "sidebar.sarkariNaukri": "सरकारी नोकऱ्या",
    "sidebar.sarkariResult": "सरकारी निकाल",
    "home.examRows.heading": "सरकारी परीक्षा जीवनचक्र",
  },
  ta: {
    "sidebar.sarkariJob": "அரசு வேலை",
    "sidebar.sarkariNaukri": "அரசு வேலைகள்",
    "sidebar.sarkariResult": "அரசு முடிவு",
    "home.examRows.heading": "அரசுத் தேர்வு வாழ்க்கைச் சுழற்சி",
  },
  gu: {
    "sidebar.sarkariJob": "સરકારી નોકરી",
    "sidebar.sarkariNaukri": "સરકારી નોકરીઓ",
    "sidebar.sarkariResult": "સરકારી પરિણામ",
    "home.examRows.heading": "સરકારી પરીક્ષા જીવનચક્ર",
  },
  kn: {
    "sidebar.sarkariJob": "ಸರ್ಕಾರಿ ಉದ್ಯೋಗ",
    "sidebar.sarkariNaukri": "ಸರ್ಕಾರಿ ಉದ್ಯೋಗಗಳು",
    "sidebar.sarkariResult": "ಸರ್ಕಾರಿ ಫಲಿತಾಂಶ",
    "home.examRows.heading": "ಸರ್ಕಾರಿ ಪರೀಕ್ಷೆಯ ಜೀವನಚಕ್ರ",
  },
  ml: {
    "sidebar.sarkariJob": "സർക്കാർ ജോലി",
    "sidebar.sarkariNaukri": "സർക്കാർ ജോലികൾ",
    "sidebar.sarkariResult": "സർക്കാർ ഫലം",
    "home.examRows.heading": "സർക്കാർ പരീക്ഷയുടെ ജീവിതചക്രം",
  },
  pa: {
    "sidebar.sarkariJob": "ਸਰਕਾਰੀ ਨੌਕਰੀ",
    "sidebar.sarkariNaukri": "ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ",
    "sidebar.sarkariResult": "ਸਰਕਾਰੀ ਨਤੀਜਾ",
    "home.examRows.heading": "ਸਰਕਾਰੀ ਪ੍ਰੀਖਿਆ ਜੀਵਨ ਚੱਕਰ",
  },
  or: {
    "sidebar.sarkariJob": "ସରକାରୀ ଚାକିରି",
    "sidebar.sarkariNaukri": "ସରକାରୀ ଚାକିରିଗୁଡ଼ିକ",
    "sidebar.sarkariResult": "ସରକାରୀ ଫଳାଫଳ",
    "home.examRows.heading": "ସରକାରୀ ପରୀକ୍ଷା ଜୀବନଚକ୍ର",
  },
  as: {
    "sidebar.sarkariJob": "চৰকাৰী চাকৰি",
    "sidebar.sarkariNaukri": "চৰকাৰী চাকৰিবোৰ",
    "sidebar.sarkariResult": "চৰকাৰী ফলাফল",
    "home.examRows.heading": "চৰকাৰী পৰীক্ষাৰ জীৱনচক্ৰ",
  },
  ur: {
    "sidebar.sarkariJob": "سرکاری نوکری",
    "sidebar.sarkariNaukri": "سرکاری نوکریاں",
    "sidebar.sarkariResult": "سرکاری نتیجہ",
    "home.examRows.heading": "سرکاری امتحان کا دورانیہ",
  },
  kok: {
    "sidebar.sarkariJob": "सरकारी नोकरी",
    "sidebar.sarkariNaukri": "सरकारी नोकऱ्यो",
    "sidebar.sarkariResult": "सरकारी परिणाम",
    "home.examRows.heading": "सरकारी परिक्षेचें जिवीत चक्र",
  },
  ne: {
    "sidebar.sarkariJob": "सरकारी जागिर",
    "sidebar.sarkariNaukri": "सरकारी जागिरहरू",
    "sidebar.sarkariResult": "सरकारी नतिजा",
    "home.examRows.heading": "सरकारी परीक्षा जीवनचक्र",
  },
  sd: {
    "sidebar.sarkariJob": "سرڪاري نوڪري",
    "sidebar.sarkariNaukri": "سرڪاري نوڪريون",
    "sidebar.sarkariResult": "سرڪاري نتيجا",
    "home.examRows.heading": "سرڪاري امتحان جو دورانيو",
  },
  sa: {
    "sidebar.sarkariJob": "सरकारी कार्यम्",
    "sidebar.sarkariNaukri": "सरकारी कार्याणि",
    "sidebar.sarkariResult": "सरकारी परिणामः",
    "home.examRows.heading": "सरकारी परीक्षा जीवनचक्रम्",
  },
  sat: {
    "sidebar.sarkariJob": "ᱥᱚᱨᱠᱟᱨ ᱠᱟᱹᱢᱤ",
    "sidebar.sarkariNaukri": "ᱥᱚᱨᱠᱟᱨ ᱠᱟᱹᱢᱤ ᱠᱚ",
    "sidebar.sarkariResult": "ᱥᱚᱨᱠᱟᱨ ᱚᱨᱡᱚ",
    "home.examRows.heading": "ᱥᱚᱨᱠᱟᱨ ᱵᱤᱱᱤᱰ ᱡᱤᱣᱱ ᱥᱟᱭᱠᱟᱞ",
  },
  mai: {
    "sidebar.sarkariJob": "सरकारी नौकरी",
    "sidebar.sarkariNaukri": "सरकारी नौकरियाँ",
    "sidebar.sarkariResult": "सरकारी परिणाम",
    "home.examRows.heading": "सरकारी परीक्षा जीवनचक्र",
  },
  doi: {
    "sidebar.sarkariJob": "सरकारी नौकरी",
    "sidebar.sarkariNaukri": "सरकारी नौकरियाँ",
    "sidebar.sarkariResult": "सरकारी परिणाम",
    "home.examRows.heading": "सरकारी परीक्षा जीवन चक्र",
  },
  brx: {
    "sidebar.sarkariJob": "Government Job",
    "sidebar.sarkariNaukri": "Government Jobs",
    "sidebar.sarkariResult": "Government Result",
    "home.examRows.heading": "Government exam lifecycle",
  },
  ks: {
    "sidebar.sarkariJob": "Government Job",
    "sidebar.sarkariNaukri": "Government Jobs",
    "sidebar.sarkariResult": "Government Result",
    "home.examRows.heading": "Government exam lifecycle",
  },
  mni: {
    "sidebar.sarkariJob": "Government Job",
    "sidebar.sarkariNaukri": "Government Jobs",
    "sidebar.sarkariResult": "Government Result",
    "home.examRows.heading": "Government exam lifecycle",
  },
};

/** Replace patterns applied to every string value in a locale file */
const VALUE_REPLACEMENTS = {
  sat: [
    [/ᱥᱟᱨᱠᱟᱨᱤ/g, "ᱥᱚᱨᱠᱟᱨ"],
    [/ᱥᱚᱨᱠᱟᱨᱤ/g, "ᱥᱚᱨᱠᱟᱨ"],
  ],
  hi: [
    [/सरकारी रिजल्ट/g, "सरकारी परिणाम"],
    [/सरकारी जॉब/g, "सरकारी नौकरी"],
  ],
  mai: [
    [/सरकारी रिजल्ट/g, "सरकारी परिणाम"],
    [/सरकारी जॉब/g, "सरकारी नौकरी"],
  ],
  doi: [
    [/सरकारी रिजल्ट/g, "सरकारी परिणाम"],
    [/सरकारी जॉब/g, "सरकारी नौकरी"],
    [/सर्च रिजल्ट/g, "खोज परिणाम"],
  ],
  sa: [
    [/सरकारी रिजल्ट/g, "सरकारी परिणामः"],
    [/सरकारी जॉब/g, "सरकारी कार्यम्"],
    [/जॉब्स्/g, "कार्येषु"],
  ],
  kok: [
    [/सरकारी रिजल्ट/g, "सरकारी परिणाम"],
    [/सरकारी जॉब/g, "सरकारी नोकरी"],
  ],
  as: [
    [/চৰকাৰী ৰিজাল্ট/g, "চৰকাৰী ফলাফল"],
    [/চৰকাৰী নাউকৰী/g, "চৰকাৰী চাকৰিবোৰ"],
  ],
  or: [
    [/ସାର୍କରୀ/g, "ସରକାରୀ"],
    [/ସାର୍କାର/g, "ସରକାର"],
    [/ନାଉକ୍ରି/g, "ଚାକିରି"],
  ],
  bn: [
    [/সরকারী/g, "সরকারি"],
  ],
  kn: [
    [/ಸರ್ಕಾರಿ ನೌಕ್ರಿ/g, "ಸರ್ಕಾರಿ ಉದ್ಯೋಗಗಳು"],
    [/ಸರ್ಕಾರಿ ಕೆಲಸ/g, "ಸರ್ಕಾರಿ ಉದ್ಯೋಗ"],
  ],
  ml: [
    [/സർക്കാർ നൗക്രി/g, "സർക്കാർ ജോലികൾ"],
  ],
  te: [
    [/సర్కారీ/g, "ప్రభుత్వ"],
  ],
  ta: [
    [/சர்க்காரி/g, "அரசு"],
    [/சர்காரி/g, "அரசு"],
  ],
};

/** qualification.indexDesc government-phrase fixes */
const INDEX_DESC_FIXES = {
  hi: (s) => s.replace(/सरकारी नौकरियाँ/g, "सरकारी नौकरियाँ"),
  bn: (s) => s.replace(/সরকারী/g, "সরকারি"),
  kn: (s) => s.replace(/ಸರ್ಕಾರಿ ಉದ್ಯೋಗಗಳನ್ನು/g, "ಸರ್ಕಾರಿ ಉದ್ಯೋಗಗಳನ್ನು"),
  ml: (s) => s.replace(/സർക്കാർ ജോലികൾ/g, "സർക്കാർ ജോലികൾ"),
  or: (s) => s.replace(/ସାର୍କାର ଚାକିରି/g, "ସରକାରୀ ଚାକିରି").replace(/ସାର୍କରୀ/g, "ସରକାରୀ"),
  sat: (s) => s.replace(/सरकारी नौकरियाँ/g, "ᱥᱚᱨᱠᱟᱨ ᱠᱟᱹᱢᱤ ᱠᱚ").replace(/ᱥᱟᱨᱠᱟᱨᱤ/g, "ᱥᱚᱨᱠᱟᱨ"),
  mai: (s) => s.replace(/सरकारी के नौकरी/g, "सरकारी नौकरियाँ").replace(/सरकारी जॉब/g, "सरकारी नौकरी"),
  doi: (s) => s.replace(/सरकारी नौकरियां/g, "सरकारी नौकरियाँ"),
};

function applyReplacements(value, pairs) {
  let out = value;
  for (const [re, rep] of pairs) {
    out = out.replace(re, rep);
  }
  return out;
}

function processFile(code) {
  const filePath = path.join(FLATS_DIR, `${code}.json`);
  if (!fs.existsSync(filePath)) return;

  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  let changed = 0;

  const labels = LABELS[code];
  if (labels) {
    for (const [key, value] of Object.entries(labels)) {
      if (data[key] !== value) {
        data[key] = value;
        changed++;
      }
    }
  }

  const pairs = VALUE_REPLACEMENTS[code] || [];
  for (const key of Object.keys(data)) {
    if (typeof data[key] !== "string") continue;
    let next = data[key];
    if (pairs.length) next = applyReplacements(next, pairs);
    if (key === "qualification.indexDesc" && INDEX_DESC_FIXES[code]) {
      next = INDEX_DESC_FIXES[code](next);
    }
    if (next !== data[key]) {
      data[key] = next;
      changed++;
    }
  }

  if (changed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
    console.log(`  ${code}: ${changed} update(s)`);
  } else {
    console.log(`  ${code}: ok`);
  }
}

console.log("Updating government labels in flat locale files…");
for (const file of fs.readdirSync(FLATS_DIR).filter((f) => f.endsWith(".json"))) {
  processFile(file.replace(/\.json$/, ""));
}
console.log("Done. Run: npm run i18n:generate");
