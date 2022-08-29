import { Request, Response } from 'express';
import { NameZone } from '../../model/NameZone';

export const createMintZone =
  (
    getZones: (names: string[]) => Promise<NameZone[]>,
    saveZone: (zone: NameZone) => Promise<void>
  ) =>
  async (req: Request, res: Response) => {
    await saveZone(req.body);
    res.send({
      result: 'ok',
    });
  };
