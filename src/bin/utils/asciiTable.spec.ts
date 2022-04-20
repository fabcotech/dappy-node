import chai, { expect } from 'chai';
import spies from 'chai-spies';

import { dedent } from './dedent';
import { asciiTable } from './asciiTable';

chai.use(spies);

describe('ascii tables', () => {
  it('constant row lengths', async () => {
    const r = asciiTable([
      ['a', 'b', 'c'],
      ['e', 'f', 'g'],
      ['h', 'i', 'j'],
    ]);

    expect(r).to.equal(
      dedent`a    b    c
             e    f    g
             h    i    j`,
    );
  });

  it('variable row lengths', async () => {
    const r = asciiTable([
      ['a', 'b', 'cccccccc'],
      ['e', 'fffffffffff', 'g'],
      ['hhhhhhhhhhhh', 'i', 'j'],
    ]);

    expect(r).to.equal(
      dedent`a               b              cccccccc
             e               fffffffffff    g       
             hhhhhhhhhhhh    i              j       `,
    );
  });
});
