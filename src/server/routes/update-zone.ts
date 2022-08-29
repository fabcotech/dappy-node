import { Request, Response } from 'express';
import { NameZone } from '../../model/NameZone';

export const createUpdateZone =
  (
    getZones: (names: string[]) => Promise<NameZone[]>,
    saveZone: (zone: NameZone) => Promise<void>
  ) =>
  (req: Request, res: Response) => {
    throw new Error('not implemented');
  };
