import { expect } from 'chai';

import {
  isObjectWith,
  isArrayNotEmptyOf,
  isStringNotEmpty,
} from './validation';

describe('validation', () => {
  it('isObjectWith()', () => {
    const value = {
      foo: 'bar',
    };

    expect(
      isObjectWith({
        foo: isStringNotEmpty,
      })(value)
    ).to.eql(true);

    const value2 = {
      bar: 'baz',
    };

    expect(
      isObjectWith({
        foo: isStringNotEmpty,
      })(value2)
    ).to.eql(false);
  });
  it('isArrayNotEmptyOf()', () => {
    const listOfNonEmptyStrings = ['foo', 'bar', 'baz'];

    expect(isArrayNotEmptyOf(isStringNotEmpty)(listOfNonEmptyStrings)).to.eql(
      true
    );

    const listWithSomeEmptyStrings = ['foo', 'bar', 'baz', ''];

    expect(
      isArrayNotEmptyOf(isStringNotEmpty)(listWithSomeEmptyStrings)
    ).to.eql(false);

    const listOfSameObjects = [{ foo: 'bar' }, { foo: 'baz' }, { foo: 'qux' }];

    expect(
      isArrayNotEmptyOf(isObjectWith({ foo: isStringNotEmpty }))(
        listOfSameObjects
      )
    ).to.eql(true);

    const listOfDifferentsObjects = [
      { foo: 'bar' },
      { foo: 'baz' },
      { bar: 'qux' },
    ];

    expect(
      isArrayNotEmptyOf(isObjectWith({ foo: isStringNotEmpty }))(
        listOfDifferentsObjects
      )
    ).to.eql(false);
  });
});
