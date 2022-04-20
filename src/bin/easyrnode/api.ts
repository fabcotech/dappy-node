import { spawn } from 'child_process';
import process from 'process';
import psTree from 'ps-tree';
import { readFile as nodeReadFile } from 'fs';

export function print(str: string) {
  // eslint-disable-next-line no-console
  console.log(str);
}

function recursiveKill(pid: number, signal: string, callback?: () => void) {
  signal = signal || 'SIGKILL';
  callback = callback || (() => {});
  const killTree = true;
  if (killTree) {
    psTree(pid, (err, children) => {
      ([pid] as any)
        .concat(children.map((p) => p.PID))
        .forEach((tpid: number) => {
          try {
            process.kill(tpid, signal);
          } catch (ex) {
            // empty
          }
        });
      if (callback) callback();
    });
  } else {
    try {
      process.kill(pid, signal);
    } catch (ex) {
      // empty
    }
    callback();
  }
}

export function command(name: string, ...args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const cmd = spawn(name, args);

    cmd.stdout.on('data', (data) => {
      const str = data.toString().replace(/\n$/, '');
      if (str && str.length) {
        print(str);
      }
    });

    cmd.stderr.on('data', (data) => {
      const str = data.toString().replace(/\n$/, '');
      if (str && str.length) {
        print(str);
      }
    });

    cmd.on('error', (error) => {
      print(error.message);
    });

    cmd.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`child process exited with code ${code}`));
      }
      resolve(undefined);
    });

    process.on('SIGINT', () => {
      if (cmd.pid) {
        recursiveKill(cmd.pid, 'SIGINT');
      }
    });
  });
}

export const readFile = (path: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    nodeReadFile(path, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });
};

export interface Api {
  print: typeof print;
  command: typeof command;
  readFile: typeof readFile;
}
