import { createNameZone } from '../../model/fakeData';
import { NameZone } from '../../model/NameZone';

export const createGetZones = () => async (): Promise<NameZone[]> => {
  return [createNameZone()];
};
