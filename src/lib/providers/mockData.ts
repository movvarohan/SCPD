// Deterministic-ish mock data generators shared by the mock providers.

const FIRST_NAMES = [
  "Avery", "Jordan", "Priya", "Diego", "Mei", "Liam", "Sofia", "Noah",
  "Ananya", "Ethan", "Maya", "Lucas", "Zara", "Caleb", "Nina", "Omar",
  "Grace", "Ravi", "Elena", "Theo",
];
const LAST_NAMES = [
  "Chen", "Patel", "Garcia", "Kim", "Nguyen", "Johnson", "Okafor", "Rossi",
  "Singh", "Martinez", "Park", "Ahmed", "Lopez", "Cohen", "Wang", "Silva",
  "Brown", "Khan", "Murphy", "Tanaka",
];
const COMPANIES = [
  { name: "Northwind Labs", website: "northwindlabs.com", industry: "AI / ML", size: "51-200" },
  { name: "Cascade Health", website: "cascadehealth.io", industry: "Healthtech", size: "201-500" },
  { name: "Ledgerwise", website: "ledgerwise.com", industry: "Fintech", size: "11-50" },
  { name: "Orbital Logistics", website: "orbitallogistics.com", industry: "Logistics", size: "501-1000" },
  { name: "Brightseed", website: "brightseed.ag", industry: "Agtech", size: "11-50" },
  { name: "Vantage Retail", website: "vantageretail.com", industry: "Retail / E-commerce", size: "1001-5000" },
  { name: "Helio Energy", website: "helioenergy.com", industry: "Climate / Energy", size: "201-500" },
  { name: "Cobalt Security", website: "cobaltsec.io", industry: "Cybersecurity", size: "51-200" },
  { name: "Maplewave", website: "maplewave.com", industry: "SaaS", size: "11-50" },
  { name: "Quanta Bio", website: "quantabio.com", industry: "Biotech", size: "201-500" },
];
const TITLES = [
  { title: "Co-Founder & CEO", seniority: "founder" },
  { title: "Chief Operating Officer", seniority: "c_suite" },
  { title: "VP of Marketing", seniority: "vp" },
  { title: "VP of Product", seniority: "vp" },
  { title: "Director of Strategy", seniority: "director" },
  { title: "Head of Growth", seniority: "head" },
  { title: "Director of Operations", seniority: "director" },
  { title: "Chief Product Officer", seniority: "c_suite" },
  { title: "VP of Sales", seniority: "vp" },
  { title: "Head of Partnerships", seniority: "head" },
];
const LOCATIONS = [
  "San Francisco, CA", "New York, NY", "Palo Alto, CA", "Austin, TX",
  "Boston, MA", "Seattle, WA", "Los Angeles, CA", "Chicago, IL",
];

function pick<T>(arr: T[], n: number): T {
  return arr[n % arr.length];
}

let counter = 0;

export function generateMockLead(seedIndex?: number): {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  workEmail: string;
  linkedinUrl: string;
  title: string;
  seniority: string;
  companyName: string;
  companyWebsite: string;
  industry: string;
  location: string;
  companySize: string;
  verifiedEmail: boolean;
  isStanfordAlum: boolean;
} {
  const i = seedIndex ?? counter++;
  const first = pick(FIRST_NAMES, i * 3 + 1);
  const last = pick(LAST_NAMES, i * 7 + 2);
  const company = pick(COMPANIES, i * 5);
  const role = pick(TITLES, i * 2 + 1);
  const location = pick(LOCATIONS, i);
  const handle = `${first}.${last}`.toLowerCase();
  const isStanfordAlum = i % 4 === 0;
  return {
    firstName: first,
    lastName: last,
    fullName: `${first} ${last}`,
    email: `${handle}@${company.website}`,
    workEmail: `${handle}@${company.website}`,
    linkedinUrl: `https://www.linkedin.com/in/${handle}-${(i % 90) + 10}`,
    title: role.title,
    seniority: role.seniority,
    companyName: company.name,
    companyWebsite: `https://${company.website}`,
    industry: company.industry,
    location,
    companySize: company.size,
    verifiedEmail: i % 3 !== 0,
    isStanfordAlum,
  };
}

export const MOCK_COMPANIES = COMPANIES;
