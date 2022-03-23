import { createNameZone } from "../../model/fakeData";
import { NameZone } from "../../model/NameZone";

export const createGetZones = (store: any) => async (names: string[]): Promise<NameZone[]> => {
  return [createNameZone()];
};