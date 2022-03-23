import { getXRecordsWsHandler } from './get-x-records';
import { pickRandomReadOnly } from './pickRandomReadOnly';
import { log } from '../../log';
import { NameZone } from '../../model/NameZone';

export const createGetZones = (store: any) => async (names: string[]): Promise<NameZone[]> => {
  const result = await getXRecordsWsHandler({ names },
  {
    redisClient: store.redisClient,
    log,
    urlOrOptions: pickRandomReadOnly(store),
  });

  if (!result.success) {
    throw new Error('Failed to get zones from rchain');
  }

  return result.records as NameZone[];
};