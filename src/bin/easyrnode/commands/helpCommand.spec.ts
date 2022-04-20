import chai, { expect } from 'chai';
import spies from 'chai-spies';
import { createHelpCommand } from './helpCommand';
import { dedent } from '../../utils/dedent';

chai.use(spies);

describe('cli command: help', () => {
  it('no arguments, list all commands', async () => {
    let stdout = '';
    const print = (str: string) => {
      stdout += `${str}\n`;
    };
    const commands = {
      foo: {
        description: 'foo command description.',
        action: () => Promise.resolve(0),
      },
      bar: {
        description: 'bar command description.',
        action: () => Promise.resolve(0),
      },
    };
    await createHelpCommand(commands).action([], {
      print,
      command: () => Promise.resolve(),
      readFile: () => Promise.resolve(''),
    });
    expect(stdout).to.contains(dedent`
    Available commands:
      * foo
      * bar
    `);
  });
  it('display command description', async () => {
    let stdout = '';
    const print = (str: string) => {
      stdout += `${str}\n`;
    };
    const commands = {
      foo: {
        description: 'foo command description.',
        action: () => Promise.resolve(0),
      },
      bar: {
        description: 'bar command description.',
        action: () => Promise.resolve(0),
      },
      default: {
        description: 'default command description.',
        action: () => Promise.resolve(0),
      },
    };
    await createHelpCommand(commands).action(['foo'], {
      print,
      command: () => Promise.resolve(),
      readFile: () => Promise.resolve(''),
    });
    expect(stdout).to.contains(commands.foo.description);
  });
  it('command not found', async () => {
    let stdout = '';
    const print = (str: string) => {
      stdout += `${str}\n`;
    };
    const commands = {};
    const code = await createHelpCommand(commands).action(['foo'], {
      print,
      command: () => Promise.resolve(),
      readFile: () => Promise.resolve(''),
    });
    expect(stdout).to.contains('command not found');
    expect(code).to.eql(1);
  });
});
