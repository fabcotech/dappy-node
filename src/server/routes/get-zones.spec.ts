import chai from 'chai';
import spies from 'chai-spies';

const { expect } = chai;
chai.use(spies);

describe('get-zones', () => {
  it('should works', () => {
    expect(true).to.equal(true);
  });
});
