import { NameZone } from '../../model/NameZone';
import { zones } from './zones';

export const saveZone = async (zone: NameZone): Promise<void> => {
  return new Promise((resolve) => {
    zones[zone.origin] = zone;
    resolve();
  });
};
