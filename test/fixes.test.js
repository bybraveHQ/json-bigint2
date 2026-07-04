// Tests for the fixes and features added in json-bigint2 on top of json-bigint.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const BigNumber = require('bignumber.js');
const makeJSON = require('../index.js');

describe('strict JSON number grammar (json-bigint #19)', () => {
  const JSONbig = makeJSON();
  const invalid = ['01', '-01', '007', '5.', '5.e3', '1e', '1e+', '.5', '-'];

  for (const text of invalid) {
    it(`rejects "${text}" like JSON.parse does`, () => {
      assert.throws(() => JSON.parse(text));
      assert.throws(() => JSONbig.parse(text));
    });
  }

  it('still accepts valid numbers', () => {
    assert.equal(JSONbig.parse('0'), 0);
    assert.equal(JSONbig.parse('-0.5'), -0.5);
    assert.equal(JSONbig.parse('0.5e+3'), 500);
    assert.equal(JSONbig.parse('10'), 10);
  });
});

describe('numbers beyond the double range (json-bigint #25, #26)', () => {
  it('parses 3e+500 as BigNumber by default', () => {
    const obj = makeJSON().parse('{"v":3e+500}');
    assert.ok(BigNumber.isBigNumber(obj.v));
    assert.ok(obj.v.isEqualTo('3e+500'));
  });

  it('parses a 400-digit integer as BigNumber by default', () => {
    const digits = '9'.repeat(400);
    const obj = makeJSON().parse(`{"v":${digits}}`);
    assert.ok(BigNumber.isBigNumber(obj.v));
    assert.equal(obj.v.toFixed(), digits);
  });

  it('parses 3e+500 as native BigInt when useNativeBigInt is set', () => {
    const obj = makeJSON({ useNativeBigInt: true }).parse('{"v":3e+500}');
    assert.equal(typeof obj.v, 'bigint');
    assert.equal(obj.v, 3n * 10n ** 500n);
  });

  it('parses -1.25e+320 as native BigInt (exponent absorbs the fraction)', () => {
    const obj = makeJSON({ useNativeBigInt: true }).parse('{"v":-1.25e+320}');
    assert.equal(obj.v, -125n * 10n ** 318n);
  });

  it('returns the raw string when storeAsString is set', () => {
    const obj = makeJSON({ storeAsString: true }).parse('{"v":3e+500}');
    assert.equal(obj.v, '3e+500');
  });

  it('mirrors JSON.parse (Infinity) for a fractional overflow in native mode', () => {
    const text = '{"v":1.' + '5'.repeat(400) + 'e+309}';
    const obj = makeJSON({ useNativeBigInt: true }).parse(text);
    assert.equal(obj.v, Infinity);
    assert.equal(JSON.parse(text).v, Infinity);
  });
});

describe('floats in native BigInt mode (json-bigint #49, #88)', () => {
  it('parses a long fraction as a plain number, not BigInt', () => {
    const JSONbig = makeJSON({ useNativeBigInt: true });
    assert.equal(JSONbig.parse('-0.3333333333333333'), -0.3333333333333333);
    assert.equal(JSONbig.parse('0.8120414029545044'), 0.8120414029545044);
  });
});

describe('objectProto option (json-bigint #39, #64)', () => {
  it('parsed objects have a null prototype by default', () => {
    const obj = makeJSON().parse('{"a":1}');
    assert.equal(Object.getPrototypeOf(obj), null);
  });

  it('parsed objects get Object.prototype when objectProto is set', () => {
    const obj = makeJSON({ objectProto: true }).parse('{"a":1,"nested":{"b":2}}');
    assert.equal(Object.getPrototypeOf(obj), Object.prototype);
    assert.equal(Object.getPrototypeOf(obj.nested), Object.prototype);
    assert.ok(obj.hasOwnProperty('a'));
    assert.equal(obj.toString(), '[object Object]');
  });

  it('does not pollute the prototype when combined with protoAction preserve', () => {
    const JSONbig = makeJSON({ objectProto: true, protoAction: 'preserve' });
    const obj = JSONbig.parse('{"__proto__":{"admin":true},"a":1}');
    assert.equal(Object.getPrototypeOf(obj), Object.prototype);
    assert.notEqual(obj.admin, true);
    assert.ok(Object.getOwnPropertyNames(obj).includes('__proto__'));
    assert.equal(({}).admin, undefined);
  });

  it('still blocks __proto__ by default when objectProto is set', () => {
    const JSONbig = makeJSON({ objectProto: true });
    assert.throws(
      () => JSONbig.parse('{"__proto__":{"admin":true}}'),
      /Object contains forbidden prototype property/
    );
  });
});
