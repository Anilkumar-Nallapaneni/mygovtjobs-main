/* States + UTs for browse, map, and job filters (viewBox 0 0 520 580 for legacy mini paths). */
export const STATES = [
  {id:"jk",  n:"Jammu & Kashmir",  ab:"J&K", reg:"north",     cx:155,cy:54,  d:"M90,22 L205,18 L218,44 L200,68 L176,84 L150,92 L120,86 L96,66 Z"},
  {id:"la",  n:"Ladakh",           ab:"LA",  reg:"north",     cx:248,cy:44,  d:"M205,18 L288,17 L302,42 L276,70 L218,70 L200,50 Z"},
  {id:"hp",  n:"Himachal Pradesh", ab:"HP",  reg:"north",     cx:186,cy:112, d:"M150,92 L180,86 L210,97 L205,122 L178,134 L154,120 Z"},
  {id:"pb",  n:"Punjab",           ab:"PB",  reg:"north",     cx:118,cy:102, d:"M96,66 L120,86 L150,92 L150,124 L122,134 L97,122 L84,98 Z"},
  {id:"hr",  n:"Haryana",          ab:"HR",  reg:"north",     cx:156,cy:152, d:"M122,134 L150,124 L178,134 L190,154 L177,174 L152,180 L124,167 Z"},
  {id:"dl",  n:"Delhi",            ab:"DL",  reg:"north",     cx:183,cy:165, d:"M177,154 L191,154 L193,174 L177,174 Z"},
  {id:"ch",  n:"Chandigarh",       ab:"CH",  reg:"north",     cx:168,cy:128, d:"M162,122 L174,122 L176,134 L164,134 Z"},
  {id:"uk",  n:"Uttarakhand",      ab:"UK",  reg:"north",     cx:222,cy:114, d:"M180,97 L210,90 L248,102 L244,124 L213,134 L191,122 Z"},
  {id:"rj",  n:"Rajasthan",        ab:"RJ",  reg:"north",     cx:82, cy:196, d:"M84,98 L97,122 L122,134 L124,167 L130,215 L120,268 L82,278 L48,254 L28,216 L30,167 L52,127 L68,102 Z"},
  {id:"up",  n:"Uttar Pradesh",    ab:"UP",  reg:"north",     cx:242,cy:198, d:"M152,180 L177,174 L193,174 L215,167 L248,157 L302,150 L332,167 L336,198 L312,228 L265,245 L220,258 L176,251 L150,220 L124,210 L124,180 Z"},
  {id:"br",  n:"Bihar",            ab:"BR",  reg:"east",      cx:318,cy:186, d:"M302,150 L332,154 L356,162 L354,200 L326,215 L290,210 L282,188 L289,164 Z"},
  {id:"sk",  n:"Sikkim",           ab:"SK",  reg:"northeast", cx:364,cy:158, d:"M354,150 L372,150 L374,166 L356,166 Z"},
  {id:"wb",  n:"West Bengal",      ab:"WB",  reg:"east",      cx:356,cy:228, d:"M332,160 L354,160 L372,177 L382,213 L369,253 L349,278 L322,281 L322,255 L346,231 L354,200 Z"},
  {id:"as",  n:"Assam",            ab:"AS",  reg:"northeast", cx:420,cy:164, d:"M372,150 L428,140 L462,150 L460,174 L420,184 L372,177 L364,164 Z"},
  {id:"ar",  n:"Arunachal Pradesh",ab:"AR",  reg:"northeast", cx:448,cy:168, d:"M428,140 L488,138 L502,162 L478,188 L440,192 L420,184 L428,158 Z"},
  {id:"nl",  n:"Nagaland",         ab:"NL",  reg:"northeast", cx:468,cy:178, d:"M462,150 L490,148 L498,172 L478,188 L448,180 L460,162 Z"},
  {id:"mn",  n:"Manipur",          ab:"MN",  reg:"northeast", cx:478,cy:202, d:"M466,188 L498,186 L504,210 L484,228 L458,220 L462,198 Z"},
  {id:"mz",  n:"Mizoram",          ab:"MZ",  reg:"northeast", cx:468,cy:228, d:"M448,212 L478,210 L486,236 L462,248 L438,238 L442,218 Z"},
  {id:"tr",  n:"Tripura",          ab:"TR",  reg:"northeast", cx:428,cy:218, d:"M404,212 L432,210 L440,234 L418,246 L398,232 L402,218 Z"},
  {id:"ml",  n:"Meghalaya",        ab:"ML",  reg:"northeast", cx:438,cy:198, d:"M420,184 L448,180 L456,204 L432,216 L408,208 L414,190 Z"},
  {id:"ne",  n:"NE States",        ab:"NE",  reg:"northeast", cx:448,cy:188, d:"M420,140 L462,138 L488,157 L490,188 L466,212 L432,224 L404,212 L410,184 L460,174 Z"},
  {id:"jh",  n:"Jharkhand",        ab:"JH",  reg:"east",      cx:306,cy:251, d:"M282,188 L326,215 L348,231 L342,272 L312,286 L274,276 L259,251 L264,225 Z"},
  {id:"od",  n:"Odisha",           ab:"OD",  reg:"east",      cx:302,cy:314, d:"M274,276 L312,286 L342,272 L354,289 L344,324 L312,344 L274,340 L254,316 L254,292 Z"},
  {id:"mp",  n:"Madhya Pradesh",   ab:"MP",  reg:"central",   cx:220,cy:255, d:"M124,210 L150,220 L176,251 L220,258 L265,245 L312,251 L316,276 L286,292 L254,292 L222,278 L186,278 L152,263 L130,240 L120,224 Z"},
  {id:"cg",  n:"Chhattisgarh",     ab:"CG",  reg:"central",   cx:290,cy:276, d:"M265,245 L312,251 L319,278 L314,302 L286,316 L256,306 L254,292 L286,292 L316,276 Z"},
  {id:"gj",  n:"Gujarat",          ab:"GJ",  reg:"west",      cx:72, cy:292, d:"M28,216 L48,254 L82,278 L110,285 L130,302 L110,329 L70,339 L34,319 L17,283 L20,248 Z"},
  {id:"dd",  n:"Dadra & Nagar Haveli and Daman & Diu", ab:"DD", reg:"west", cx:58,cy:318, d:"M48,308 L68,306 L72,326 L52,328 Z"},
  {id:"mh",  n:"Maharashtra",      ab:"MH",  reg:"west",      cx:168,cy:319, d:"M110,285 L152,263 L186,278 L222,278 L233,302 L222,329 L192,349 L162,359 L124,354 L97,331 L92,311 L110,301 Z"},
  {id:"ga",  n:"Goa",              ab:"GA",  reg:"west",      cx:110,cy:362, d:"M100,354 L114,354 L118,369 L100,369 Z"},
  {id:"tg",  n:"Telangana",        ab:"TG",  reg:"south",     cx:228,cy:362, d:"M192,349 L222,329 L258,339 L264,364 L244,384 L217,388 L194,373 Z"},
  {id:"ap",  n:"Andhra Pradesh",   ab:"AP",  reg:"south",     cx:268,cy:379, d:"M222,329 L254,316 L274,340 L312,344 L319,372 L292,404 L259,416 L223,409 L217,388 L244,384 L264,364 L258,339 Z"},
  {id:"ka",  n:"Karnataka",        ab:"KA",  reg:"south",     cx:161,cy:404, d:"M124,354 L162,359 L192,349 L194,373 L217,388 L223,409 L205,442 L171,454 L133,448 L110,424 L100,393 L100,369 L118,369 L118,359 Z"},
  {id:"kl",  n:"Kerala",           ab:"KL",  reg:"south",     cx:147,cy:476, d:"M133,448 L171,454 L173,479 L155,504 L131,506 L120,483 L123,463 Z"},
  {id:"ld",  n:"Lakshadweep",      ab:"LD",  reg:"south",     cx:52, cy:468, d:"M44,460 L60,458 L62,476 L46,478 Z"},
  {id:"tn",  n:"Tamil Nadu",       ab:"TN",  reg:"south",     cx:203,cy:474, d:"M171,454 L205,442 L223,409 L246,424 L244,464 L219,500 L185,514 L157,499 L155,479 L173,479 Z"},
  {id:"py",  n:"Puducherry",       ab:"PY",  reg:"south",     cx:238,cy:452, d:"M235,446 L244,446 L244,458 L235,458 Z"},
  {id:"an",  n:"Andaman & Nicobar",ab:"AN",  reg:"east",      cx:470,cy:340, d:"M465,320 L476,325 L474,355 L463,352 Z"},
];

/* SVG file uses ISO-style ids (IN-XX). Internal ids that differ from ISO / composite maps. */
const SVG_ID_EXCEPTIONS: Record<string, string> = {
  uk: "IN-UT",
  od: "IN-OR",
  cg: "IN-CT",
  la: "IN-LA",
  ne: "IN-NE",
  dd: "IN-DH",
};

const SVG_TO_STATE_ID: Record<string, string> = {
  "IN-UT": "uk",
  "IN-OR": "od",
  "IN-CT": "cg",
  "IN-LA": "la",
  "IN-NE": "ne",
  "IN-DH": "dd",
  "IN-DD": "dd",
  "IN-DN": "dd",
};

export const toSvgStateId = (stateId: string | null | undefined): string =>
  SVG_ID_EXCEPTIONS[String(stateId || "").toLowerCase()] ||
  `IN-${String(stateId || "").toUpperCase()}`;

/** Reverse map: SVG path id (e.g. IN-MH) → internal state id (e.g. mh). */
export const fromSvgStateId = (svgId: string | null | undefined): string | null => {
  const key = String(svgId || "").toUpperCase();
  if (SVG_TO_STATE_ID[key]) return SVG_TO_STATE_ID[key];
  const match = /^IN-([A-Z]{2})$/.exec(key);
  return match ? match[1].toLowerCase() : null;
};
