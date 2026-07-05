# Changelog

Maintained fork of [sidorares/json-bigint](https://github.com/sidorares/json-bigint).

## 2.0.0 — 2026-07-05

### Added
- TypeScript type definitions (`index.d.ts`), verified with `tsc --strict` (#34)
- Native `BigInt` support via the `useNativeBigInt` option
- `objectProto` option to control whether parsed objects use `Object.prototype` (#39, #64)

### Fixed
- String parsing bug in `useNativeBigInt` mode (#88)
- Floats no longer parsed as `BigInt` (#49)
- Numbers larger than `Number.MAX_VALUE` are now preserved (#25, #26)
- `parse("-01")` now throws instead of being silently accepted; strict number grammar (#19)
- Throw a real `SyntaxError` on invalid input instead of a bare object
