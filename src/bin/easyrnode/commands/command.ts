import { Api } from '../api';

export interface Command {
  description: string;
  action: (args: string[], api: Api) => Promise<number>;
}
