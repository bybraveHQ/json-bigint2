// Test suite ported from the original json-bigint package (mocha/chai -> node:test).
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const BigNumber = require('bignumber.js');
const makeJSON = require('../index.js');

describe('bigint support', () => {
  const input = '{"big":9223372036854775807,"small":123}';

  it('classic JSON.parse lacks bigint support', () => {
    const obj = JSON.parse(input);
    assert.equal(obj.small.toString(), '123');
    assert.notEqual(obj.big.toString(), '9223372036854775807');
    assert.notEqual(JSON.stringify(obj), input);
  });

  it('supports bigint parse/stringify roundtrip', () => {
    const JSONbig = makeJSON();
    const obj = JSONbig.parse(input);
    assert.equal(obj.small.toString(), '123');
    assert.equal(obj.big.toString(), '9223372036854775807');
    assert.ok(obj.big instanceof BigNumber);
    assert.equal(JSONbig.stringify(obj), input);
  });
});

describe('native BigInt support: parse', () => {
  const input =
    '{"big":92233720368547758070,"small":123,"deci":1234567890.0123456,"shortExp":1.79e+308,"longExp":1.7976931348623157e+308}';

  it('parses unsafe integers as native BigInt', () => {
    const JSONbig = makeJSON({ useNativeBigInt: true });
    const obj = JSONbig.parse(input);
    assert.equal(obj.small, 123);
    assert.equal(obj.big.toString(), '92233720368547758070');
    assert.equal(typeof obj.big, 'bigint');
  });

  it('supports forced parsing to native BigInt', () => {
    const JSONbig = makeJSON({ alwaysParseAsBig: true, useNativeBigInt: true });
    const obj = JSONbig.parse(input);
    assert.equal(obj.big.toString(), '92233720368547758070');
    assert.equal(typeof obj.big, 'bigint');
    assert.equal(obj.small.toString(), '123');
    assert.equal(typeof obj.small, 'bigint');
  });

  it('supports decimal and scientific notation parse/stringify roundtrip', () => {
    const JSONbig = makeJSON({ useNativeBigInt: true });
    const obj = JSONbig.parse(input);
    assert.equal(obj.deci.toString(), '1234567890.0123456');
    assert.equal(typeof obj.deci, 'number');
    assert.equal(obj.shortExp.toString(), '1.79e+308');
    assert.equal(typeof obj.shortExp, 'number');
    assert.equal(obj.longExp.toString(), '1.7976931348623157e+308');
    assert.equal(typeof obj.longExp, 'number');
    assert.equal(JSONbig.stringify(obj), input);
  });

  it('supports native BigInt parse/stringify roundtrip', () => {
    const JSONbig = makeJSON({ useNativeBigInt: true });
    assert.equal(JSONbig.stringify(JSONbig.parse(input)), input);
  });

  it('supports native BigInt roundtrip when BigInt is forced', () => {
    const JSONbig = makeJSON({ alwaysParseAsBig: true, useNativeBigInt: true });
    assert.equal(JSONbig.stringify(JSONbig.parse(input)), input);
  });
});

describe('native BigInt support: stringify', () => {
  it('stringifies native BigInt', () => {
    const JSONbig = makeJSON();
    const obj = {
      big: 123456789012345678901234567890n,
      small: -42,
      bigConstructed: BigInt(1),
      smallConstructed: Number(2),
    };
    assert.equal(
      JSONbig.stringify(obj),
      '{' +
        '"big":123456789012345678901234567890,' +
        '"small":-42,' +
        '"bigConstructed":1,' +
        '"smallConstructed":2' +
        '}'
    );
  });
});

describe("'storeAsString' option", () => {
  const key = '{ "key": 12345678901234567 }';

  it('stores unsafe integers as object by default', () => {
    const JSONbig = makeJSON();
    assert.equal(typeof JSONbig.parse(key).key, 'object');
  });

  it('stores unsafe integers as string when storeAsString is true', () => {
    const JSONstring = makeJSON({ storeAsString: true });
    assert.equal(typeof JSONstring.parse(key).key, 'string');
  });
});

describe("'strict' option", () => {
  const dupkeys = '{ "dupkey": "value 1", "dupkey": "value 2"}';

  it('duplicate keys get overwritten by default', () => {
    const JSONbig = makeJSON();
    assert.equal(JSONbig.parse(dupkeys).dupkey, 'value 2');
  });

  it('strict option fails fast on duplicate keys', () => {
    const JSONstrict = makeJSON({ strict: true });
    assert.throws(
      () => JSONstrict.parse(dupkeys),
      /Duplicate key "dupkey"/
    );
  });
});

describe('__proto__ and constructor assignment', () => {
  it('sets __proto__ property but not a prototype if protoAction is preserve', () => {
    const JSONbig = makeJSON({ protoAction: 'preserve' });
    const obj1 = JSONbig.parse('{ "__proto__": 1000000000000000 }');
    assert.equal(Object.getPrototypeOf(obj1), null);
    const obj2 = JSONbig.parse('{ "__proto__": { "admin": true } }');
    assert.notEqual(obj2.admin, true);
  });

  it('throws if protoAction is set to invalid value', () => {
    assert.throws(
      () => makeJSON({ protoAction: 'invalid value' }),
      /Incorrect value for protoAction option/
    );
  });

  it('throws if constructorAction is set to invalid value', () => {
    assert.throws(
      () => makeJSON({ constructorAction: 'invalid value' }),
      /Incorrect value for constructorAction option/
    );
  });

  it('throws if protoAction is error and there is a __proto__ property', () => {
    const JSONbig = makeJSON({ protoAction: 'error' });
    assert.throws(
      () => JSONbig.parse('{ "\\u005f_proto__": 1000000000000000 }'),
      /Object contains forbidden prototype property/
    );
  });

  it('throws if constructorAction is error and there is a constructor property', () => {
    const JSONbig = makeJSON({ protoAction: 'error' });
    assert.throws(
      () => JSONbig.parse('{ "constructor": 1000000000000000 }'),
      /Object contains forbidden constructor property/
    );
  });

  it('ignores __proto__ property if protoAction is ignore', () => {
    const JSONbig = makeJSON({ protoAction: 'ignore' });
    const obj1 = JSONbig.parse(
      '{ "__proto__": 1000000000000000, "a" : 42, "nested": { "__proto__": false, "b": 43 } }'
    );
    assert.equal(Object.getPrototypeOf(obj1), null);
    // spread into plain objects: deepEqual in strict mode compares prototypes,
    // and parsed objects have a null prototype by default
    assert.deepEqual({ ...obj1, nested: { ...obj1.nested } }, { a: 42, nested: { b: 43 } });
  });

  it('ignores constructor property if constructorAction is ignore', () => {
    const JSONbig = makeJSON({ constructorAction: 'ignore' });
    const obj1 = JSONbig.parse(
      '{ "constructor": 1000000000000000, "a" : 42, "nested": { "constructor": false, "b": 43 } }'
    );
    assert.deepEqual({ ...obj1, nested: { ...obj1.nested } }, { a: 42, nested: { b: 43 } });
  });
});
