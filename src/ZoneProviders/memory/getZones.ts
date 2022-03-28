import { createNameZone, createRRA, createRRCERT } from '../../model/fakeData';
import { NameZone } from '../../model/NameZone';

export const createGetZones = () => async (): Promise<NameZone[]> => {
  return [
    createNameZone({
      records: [
        createRRA(),
        createRRA({ data: '1.1.1.1' }),
        createRRA({ data: '255.255.255.255' }),
        createRRCERT(),
        createRRCERT(),
      ],
    }),
  ];
};
