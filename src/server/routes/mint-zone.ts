import { Request, Response } from 'express';
import { NameZone } from '../../model/NameZone';

export const createMintZone =
  (
    getZones: (names: string[]) => Promise<NameZone[]>,
    saveZone: (zone: NameZone) => Promise<void>
  ) =>
  (req: Request, res: Response) => {
    res.send({
      result: 'ok',
    });
  };
