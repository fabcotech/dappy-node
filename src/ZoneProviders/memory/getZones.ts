import { createNameZone, createRRA, createRRCERT, createRRTXT } from '../../model/fakeData';
import { NameZone } from '../../model/NameZone';

export const getZones = async (): Promise<NameZone[]> => {
  return [
    createNameZone({
      records: [
        createRRA(),
        createRRA({ data: '1.1.1.1' }),
        createRRA({ data: '255.255.255.255' }),
        createRRCERT(),
        createRRCERT(),
        createRRTXT(),
        createRRTXT({ data: 'label2=value2' }),
        createRRTXT({ name: 'foo' }),
      ],
    }),
  ];
};
