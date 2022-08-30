import { Router } from 'express';
import { NameZone } from '../model/NameZone';

export interface ZoneProvider {
  getZones: (names: string[]) => Promise<NameZone[]>;
  saveZone: (zone: NameZone) => Promise<void>;
  start(): Promise<void>;
  getRoutes(): Router;
}
