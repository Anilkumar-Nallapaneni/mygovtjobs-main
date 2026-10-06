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

export const EXPLORER_STATE_IDS = BROWSE_STATES.map((state) => state.id);

export function getExplorerState(stateId: string) {
  return BROWSE_STATES.find((state) => state.id === stateId) ?? null;
}
