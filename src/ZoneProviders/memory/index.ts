export { createGetZones } from './getZones';
export  { getRoutes } from './routes';

const { log } = require('../../log');

export function start() {
  log('memory provider started');
}