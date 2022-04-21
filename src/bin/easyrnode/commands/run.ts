import path from 'path';

import { dedent } from '../../utils/dedent';
import { Command } from './command';

export const runCommand: Command = {
  description: dedent`
    Run command
    
    Examples:
      # Run local rnode
      easyrnode run 
  `,
  action: async ([...rest], api) => {
    await api.command(path.join(__dirname, './assets/rnode-run.sh'));

    return 0;
  },
};
