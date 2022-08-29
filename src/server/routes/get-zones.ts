import { Request, Response } from 'express';
import { NameZone } from '../../model/NameZone';

export const createGetZones =
  (getZones: (names: string[]) => Promise<NameZone[]>) =>
  (req: Request, res: Response) => {
    throw new Error('not implemented');
  };
