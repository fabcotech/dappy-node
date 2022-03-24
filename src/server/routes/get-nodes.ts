import { Request, Response } from 'express';

// eslint-disable-next-line import/prefer-default-export
export const getNodes = (store: any) => (req: Request, res: Response) => {
  if (store.nodes) {
    res.json({
      data: store.nodes,
    });
  } else {
    res.status(404).end();
  }
};
