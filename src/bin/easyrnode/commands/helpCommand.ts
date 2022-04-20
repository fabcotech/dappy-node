import { dedent } from '../../utils/dedent';
import { Command } from './command';

export const createHelpCommand = (commands: {
  [key: string]: Command;
}): Command => ({
  description: dedent`
    Display help information.

    Examples:
    
      easyrnode help
  `,
  action: async (args, api) => {
    if (args.length === 0) {
      api.print(dedent`
      Available commands:\n${Object.keys(commands)
        .filter((cmdName) => cmdName !== 'default')
        .map((cmdName) => `        * ${cmdName}`)
        .join('\n')}
      `);
    } else if (commands[args[0]]) {
      api.print(commands[args[0]].description);
    } else {
      api.print('command not found');
      return 1;
    }
    return 0;
  },
});
