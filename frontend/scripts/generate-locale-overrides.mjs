/**
 * Builds src/i18n/localeOverrides/*.json — one file per language (lazy-loaded).
 * Run: npm run i18n:generate
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { countFilled, localeFromFlat } from "./i18n-en-flat.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const en = JSON.parse(fs.readFileSync(path.join(root, "src/i18n/locales/en.json"), "utf8"));

function deepMerge(target, source) {
  if (!source || typeof source !== "object") return target;
  const out = Array.isArray(target) ? [...target] : { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = out[key];
    if (sv && typeof sv === "object" && !Array.isArray(sv) && tv && typeof tv === "object" && !Array.isArray(tv)) {
      out[key] = deepMerge(tv, sv);
    } else {
      out[key] = sv;
    }
  }
  return out;
}

/** @type {Record<string, Record<string, unknown>>} */
const T = {
  hi: {
    brand: { tagline: "सरकारी नौकरी पोर्टल" },
    nav: {
      home: "होम",
      jobs: "नौकरियाँ",
      results: "परिणाम",
      admitCard: "एडमिट कार्ड",
      alert: "अलर्ट",
      login: "लॉगिन",
      searchPlaceholder: "नौकरी, राज्य, विभाग खोजें…",
      light: "लाइट",
      dark: "डार्क",
    },
    lang: { label: "भाषा", choose: "भाषा चुनें" },
    ticker: { live: "लाइव", posts: "पद", last: "अंतिम", liveLine: "लाइव: {{title}}" },
    stateStrip: { topStates: "शीर्ष राज्य:", allIndia: "पूरा भारत" },
    home: {
      tagline: "भारत का #1 सरकारी नौकरी पोर्टल",
      filterListings: "सूची फ़िल्टर करें",
      jobMap: "{{state}} — नौकरी मानचित्र",
      allIndiaJobMap: "पूरा भारत — नौकरी मानचित्र",
      clear: "✕ हटाएँ",
      region: "क्षेत्र:",
      vacanciesFiltered: "रिक्तियाँ (वर्तमान फ़िल्टर)",
      listing: "{{count}} सूचियाँ",
      listing_one: "{{count}} सूची",
      listing_other: "{{count}} सूचियाँ",
      dreamJobPrefix: "पाएँ अपनी",
      dreamJobHighlight: "सपनों की नौकरी",
      heroDesc:
        "UPSC, SSC, रेलवे, बैंकिंग, पुलिस आदि से रियल-टाइम सरकारी नौकरी अलर्ट। हमारे कैटलॉग में {{listings}} भर्तियों में {{vacancies}} रिक्तियाँ।",
      activeVacancies: "सक्रिय रिक्तियाँ",
      hotNewTags: "हॉट / नई",
      statesMap: "राज्य और केंद्रशासित (मानचित्र)",
      liveListings: "लाइव सूचियाँ",
      browseEducation: "शिक्षा के अनुसार",
      clearFilter: "फ़िल्टर हटाएँ",
      jobsInState: "{{state}} में नौकरियाँ",
      jobsCount: "{{count}} सूचियाँ · {{vacancies}} रिक्तियाँ",
      sort: "क्रम:",
      deadline: "अंतिम तिथि",
      vacancies: "रिक्तियाँ",
      noStateListings:
        "इस क्षेत्र के लिए राज्य-विशिष्ट सूची नहीं। मानचित्र पर ✕ हटाएँ या पूरा भारत चुनें।",
      latestJobs: "नवीनतम सरकारी नौकरियाँ",
      searchResults: "खोज परिणाम",
      categoryJobs: "{{category}} नौकरियाँ",
      jobsMeta: "{{count}} नौकरियाँ · {{vacancies}} कुल रिक्तियाँ",
      noJobs: "कोई नौकरी नहीं मिली",
      noJobsHint: "फ़िल्टर हटाएँ या दूसरा राज्य चुनें",
      loadMore: "और नौकरियाँ लोड करें ({{count}} और) ↓",
    },
    quickFilter: {
      tenth: "10वीं पास",
      twelfth: "12वीं पास",
      graduate: "स्नातक",
      engineering: "इंजीनियरिंग",
      defence: "रक्षा",
      banking: "बैंकिंग",
      police: "पुलिस",
    },
    category: {
      railways: "रेलवे",
      banking: "बैंकिंग",
      police: "पुलिस",
      teaching: "शिक्षण",
      defence: "रक्षा",
      health: "स्वास्थ्य",
      state: "राज्य लोक सेवा",
    },
    job: {
      posts: "पद",
      new: "नई",
      hot: "हॉट",
      urgent: "जरूरी",
      expired: "समाप्त",
      daysLeft: "{{count}} दिन शेष",
      applyBy: "आवेदन तक",
      qualification: "योग्यता",
      location: "स्थान",
    },
    alert: {
      title: "कोई सरकारी नौकरी मिस न करें",
      desc: "नई रिक्तियों पर तुरंत अलर्ट। राज्य, श्रेणी और योग्यता अनुसार।",
      email: "ईमेल",
      whatsapp: "व्हाट्सऐप",
      telegram: "टेलीग्राम",
      push: "पुश",
      placeholder: "अपना ईमेल दर्ज करें",
      subscribe: "मुफ़्त अलर्ट के लिए सब्सक्राइब करें",
      success: "सब्सक्राइब हो गया! अलर्ट {{channel}} पर आएंगे।",
    },
    footer: {
      blurb: "भारत का सर्वश्रेष्ठ सरकारी नौकरी पोर्टल। रियल-टाइम अलर्ट, सत्यापित सूचियाँ, सभी 28 राज्य।",
      disclaimer: "अस्वीकरण: स्वतंत्र एग्रीगेटर। किसी सरकारी संस्था से संबद्ध नहीं। आधिकारिक साइट पर सत्यापित करें।",
      quickLinks: "त्वरित लिंक",
      categories: "श्रेणियाँ",
      topStates: "शीर्ष राज्य",
      company: "कंपनी",
      copyright: "© {{year}} भारतनौकरी · भारत में ❤️ से · GST पंजीकृत",
      latestJobs: "नवीनतम नौकरियाँ",
      results: "परिणाम",
      admitCards: "एडमिट कार्ड",
      syllabus: "पाठ्यक्रम",
      examCalendar: "परीक्षा कैलेंडर",
      answerKeys: "उत्तर कुंजी",
      about: "हमारे बारे में",
      advertise: "विज्ञापन",
      privacy: "गोपनीयता",
      terms: "नियम",
      contact: "संपर्क",
      disclaimerLink: "अस्वीकरण",
    },
    headlines: {
      title: "आधिकारिक सुर्खियाँ",
      wireTitle: "आधिकारिक समाचार और सूचनाएँ",
      wireDesc: "आधिकारिक RSS फ़ीड से सुर्खियाँ (npm run fetch:official चलाएँ)।",
      filteredBy: "फ़िल्टर",
      fromSources: "सत्यापित सरकारी RSS स्रोतों से",
      noMatches: "आपके फ़िल्टर से कोई सुर्खी मेल नहीं खाती।",
      noSnapshot: "नवीनतम RSS स्नैपशॉट में कोई मेल नहीं{{label}}। नीचे आधिकारिक पोर्टल देखें।",
      noPortals: "इस फ़िल्टर के लिए कोई पोर्टल नहीं। राज्य या श्रेणी हटाएँ।",
      clearTopic: "विषय हटाएँ",
      snapshot: "स्नैपशॉट:",
      feedError: "आधिकारिक फ़ीड उपलब्ध नहीं ({{error}})। npm run fetch:official चलाएँ।",
      updated: "अपडेट {{time}}",
      pdf: "PDF",
    },
    sidebar: {
      aria: "सूचनाएँ और त्वरित लिंक",
      notifications: "सूचनाएँ",
      announcements: "नवीनतम घोषणाएँ",
      others: "अन्य",
      latest: "नवीनतम सूचनाएँ",
      employmentNews: "रोजगार समाचार",
      searchJobs: "नौकरी खोजें",
      sarkariJob: "सरकारी नौकरी",
      sarkariNaukri: "सरकारी नौकरियाँ",
      anganwadi: "आंगनवाड़ी भर्ती",
      forest: "वन विभाग नौकरी",
      education: "शिक्षा",
      mockTest: "मुफ़्त मॉक टेस्ट",
      sarkariResult: "सरकारी परिणाम",
      admitCard: "एडमिट कार्ड",
      examResults: "परीक्षा परिणाम",
      answerKey: "उत्तर कुंजी",
      cutoff: "कटऑफ अंक",
      writtenMarks: "लिखित अंक",
      interview: "साक्षात्कार परिणाम",
      lastDate: "अंतिम तिथि अनुस्मारक",
      eligibility: "पात्रता",
      syllabus: "पाठ्यक्रम",
      examPattern: "परीक्षा पैटर्न",
      selection: "चयन प्रक्रिया",
      previousPapers: "पिछले पेपर",
      games: "गेम",
      imageResizer: "इमेज रिसाइज़र",
      pdfToWord: "PDF से Word",
      imageToPdf: "इमेज से PDF",
      wordToPdf: "Word से PDF",
      aiInterview: "मुफ़्त AI इंटरव्यू",
    },
    categoryGrid: { title: "क्षेत्र के अनुसार", clearFilter: "✕ फ़िल्टर हटाएँ" },
    jobDetail: {
      back: "← नौकरियों पर वापस",
      closingIn: "{{count}} दिन में समाप्त!",
      viewDetails: "विवरण देखें →",
      lastDate: "अंतिम:",
      expired: "समाप्त",
      overview: "अवलोकन",
      vacancies: "रिक्तियाँ",
      importantDates: "महत्वपूर्ण तिथियाँ",
      applyOnline: "ऑनलाइन आवेदन",
      officialNotification: "आधिकारिक अधिसूचना",
    },
    common: { age: "आयु {{age}}", allIndia: "पूरा भारत" },
    jobDetail: {
      back: "← नौकरियों पर वापस",
      closingIn: "{{count}} दिन में समाप्त!",
      totalPosts: "कुल पद",
      lastDateLabel: "अंतिम तिथि",
      salary: "वेतन",
      ageLimit: "आयु सीमा",
      applyOfficial: "आधिकारिक वेबसाइट पर आवेदन करें ↗",
      downloadPdf: "अधिसूचना PDF डाउनलोड करें",
      officialWebsite: "आधिकारिक वेबसाइट",
      aboutRecruitment: "इस भर्ती के बारे में",
      importantDates: "महत्वपूर्ण तिथियाँ",
      postWiseVacancy: "पदवार रिक्ति विवरण",
      postsMismatch: "पदों का योग {{sum}} है, अधिसूचना कुल {{total}} है। PDF को स्रोत मानें।",
      postWiseHint: "प्रत्येक पद के लिए कुल पद; आरक्षण/श्रेणी-वार विवरण नीचे दिखाया गया है।",
      postName: "पद का नाम",
      payLevel: "वेतन स्तर",
      categoryWiseVacancy: "श्रेणी-वार रिक्तियाँ (अधिसूचना अनुसार)",
      categoryCol: "श्रेणी",
      categoryTotal: "कुल (श्रेणी-वार)",
      categoryNote: "श्रेणी कुल ({{catSum}}) पद कुल ({{postTotal}}) से भिन्न है — PDF से मिलाएँ।",
      selectionProcess: "चयन प्रक्रिया",
      howToApply: "आवेदन कैसे करें – चरण दर चरण",
      applicationFee: "आवेदन शुल्क",
      eligibilityDetails: "पात्रता विवरण",
      qualification: "योग्यता:",
      nationality: "राष्ट्रीयता:",
      ageRelaxation: "आयु में छूट:",
      attempts: "प्रयास:",
      syllabus: "पाठ्यक्रम:",
      helpdesk: "हेल्पडेस्क:",
      email: "ईमेल:",
      disclaimer: "अस्वीकरण: भारतनौकरी स्वतंत्र एग्रीगेटर है। आवेदन से पहले आधिकारिक साइट पर सत्यापित करें।",
      dates: {
        Notification: "अधिसूचना",
        ApplyStart: "आवेदन प्रारंभ",
        ApplyEnd: "आवेदन समाप्ति",
        Prelims: "प्रारंभिक",
        Mains: "मुख्य",
        Interview: "साक्षात्कार",
        TierI: "टियर-I",
        TierII: "टियर-II",
        DV: "दस्तावेज़ सत्यापन",
        CBT1: "CBT-1",
        CBT2: "CBT-2",
        WrittenExam: "लिखित परीक्षा",
        PSTPET: "PST/PET",
        Medical: "चिकित्सा",
        Joining: "जॉइनिंग",
      },
      fee: { General: "सामान्य", OBC: "OBC", SCST: "अनुसूचित जाति/जनजाति", Female: "महिला", Mode: "भुगतान का तरीका" },
    },
  },
  bn: {
    nav: {
      home: "হোম",
      jobs: "চাকরি",
      results: "ফলাফল",
      admitCard: "অ্যাডমিট কার্ড",
      alert: "সতর্কতা",
      login: "লগইন",
      searchPlaceholder: "চাকরি, রাজ্য, বিভাগ খুঁজুন…",
    },
    lang: { label: "ভাষা", choose: "ভাষা বেছে নিন" },
    ticker: { live: "লাইভ" },
    stateStrip: { topStates: "শীর্ষ রাজ্য:", allIndia: "সমগ্র ভারত" },
    home: {
      tagline: "ভারতের #১ সরকারি চাকরির পোর্টাল",
      dreamJobPrefix: "খুঁজুন আপনার",
      dreamJobHighlight: "স্বপ্নের চাকরি",
      latestJobs: "সর্বশেষ সরকারি চাকরি",
      noJobs: "কোনো চাকরি পাওয়া যায়নি",
    },
    footer: {
      blurb: "ভারতের সবচেয়ে বিস্তৃত সরকারি চাকরির পোর্টাল।",
      quickLinks: "দ্রুত লিংক",
      categories: "বিভাগ",
    },
    jobDetail: {
      back: "← চাকরিতে ফিরে যান",
      closingIn: "{{count}} দিনে শেষ!",
      totalPosts: "মোট পদ",
      lastDateLabel: "শেষ তারিখ",
      salary: "বেতন",
      ageLimit: "বয়স সীমা",
      applyOfficial: "অফিসিয়াল ওয়েবসাইটে আবেদন ↗",
      downloadPdf: "নোটিশ PDF ডাউনলোড",
      officialWebsite: "অফিসিয়াল ওয়েবসাইট",
      aboutRecruitment: "এই নিয়োগ সম্পর্কে",
      importantDates: "গুরুত্বপূর্ণ তারিখ",
      postWiseVacancy: "পদভিত্তিক শূন্যপদের বিবরণ",
      selectionProcess: "নির্বাচন প্রক্রিয়া",
      howToApply: "কীভাবে আবেদন করবেন",
      applicationFee: "আবেদন ফি",
      eligibilityDetails: "যোগ্যতার বিবরণ",
      disclaimer: "দাবিত্যাগ: ভারতনৌকরি স্বাধীন সংগ্রাহক। আবেদনের আগে অফিসিয়াল সাইটে যাচাই করুন।",
    },
  },
  gu: {
    nav: {
      home: "હોમ",
      jobs: "નોકરીઓ",
      results: "પરિણામ",
      admitCard: "એડમિટ કાર્ડ",
      alert: "અલર્ટ",
      login: "લૉગિન",
      searchPlaceholder: "નોકરી, રાજ્ય, વિભાગ શોધો…",
    },
    lang: { label: "ભાષા", choose: "ભાષા પસંદ કરો" },
    home: {
      dreamJobPrefix: "શોધો તમારી",
      dreamJobHighlight: "સ્વપ્નની નોકરી",
      latestJobs: "તાજી સરકારી નોકરીઓ",
    },
  },
  ml: {
    nav: {
      home: "ഹോം",
      jobs: "ജോലികൾ",
      results: "ഫലങ്ങൾ",
      admitCard: "അഡ്മിറ്റ് കാർഡ്",
      alert: "അലർട്ട്",
      login: "ലോഗിൻ",
      searchPlaceholder: "ജോലി, സംസ്ഥാനം, വകുപ്പ് തിരയുക…",
    },
    lang: { label: "ഭാഷ", choose: "ഭാഷ തിരഞ്ഞെടുക്കുക" },
    home: { latestJobs: "ഏറ്റവും പുതിയ സർക്കാർ ജോലികൾ" },
  },
  mr: {
    nav: {
      home: "मुख्यपृष्ठ",
      jobs: "नोकऱ्या",
      results: "निकाल",
      admitCard: "प्रवेशपत्र",
      alert: "सूचना",
      login: "लॉगिन",
      searchPlaceholder: "नोकरी, राज्य, विभाग शोधा…",
    },
    lang: { label: "भाषा", choose: "भाषा निवडा" },
    home: { latestJobs: "नवीनतम सरकारी नोकऱ्या" },
  },
  pa: {
    nav: {
      home: "ਹੋਮ",
      jobs: "ਨੌਕਰੀਆਂ",
      results: "ਨਤੀਜੇ",
      admitCard: "ਐਡਮਿਟ ਕਾਰਡ",
      alert: "ਅਲਰਟ",
      login: "ਲੌਗਇਨ",
      searchPlaceholder: "ਨੌਕਰੀ, ਰਾਜ, ਵਿਭਾਗ ਖੋਜੋ…",
    },
    lang: { label: "ਭਾਸ਼ਾ", choose: "ਭਾਸ਼ਾ ਚੁਣੋ" },
    home: { latestJobs: "ਨਵੀਨਤਮ ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ" },
  },
  or: {
    nav: {
      home: "ହୋମ",
      jobs: "ଚାକିରି",
      results: "ଫଳାଫଳ",
      admitCard: "ଆଡମିଟ୍ କାର୍ଡ",
      alert: "ସতର୍କତା",
      login: "ଲଗଇନ୍",
      searchPlaceholder: "ଚାକିରି, ରାଜ୍ୟ, ବିଭାଗ ଖୋଜନ୍ତୁ…",
    },
    lang: { label: "ଭାଷା", choose: "ଭାଷା ବାଛନ୍ତୁ" },
    home: { latestJobs: "ନୂତନ ସରକାରୀ ଚାକିରି" },
  },
  ur: {
    nav: {
      home: "ہوم",
      jobs: "نوکریاں",
      results: "نتائج",
      admitCard: "ایڈمٹ کارڈ",
      alert: "الرٹ",
      login: "لاگ ان",
      searchPlaceholder: "نوکری، ریاست، محکمہ تلاش کریں…",
    },
    lang: { label: "زبان", choose: "زبان منتخب کریں" },
    home: {
      dreamJobPrefix: "تلاش کریں اپنی",
      dreamJobHighlight: "خوابوں کی نوکری",
      latestJobs: "تازہ سرکاری نوکریاں",
    },
    footer: { blurb: "بھارت کا جامع سرکاری نوکری پورٹل۔" },
  },
  as: {
    nav: { home: "হোম", jobs: "চাকৰি", results: "ফলাফল", login: "লগইন" },
    lang: { label: "ভাষা", choose: "ভাষা বাছনি কৰক" },
    home: { latestJobs: "শেহতীয়া চৰকাৰী চাকৰি" },
  },
  kok: {
    nav: { home: "होम", jobs: "नोकऱ्यो", login: "लॉगिन" },
    lang: { label: "भास", choose: "भास वेंचात" },
  },
  mni: {
    nav: { home: "হোম", jobs: "লৈবা", login: "লগইন" },
    lang: { label: "লোন", choose: "লোন খল্লু" },
  },
  ne: {
    nav: { home: "गृह", jobs: "रोजगार", login: "लगइन" },
    lang: { label: "भाषा", choose: "भाषा छान्नुहोस्" },
    home: { latestJobs: "नवीनतम सरकारी रोजगार" },
  },
  sd: {
    nav: { home: "گهر", jobs: "نوڪريون", login: "لاگ ان" },
    lang: { label: "ٻولي", choose: "ٻولي چونڊيو" },
  },
  sa: {
    nav: { home: "गृहम्", jobs: "कार्याणि", login: "प्रवेशः" },
    lang: { label: "भाषा", choose: "भाषां चिनुत" },
  },
  sat: {
    nav: { home: "ᱚᱲ", jobs: "ᱠᱟᱹᱢᱤ", login: "ᱵᱚᱞᱚᱱ" },
    lang: { label: "ᱯᱟᱹᱨᱥᱤ", choose: "ᱯᱟᱹᱨᱥᱤ ᱚᱵᱚᱛᱟ" },
  },
  mai: {
    nav: { home: "घर", jobs: "नौकरी", login: "लॉगिन" },
    lang: { label: "भाषा", choose: "भाषा चुनू" },
  },
  doi: {
    nav: { home: "घर", jobs: "नौकरियां", login: "लॉगिन" },
    lang: { label: "भाशा", choose: "भाशा चुनो" },
  },
  brx: {
    nav: { home: "न'", jobs: "सोलाय", login: "लगइन" },
    lang: { label: "राव", choose: "राव सायख" },
  },
  ks: {
    nav: { home: "گھر", jobs: "نوکریاں", login: "لاگ ان" },
    lang: { label: "زَبان", choose: "زَبان کٔرِو منتخب" },
  },
};

const LANG_CODES = [
  "hi", "bn", "te", "mr", "ta", "gu", "kn", "ml", "pa", "or", "as", "ur", "kok", "mni", "ne", "sd", "sa", "sat", "mai", "doi", "brx", "ks",
];

const FLATS_DIR = path.join(__dirname, "trees/flats");
/** Locales with at least this many flat strings use the flat pack (not Hindi fallback). */
const FLAT_MIN = 150;

function loadFlat(code) {
  const flatPath = path.join(FLATS_DIR, `${code}.json`);
  if (!fs.existsSync(flatPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(flatPath, "utf8"));
  } catch {
    return null;
  }
}

const built = { en };
built.hi = deepMerge(en, T.hi);

for (const code of LANG_CODES) {
  const manual = T[code] || {};
  const flat = loadFlat(code);
  const filled = flat ? countFilled(flat) : 0;

  if (filled >= FLAT_MIN) {
    built[code] = deepMerge(localeFromFlat(en, flat), manual);
    console.log(`  ${code}: flat pack (${filled} strings)`);
  } else if (code === "hi") {
    /* already set */
  } else {
    /** No full flat — English base + manual patch only (never inherit Hindi). */
    built[code] = deepMerge(en, manual);
    if (filled > 0) {
      built[code] = deepMerge(built[code], localeFromFlat(en, flat));
    }
    console.log(`  ${code}: en + manual (${filled} flat strings)`);
  }
}

const outDir = path.join(root, "src/i18n/localeOverrides");
fs.mkdirSync(outDir, { recursive: true });

const legacyTs = path.join(root, "src/i18n/localeOverrides.ts");
if (fs.existsSync(legacyTs)) fs.unlinkSync(legacyTs);

const codes = Object.keys(built).filter((code) => code !== "en");
for (const code of codes) {
  fs.writeFileSync(
    path.join(outDir, `${code}.json`),
    `${JSON.stringify(built[code], null, 2)}\n`,
    "utf8"
  );
}

console.log(`Wrote ${codes.length} locale packs under src/i18n/localeOverrides/`);
