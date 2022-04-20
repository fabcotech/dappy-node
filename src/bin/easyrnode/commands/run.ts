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
    await api.command(
      'docker-compose',
      '-f',
      path.join(__dirname, './assets/docker-compose.yml'),
      'up'
    );

    return 0;
  },
};
