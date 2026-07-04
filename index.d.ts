import { BigNumber } from 'bignumber.js';

declare namespace JSONBigInt {
  interface Options {
    /**
     * @default false
     * Fail on duplicate object keys instead of silently overwriting them.
     */
    strict?: boolean;
    /**
     * @default false
     * Store big numbers as plain strings instead of BigNumber/BigInt.
     */
    storeAsString?: boolean;
    /**
     * @default false
     * Parse every number as BigNumber/BigInt, not only the unsafe ones.
     */
    alwaysParseAsBig?: boolean;
    /**
     * @default false
     * Use native BigInt instead of bignumber.js.
     */
    useNativeBigInt?: boolean;
    /**
     * @default 'error'
     * What to do with a "__proto__" key: throw, drop it, or keep it as a member.
     */
    protoAction?: 'error' | 'ignore' | 'preserve';
    /**
     * @default 'error'
     * What to do with a "constructor" key: throw, drop it, or keep it as a member.
     */
    constructorAction?: 'error' | 'ignore' | 'preserve';
    /**
     * @default false
     * Create parsed objects with Object.prototype ({}) instead of a null
     * prototype, so they have hasOwnProperty, toString, etc.
     */
    objectProto?: boolean;
  }

  type Reviver = (key: string, value: any) => any;
  type Replacer =
    | ((key: string, value: any) => any)
    | (string | number)[]
    | null;

  interface JSONBig {
    parse(text: string, reviver?: Reviver): any;
    stringify(value: any, replacer?: Replacer, space?: string | number): string;
  }
}

declare function JSONBigInt(options?: JSONBigInt.Options): JSONBigInt.JSONBig;

declare namespace JSONBigInt {
  function parse(text: string, reviver?: Reviver): any;
  function stringify(
    value: any,
    replacer?: Replacer,
    space?: string | number
  ): string;
}

export = JSONBigInt;
