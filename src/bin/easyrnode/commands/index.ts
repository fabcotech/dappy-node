import { Command } from './command';
import { runCommand } from './run';
import { createHelpCommand } from './helpCommand';
import { deployCommand } from './deploy';

export { Command } from './command';

export const getCommands = (): { [key: string]: Command } => {
  const commands = {
    run: runCommand,
    deploy: deployCommand,
  } as { [key: string]: Command };

  commands.help = createHelpCommand(commands);

  return commands;
};
