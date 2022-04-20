import path from 'path';

import { dedent } from '../../utils/dedent';
import { Command } from './command';

export const initCommand: Command = {
  description: dedent`
    Initialize rchain genesis block.
    Address of following private key is provisioned with REVs :
    28a5c9ac133b4449ca38e9bdf7cacdce31079ef6b3ac2f0a080af83ecff98b36

    It create ./.rnode/genesis folder structure.

    Examples:
      # Run local rnode
      easyrnode init 
  `,
  action: async ([...rest], api) => {
    await api.command(path.join(__dirname, './assets/rnode-init.sh'));

    return 0;
  },
};
