# json-bigint2

[![CI](https://github.com/bybraveHQ/json-bigint2/actions/workflows/ci.yml/badge.svg)](https://github.com/bybraveHQ/json-bigint2/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/json-bigint2.svg)](https://www.npmjs.com/package/json-bigint2)
[![node](https://img.shields.io/node/v/json-bigint2.svg?color=339933&logo=node.js&logoColor=white)](https://www.npmjs.com/package/json-bigint2)
[![types](https://img.shields.io/badge/types-included-3178C6?logo=typescript&logoColor=white)](index.d.ts)
[![license](https://img.shields.io/npm/l/json-bigint2.svg?color=blue)](LICENSE)

Maintained fork of [json-bigint](https://github.com/sidorares/json-bigint) — `JSON.parse` / `JSON.stringify` that preserve numbers beyond `Number.MAX_SAFE_INTEGER` instead of silently corrupting them.

```js
JSON.parse('{"id":9223372036854775807}').id
// 9223372036854775806  ← corrupted

require('json-bigint2')({ useNativeBigInt: true }).parse('{"id":9223372036854775807}').id
// 9223372036854775807n ← exact
```

## Why this fork

The original `json-bigint` has not been released since 2020, and the code published on npm is older than its master branch — several fixes were merged upstream but never shipped. `json-bigint2` is a drop-in replacement that ships the fixed code plus:

| Change | Upstream issue |
|---|---|
| TypeScript type definitions included | [#34](https://github.com/sidorares/json-bigint/issues/34) |
| Floats no longer crash `useNativeBigInt` mode (shipped, was unreleased on npm) | [#49](https://github.com/sidorares/json-bigint/issues/49), [#88](https://github.com/sidorares/json-bigint/issues/88) |
| Numbers beyond the double range (`3e+500`, 400-digit integers) parse instead of throwing `Bad number` | [#25](https://github.com/sidorares/json-bigint/issues/25), [#26](https://github.com/sidorares/json-bigint/issues/26) |
| `objectProto` option: parsed objects get a normal prototype (`hasOwnProperty`, `toString` work) | [#39](https://github.com/sidorares/json-bigint/issues/39), [#64](https://github.com/sidorares/json-bigint/issues/64) |
| Strict JSON number grammar: `01`, `-01`, `5.`, `1e` are rejected like `JSON.parse` does | [#19](https://github.com/sidorares/json-bigint/issues/19) |
| Parse errors are real `SyntaxError` instances (stack trace, `instanceof Error`) | — |
| Zero dev-dependency test suite on `node:test`, CI on Node 18/20/22 | — |

## Install

```sh
npm install json-bigint2
```

## Usage

```js
const JSONbig = require('json-bigint2')({ useNativeBigInt: true });

const payload = '{"id":9223372036854775807,"name":"deep"}';
const data = JSONbig.parse(payload);
data.id;                    // 9223372036854775807n
JSONbig.stringify(data);    // '{"id":9223372036854775807,"name":"deep"}'
```

Without options, unsafe integers become [bignumber.js](https://github.com/MikeMcl/bignumber.js) instances (original behaviour):

```js
const JSONbig = require('json-bigint2');
JSONbig.parse('{"id":9223372036854775807}').id.toFixed(); // '9223372036854775807'
```

TypeScript:

```ts
import JSONbig = require('json-bigint2');

const parser = JSONbig({ useNativeBigInt: true, objectProto: true });
const data = parser.parse(payload);
```

## Options

| Option | Default | Description |
|---|---|---|
| `useNativeBigInt` | `false` | Use native `BigInt` instead of bignumber.js |
| `alwaysParseAsBig` | `false` | Parse every integer as big, not only unsafe ones |
| `storeAsString` | `false` | Store big numbers as plain strings |
| `strict` | `false` | Throw on duplicate object keys |
| `objectProto` | `false` | Parsed objects get `Object.prototype` instead of a null prototype |
| `protoAction` | `'error'` | `"__proto__"` key handling: `'error'` \| `'ignore'` \| `'preserve'` |
| `constructorAction` | `'error'` | `"constructor"` key handling: `'error'` \| `'ignore'` \| `'preserve'` |

Notes:

- `objectProto: true` is safe against prototype pollution: suspicious keys are still guarded by `protoAction`/`constructorAction`, and member assignment never touches the actual prototype.
- In `useNativeBigInt` mode a number that overflows the double range **and** keeps a fractional part (e.g. `1.55…5e+309`) parses as `Infinity`, mirroring `JSON.parse`.

## Migrating from json-bigint

It is a drop-in replacement:

```diff
- const JSONbig = require('json-bigint')({ useNativeBigInt: true });
+ const JSONbig = require('json-bigint2')({ useNativeBigInt: true });
```

The only behavioural differences are the bug fixes listed above (strict number grammar may reject inputs that were never valid JSON, and parse errors are now `SyntaxError` instances).

## Support

If this package saves you time, you can support maintenance:

[![Ko-fi](https://img.shields.io/badge/Ko--fi-buy%20me%20a%20coffee-FF5E5B?logo=kofi&logoColor=white)](https://ko-fi.com/bybrave)
[![Bitcoin](https://img.shields.io/badge/Bitcoin-BTC-F7931A?logo=bitcoin&logoColor=white)](#support)

Bitcoin (BTC): `bc1q37557q5jpeaxqydzwvf3jgj7zhnfpn2td3q40q`

## Credits & license

MIT. Based on [json-bigint](https://github.com/sidorares/json-bigint) by Andrey Sidorov, which builds on Douglas Crockford's reference JSON parser.
