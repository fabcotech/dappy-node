import { Request, Response } from 'express';
import { NameZone } from '../../model/NameZone';

export const createGetZones =
  (getZones: (names: string[]) => Promise<NameZone[]>) =>
  async (req: Request, res: Response) => {
    return res.send({
      result: await getZones(req.body),
    });
  };
