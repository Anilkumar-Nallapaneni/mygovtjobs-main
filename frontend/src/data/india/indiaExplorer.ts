import { BROWSE_STATES } from '@/data/states';

export type ExplorerCategoryId =
  | 'jobs' | 'education' | 'agriculture' | 'industries' | 'companies'
  | 'tourism' | 'temples' | 'hotels' | 'hospitals' | 'transport'
  | 'schemes' | 'gk';

export type ExplorerCategory = {
  id: ExplorerCategoryId;
  title: string;
  description: string;
  icon: string;
  route?: string;
};

export const EXPLORER_CATEGORIES: ExplorerCategory[] = [
  { id: 'jobs', title: 'Government jobs', description: 'Browse current public sector opportunities by location.', icon: '💼' },
  { id: 'education', title: 'Education', description: 'Find verified schools, colleges and universities.', icon: '🎓' },
  { id: 'agriculture', title: 'Agriculture', description: 'Explore agriculture offices and allied services.', icon: '🌾' },
  { id: 'industries', title: 'Industries', description: 'Discover public industry and industrial services.', icon: '🏭' },
  { id: 'companies', title: 'Companies', description: 'Browse verified companies and local employers.', icon: '🏢' },
  { id: 'tourism', title: 'Tourism', description: 'Explore local tourism destinations and services.', icon: '🧭' },
  { id: 'temples', title: 'Temples & heritage', description: 'Find temples and heritage places in the area.', icon: '🛕' },
  { id: 'hotels', title: 'Hotels', description: 'Browse verified hotels and accommodation.', icon: '🏨' },
  { id: 'hospitals', title: 'Hospitals', description: 'Find verified hospitals and health services.', icon: '🏥' },
  { id: 'transport', title: 'Transport', description: 'Explore local airports, railways and transport services.', icon: '🚆' },
  { id: 'schemes', title: 'Government schemes', description: 'Browse government schemes and public services.', icon: '📋' },
  { id: 'gk', title: 'Local knowledge', description: 'Explore verified facts and useful local information.', icon: '📍' },
];

export const EXPLORER_STATE_IDS = BROWSE_STATES.map((state) => state.id);

export function getExplorerState(stateId: string) {
  const value = stateId.toLowerCase();
  return BROWSE_STATES.find((state) => state.id === value || state.n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === value) ?? null;
}
