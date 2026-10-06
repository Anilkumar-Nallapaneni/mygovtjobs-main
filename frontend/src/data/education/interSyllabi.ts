import { LAST_VERIFIED } from "./officialSources";
import type { InterSyllabus } from "./educationTypes";

const TGBIE = {
  sourceName: "Telangana Board of Intermediate Education",
  sourceUrl: "https://tgbie.cgg.gov.in/",
  lastVerified: LAST_VERIFIED,
};

const mathsIA11 = {
  name: "Mathematics IA",
  chapters: ["Sets", "Relations & Functions", "Mathematical Induction", "Matrices", "Trigonometric Functions"],
};

const mathsIB11 = {
  name: "Mathematics IB",
  chapters: ["Vector Algebra", "Measures of Dispersion", "Probability", "Random Variables", "Limits & Derivatives"],
};

const mathsIIA12 = {
  name: "Mathematics IIA",
  chapters: ["Complex Numbers", "Quadratic Equations", "Permutations & Combinations", "Binomial Theorem", "Sequences & Series", "Straight Lines", "Conic Sections"],
};

const mathsIIB12 = {
  name: "Mathematics IIB",
  chapters: ["Integration", "Definite Integrals", "Differential Equations", "Probability", "Vectors", "Three Dimensional Geometry", "Plane"],
};

const physicsI11 = {
  name: "Physics I",
  chapters: ["Physical World", "Units & Measurements", "Motion in a Straight Line", "Motion in a Plane", "Laws of Motion", "Work, Energy & Power"],
};

const physicsII11 = {
  name: "Physics II",
  chapters: ["System of Particles", "Gravitation", "Mechanical Properties of Solids", "Mechanical Properties of Fluids", "Thermal Properties of Matter", "Thermodynamics"],
};

const physicsI12 = {
  name: "Physics I",
  chapters: ["Kinetic Theory", "Oscillations", "Waves", "Electric Charges & Fields", "Electrostatics", "Current Electricity"],
};

const physicsII12 = {
  name: "Physics II",
  chapters: ["Magnetism", "EMI", "AC", "EM Waves", "Ray Optics", "Wave Optics", "Dual Nature", "Atoms & Nuclei", "Semiconductors"],
};

const chemistryI11 = {
  name: "Chemistry I",
  chapters: ["Atomic Structure", "Classification of Elements", "Chemical Bonding", "States of Matter", "Stoichiometry", "Thermodynamics"],
};

const chemistryII11 = {
  name: "Chemistry II",
  chapters: ["Equilibrium", "Hydrogen & s-Block", "p-Block Elements (Group 13-14)", "Organic Chemistry Basics", "Hydrocarbons", "Environmental Chemistry"],
};

const chemistryI12 = {
  name: "Chemistry I",
  chapters: ["Solid State", "Solutions", "Electrochemistry", "Chemical Kinetics", "Surface Chemistry", "Metallurgy", "d & f Block", "Coordination Compounds"],
};

const chemistryII12 = {
  name: "Chemistry II",
  chapters: ["Haloalkanes", "Alcohols & Phenols", "Aldehydes & Ketones", "Carboxylic Acids", "Amines", "Biomolecules", "Polymers", "Chemistry in Everyday Life"],
};

const economicsI = {
  name: "Economics I",
  chapters: [
    "Introduction to Economics",
    "Theories of Consumer Behaviour",
    "Demand Analysis",
    "Production Analysis",
    "Market Analysis",
    "Theories of Distribution",
    "National Income Analysis",
    "Theories of Employment and Public Finance",
    "Money, Banking and Inflation",
    "Basic Statistics for Economics",
  ],
};

const economicsII = {
  name: "Economics II",
  chapters: [
    "Economic Growth and Economic Development",
    "Demography and Human Resource Development",
    "National Income, Poverty and Unemployment",
    "Planning and NITI Aayog",
    "Agricultural Sector",
    "Industrial Sector",
    "Tertiary Sector",
    "Foreign Sector",
    "Environmental Economics",
    "Telangana Economy",
  ],
};

const commerceI = {
  name: "Commerce I",
  chapters: [
    "Introduction to Business",
    "Business Activities",
    "Sole Proprietorship, Joint Hindu Family Business and Cooperative Societies",
    "Partnership Firm",
    "Joint Stock Company",
    "Formation of a Company",
    "Commencement of Business",
    "Business Finance",
    "Source of Business Finance",
    "Micro, Small and Medium Enterprises (MSMEs)",
  ],
};

const commerceII = {
  name: "Commerce II",
  chapters: [
    "Financial Markets",
    "Stock Exchange",
    "Banking Services",
    "Insurance Services",
    "Entrepreneurship",
    "Setting up a Business",
    "Internal Trade",
    "International Trade",
    "Principles of Management",
    "Functions of Management",
  ],
};

const accountancyI = {
  name: "Accountancy I",
  chapters: [
    "Book Keeping and Accounting",
    "Business Transactions",
    "Subsidiary Books",
    "Cash Book",
    "Bank Reconciliation Statement",
    "Trial Balance",
    "Rectification of Errors",
    "Final Accounts of Sole Trading Concerns",
    "Preparation of Final Accounts",
  ],
};

const accountancyII = {
  name: "Accountancy II",
  chapters: [
    "Depreciation",
    "Consignment Accounts",
    "Accounting for Not-for-Profit Organisation",
    "Partnership Accounts",
    "Admission of a Partner",
    "Retirement and Death of a Partner",
    "Computerised Accounting System",
  ],
};

const politicalScienceI = {
  name: "Political Science I",
  chapters: [
    "Meaning, Nature and Scope of Political Science",
    "State and Sovereignty",
    "Nation, Nationality and Nationalism",
    "Political Concepts",
    "Political Ideologies",
    "Rights and Duties",
    "Citizenship",
    "Democracy",
    "Secularism",
    "Constitution",
  ],
};

const politicalScienceII = {
  name: "Political Science II",
  chapters: [
    "Indian Constitution — Historical Background",
    "Fundamental Rights and Directive Principles of State Policy",
    "Union Government",
    "State Government",
    "Centre-State Relations",
    "Local Government",
    "Electoral System in India",
    "Contemporary Issues in Indian Politics",
    "Emergence of Telangana State",
    "Smart Governance",
  ],
};

const botanyI = {
  name: "Botany I",
  chapters: [
    "The Living World",
    "Biological Classification",
    "Science of Plants – Botany",
    "Plant Kingdom",
    "Morphology of Flowering Plants",
    "Modes of Reproduction",
    "Sexual Reproduction in Flowering Plants",
    "Taxonomy of Angiosperms",
    "Cell: The Unit of Life",
    "Biomolecules",
    "Cell Cycle and Cell Division",
    "Histology and Anatomy of Flowering Plants",
    "Ecological Adaptation, Succession and Ecological Services",
  ],
};

const botanyII = {
  name: "Botany II",
  chapters: [
    "Transport in Plants",
    "Mineral Nutrition",
    "Enzymes",
    "Photosynthesis in Higher Plants",
    "Respiration in Plants",
    "Plant Growth and Development",
    "Bacteria",
    "Viruses",
    "Principles of Inheritance and Variation",
    "Molecular Basis of Inheritance",
    "Biotechnology: Principles and Processes",
    "Biotechnology and its Applications",
    "Strategies for Enhancement in Food Production",
    "Microbes in Human Welfare",
  ],
};

const zoologyI = {
  name: "Zoology I",
  chapters: [
    "Diversity of Living World",
    "Structural Organisation in Animals",
    "Animal Diversity-I: Invertebrate Phyla",
    "Animal Diversity-II: Phylum Chordata",
    "Locomotion and Reproduction in Protozoa",
    "Biology in Human Welfare",
    "Type Study of Periplaneta Americana",
    "Ecology and Environment",
  ],
};

const zoologyII = {
  name: "Zoology II",
  chapters: [
    "Human Anatomy and Physiology – I",
    "Human Anatomy and Physiology – II",
    "Human Anatomy and Physiology – III",
    "Human Anatomy and Physiology – IV",
    "Human Reproduction",
    "Reproductive Health",
    "Genetics",
    "Organic Evolution",
    "Applied Biology",
  ],
};

const historyI = {
  name: "History I",
  chapters: [
    "What is History",
    "Early Human Societies",
    "First Civilisations",
    "Empires in India",
    "Medieval Political Formations",
    "Bhakti and Sufi Traditions",
    "World History: Revolutions",
    "Industrialisation",
  ],
};

const historyII = {
  name: "History II",
  chapters: [
    "Colonialism and Indian Society",
    "Revolt of 1857",
    "National Movement 1885–1947",
    "Making of the Indian Constitution",
    "Post-Independence Consolidation",
    "World Wars and the UN",
    "Telangana Movement and State Formation",
    "Themes in Contemporary History",
  ],
};

function yearCard(stream, year, subjects) {
  return { stream, year, ...TGBIE, subjects };
}

export const interSyllabi: InterSyllabus[] = [
  yearCard("mpc", 11, [mathsIA11, mathsIB11, physicsI11, physicsII11, chemistryI11, chemistryII11]),
  yearCard("mpc", 12, [mathsIIA12, mathsIIB12, physicsI12, physicsII12, chemistryI12, chemistryII12]),
  yearCard("bipc", 11, [botanyI, zoologyI, physicsI11, physicsII11, chemistryI11, chemistryII11]),
  yearCard("bipc", 12, [botanyII, zoologyII, physicsI12, physicsII12, chemistryI12, chemistryII12]),
  yearCard("mec", 11, [mathsIA11, mathsIB11, economicsI, commerceI, accountancyI]),
  yearCard("mec", 12, [mathsIIA12, mathsIIB12, economicsII, commerceII, accountancyII]),
  yearCard("cec", 11, [politicalScienceI, economicsI, commerceI, accountancyI]),
  yearCard("cec", 12, [politicalScienceII, economicsII, commerceII, accountancyII]),
  yearCard("hec", 11, [historyI, economicsI, politicalScienceI]),
  yearCard("hec", 12, [historyII, economicsII, politicalScienceII]),
];
