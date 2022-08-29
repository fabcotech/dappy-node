import { NameZone } from '../../model/NameZone';
import { zones } from './zones';

export const getZones = async (names: string[]): Promise<NameZone[]> => {
  return Object.entries(zones)
    .filter(([k]) => names.includes(k))
    .map(([, v]) => v);
};
