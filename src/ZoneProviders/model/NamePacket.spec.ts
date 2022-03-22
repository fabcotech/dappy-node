import chai, { expect } from 'chai';
import spies from 'chai-spies';

import { isNamePacket } from './NamePacket';
import {
  createNamePacketErrorResponse,
  createNamePacketQuery,
  createNamePacketSuccessResponse,
} from './fakeData';

chai.use(spies);

describe('NamePacket', () => {
  it('isNamePacket()', () => {
    expect(isNamePacket(createNamePacketQuery())).to.eql(true);
    expect(isNamePacket(createNamePacketSuccessResponse())).to.eql(true);
    expect(isNamePacket(createNamePacketErrorResponse())).to.eql(true);
    const notNameZone = {
      foo: 'bar',
    };
    expect(isNamePacket(notNameZone)).to.eql(false);
  });
});
