import {
  createNameZone,
  createRRA,
  createRRCERT,
  createRRCSP,
  createRRTXT,
} from '../../model/fakeData';
import { NameZone } from '../../model/NameZone';

export const zones: Record<string, NameZone> = {
  example: createNameZone({
    records: [
      createRRA(),
      createRRA({ data: '1.1.1.1' }),
      createRRA({ data: '255.255.255.255' }),
      createRRCERT(),
      createRRCERT(),
      createRRCSP(),
      createRRTXT(),
      createRRTXT({ data: 'label2=value2' }),
      createRRTXT({ name: 'foo' }),
    ],
  }),
};
