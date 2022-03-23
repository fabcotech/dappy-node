import { Request, Response } from "express";

// eslint-disable-next-line import/prefer-default-export
export const ping = (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.write(JSON.stringify({ data: 'pong' }));
  res.end();
};
