import { getXRecordsWsHandler } from './get-x-records';
import { pickRandomReadOnly } from './pickRandomReadOnly';
import { log } from '../../log';
import { NameZone } from '../../model/NameZone';
import { getStore } from '../../store';

export const getZones = async (names: string[]): Promise<NameZone[]> => {
  const store = getStore();
  const result = await getXRecordsWsHandler(
    { names },
    {
      redisClient: store.redisClient,
      log,
      urlOrOptions: pickRandomReadOnly(),
    }
  );

  if (!result.success) {
    throw new Error('Failed to get zones from rchain');
  }

  return result.records?.map((r) => JSON.parse(r.data)) as NameZone[];
};
