import { Command, getCommands } from './commands';
import { Api, command, print, readFile } from './api';

function processShutdown(code: number) {
  process.exit(code);
}

export async function processCli({
  parameters,
  commands,
  api,
}: {
  parameters: string[];
  commands: { [key: string]: Command };
  api: Api;
}): Promise<number> {
  let cmdName = '';
  let cmdParameters = [''];

  if (parameters.length === 0) {
    api.print('missing command');
    return 1;
  }

  [cmdName] = parameters;

  if (!commands[cmdName]) {
    cmdParameters = parameters;

    if (!commands.default) {
      api.print('command not found');
      return 1;
    }

    cmdName = 'default';
  } else {
    cmdParameters = parameters.slice(1);
  }
  return commands[cmdName].action(cmdParameters, api);
}

export async function runCli(
  parameters: Partial<{
    args: string[];
    shutdown: (code: number) => void;
    commands: { [key: string]: Command };
    api: Api;
  }> = {}
) {
  const shutdown = parameters.shutdown || processShutdown;
  const commands = parameters.commands || getCommands();
  const api = parameters.api || {
    print,
    command,
    readFile,
  };

  let code = 0;

  try {
    code = await processCli({
      parameters: !parameters.args ? process.argv.slice(2) : parameters.args,
      commands,
      api,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    api.print((err as Error).message);
    code = 1;
  } finally {
    await shutdown(code);
  }
}
