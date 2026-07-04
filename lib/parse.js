var BigNumber = null;

// regexpxs extracted from
// (c) BSD-3-Clause
// https://github.com/fastify/secure-json-parse/graphs/contributors and https://github.com/hapijs/bourne/graphs/contributors

const suspectProtoRx = /(?:_|\\u005[Ff])(?:_|\\u005[Ff])(?:p|\\u0070)(?:r|\\u0072)(?:o|\\u006[Ff])(?:t|\\u0074)(?:o|\\u006[Ff])(?:_|\\u005[Ff])(?:_|\\u005[Ff])/;
const suspectConstructorRx = /(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)/;

/*
    json_parse.js

    Based on the public-domain reference JSON parser by Douglas Crockford
    and the json-bigint package by Andrey Sidorov.

    This file creates a json_parse function.
    During create you can (optionally) specify some behavioural switches

        require('@bybrave/json-bigint2')(options)

            The optional options parameter holds switches that drive certain
            aspects of the parsing process:
            * options.strict = true will warn about duplicate-key usage in the json.
              The default (strict = false) will silently ignore those and overwrite
              values for keys that are in duplicate use.

    The resulting function follows this signature:
        json_parse(text, reviver)
            This method parses a JSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.
*/

// Expand a JSON number in scientific notation to a plain integer string,
// e.g. "3e+5" -> "300000", "1.23e4" -> "12300". Returns null when the value
// is not an exact integer (fractional digits survive the exponent shift) —
// such values cannot be represented by BigInt.
function toIntegerString(string) {
  var match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(string);
  if (!match) return null;
  var sign = match[1],
    integer = match[2],
    fraction = match[3] || '',
    exponent = match[4] === undefined ? 0 : parseInt(match[4], 10);
  if (exponent < fraction.length) return null;
  return sign + integer + fraction + '0'.repeat(exponent - fraction.length);
}

var json_parse = function (options) {
  'use strict';

  // This is a function that can parse a JSON text, producing a JavaScript
  // data structure. It is a simple, recursive descent parser. It does not use
  // eval or regular expressions, so it can be used as a model for implementing
  // a JSON parser in other languages.

  // We are defining the function inside of another function to avoid creating
  // global variables.

  // Default options one can override by passing options to the parse()
  var _options = {
    strict: false, // not being strict means do not generate syntax errors for "duplicate key"
    storeAsString: false, // toggles whether the values should be stored as BigNumber (default) or a string
    alwaysParseAsBig: false, // toggles whether all numbers should be Big
    useNativeBigInt: false, // toggles whether to use native BigInt instead of bignumber.js
    protoAction: 'error',
    constructorAction: 'error',
    objectProto: false, // toggles whether parsed objects get Object.prototype ({}) instead of null prototype
  };

  // If there are options, then use them to override the default _options
  if (options !== undefined && options !== null) {
    if (options.strict === true) {
      _options.strict = true;
    }
    if (options.storeAsString === true) {
      _options.storeAsString = true;
    }
    _options.alwaysParseAsBig =
      options.alwaysParseAsBig === true ? options.alwaysParseAsBig : false;
    _options.useNativeBigInt =
      options.useNativeBigInt === true ? options.useNativeBigInt : false;
    _options.objectProto = options.objectProto === true;

    if (typeof options.constructorAction !== 'undefined') {
      if (
        options.constructorAction === 'error' ||
        options.constructorAction === 'ignore' ||
        options.constructorAction === 'preserve'
      ) {
        _options.constructorAction = options.constructorAction;
      } else {
        throw new Error(
          `Incorrect value for constructorAction option, must be "error", "ignore" or undefined but passed ${options.constructorAction}`
        );
      }
    }

    if (typeof options.protoAction !== 'undefined') {
      if (
        options.protoAction === 'error' ||
        options.protoAction === 'ignore' ||
        options.protoAction === 'preserve'
      ) {
        _options.protoAction = options.protoAction;
      } else {
        throw new Error(
          `Incorrect value for protoAction option, must be "error", "ignore" or undefined but passed ${options.protoAction}`
        );
      }
    }
  }

  var at, // The index of the current character
    ch, // The current character
    escapee = {
      '"': '"',
      '\\': '\\',
      '/': '/',
      b: '\b',
      f: '\f',
      n: '\n',
      r: '\r',
      t: '\t',
    },
    text,
    error = function (m) {
      // Call error when something is wrong.
      // A real SyntaxError (instead of a plain object) keeps a stack trace
      // and works with `instanceof Error`; `at` and `text` are preserved.

      var e = new SyntaxError(m);
      e.at = at;
      e.text = text;
      throw e;
    },
    next = function (c) {
      // If a c parameter is provided, verify that it matches the current character.

      if (c && c !== ch) {
        error("Expected '" + c + "' instead of '" + ch + "'");
      }

      // Get the next character. When there are no more characters,
      // return the empty string.

      ch = text.charAt(at);
      at += 1;
      return ch;
    },
    number = function () {
      // Parse a number value following the JSON grammar strictly:
      // int part is 0 or [1-9][0-9]* (no leading zeros), '.' and 'e'
      // each require at least one digit after them.

      var number,
        string = '';

      if (ch === '-') {
        string = '-';
        next('-');
      }
      if (ch === '0') {
        string += ch;
        next();
        if (ch >= '0' && ch <= '9') {
          error('Bad number');
        }
      } else if (ch >= '1' && ch <= '9') {
        while (ch >= '0' && ch <= '9') {
          string += ch;
          next();
        }
      } else {
        error('Bad number');
      }
      if (ch === '.') {
        string += '.';
        next();
        if (!(ch >= '0' && ch <= '9')) {
          error('Bad number');
        }
        while (ch >= '0' && ch <= '9') {
          string += ch;
          next();
        }
      }
      if (ch === 'e' || ch === 'E') {
        string += ch;
        next();
        if (ch === '-' || ch === '+') {
          string += ch;
          next();
        }
        if (!(ch >= '0' && ch <= '9')) {
          error('Bad number');
        }
        while (ch >= '0' && ch <= '9') {
          string += ch;
          next();
        }
      }
      number = +string;
      if (!isFinite(number)) {
        // The value overflows the double range (> 1.7976931348623157e+308).
        // It is still a valid JSON number, so hand it to the big-number
        // representation instead of failing with 'Bad number'.
        if (_options.storeAsString) {
          return string;
        }
        if (_options.useNativeBigInt) {
          var integerString = toIntegerString(string);
          // A fractional overflow (e.g. "1.5e400" is exact only with a
          // fractional part) cannot be a BigInt — mirror JSON.parse and
          // return Infinity.
          return integerString !== null ? BigInt(integerString) : number;
        }
        if (BigNumber == null) BigNumber = require('bignumber.js');
        return new BigNumber(string);
      } else {
        if (BigNumber == null) BigNumber = require('bignumber.js');
        if (Number.isSafeInteger(number))
          return !_options.alwaysParseAsBig
            ? number
            : _options.useNativeBigInt
            ? BigInt(number)
            : new BigNumber(number);
        else
          // Number with fractional part should be treated as number(double) including big integers in scientific notation, i.e 1.79e+308
          return _options.storeAsString
            ? string
            : /[\.eE]/.test(string)
            ? number
            : _options.useNativeBigInt
            ? BigInt(string)
            : new BigNumber(string);
      }
    },
    string = function () {
      // Parse a string value.

      var hex,
        i,
        string = '',
        uffff;

      // When parsing for string values, we must look for " and \ characters.

      if (ch === '"') {
        var startAt = at;
        while (next()) {
          if (ch === '"') {
            if (at - 1 > startAt) string += text.substring(startAt, at - 1);
            next();
            return string;
          }
          if (ch === '\\') {
            if (at - 1 > startAt) string += text.substring(startAt, at - 1);
            next();
            if (ch === 'u') {
              uffff = 0;
              for (i = 0; i < 4; i += 1) {
                hex = parseInt(next(), 16);
                if (!isFinite(hex)) {
                  break;
                }
                uffff = uffff * 16 + hex;
              }
              string += String.fromCharCode(uffff);
            } else if (typeof escapee[ch] === 'string') {
              string += escapee[ch];
            } else {
              break;
            }
            startAt = at;
          }
        }
      }
      error('Bad string');
    },
    white = function () {
      // Skip whitespace.

      while (ch && ch <= ' ') {
        next();
      }
    },
    word = function () {
      // true, false, or null.

      switch (ch) {
        case 't':
          next('t');
          next('r');
          next('u');
          next('e');
          return true;
        case 'f':
          next('f');
          next('a');
          next('l');
          next('s');
          next('e');
          return false;
        case 'n':
          next('n');
          next('u');
          next('l');
          next('l');
          return null;
      }
      error("Unexpected '" + ch + "'");
    },
    value, // Place holder for the value function.
    array = function () {
      // Parse an array value.

      var array = [];

      if (ch === '[') {
        next('[');
        white();
        if (ch === ']') {
          next(']');
          return array; // empty array
        }
        while (ch) {
          array.push(value());
          white();
          if (ch === ']') {
            next(']');
            return array;
          }
          next(',');
          white();
        }
      }
      error('Bad array');
    },
    setMember = function (object, key, memberValue) {
      // With objectProto enabled a plain assignment of a "__proto__" key
      // would replace the object's prototype instead of creating a member —
      // defineProperty always creates an own property.
      if (_options.objectProto) {
        Object.defineProperty(object, key, {
          value: memberValue,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      } else {
        object[key] = memberValue;
      }
    },
    object = function () {
      // Parse an object value.

      var key,
        object = _options.objectProto ? {} : Object.create(null);

      if (ch === '{') {
        next('{');
        white();
        if (ch === '}') {
          next('}');
          return object; // empty object
        }
        while (ch) {
          key = string();
          white();
          next(':');
          if (
            _options.strict === true &&
            Object.hasOwnProperty.call(object, key)
          ) {
            error('Duplicate key "' + key + '"');
          }

          if (suspectProtoRx.test(key) === true) {
            if (_options.protoAction === 'error') {
              error('Object contains forbidden prototype property');
            } else if (_options.protoAction === 'ignore') {
              value();
            } else {
              setMember(object, key, value());
            }
          } else if (suspectConstructorRx.test(key) === true) {
            if (_options.constructorAction === 'error') {
              error('Object contains forbidden constructor property');
            } else if (_options.constructorAction === 'ignore') {
              value();
            } else {
              setMember(object, key, value());
            }
          } else {
            setMember(object, key, value());
          }

          white();
          if (ch === '}') {
            next('}');
            return object;
          }
          next(',');
          white();
        }
      }
      error('Bad object');
    };

  value = function () {
    // Parse a JSON value. It could be an object, an array, a string, a number,
    // or a word.

    white();
    switch (ch) {
      case '{':
        return object();
      case '[':
        return array();
      case '"':
        return string();
      case '-':
        return number();
      default:
        return ch >= '0' && ch <= '9' ? number() : word();
    }
  };

  // Return the json_parse function. It will have access to all of the above
  // functions and variables.

  return function (source, reviver) {
    var result;

    text = source + '';
    at = 0;
    ch = ' ';
    result = value();
    white();
    if (ch) {
      error('Syntax error');
    }

    // If there is a reviver function, we recursively walk the new structure,
    // passing each name/value pair to the reviver function for possible
    // transformation, starting with a temporary root object that holds the result
    // in an empty key. If there is not a reviver function, we simply return the
    // result.

    return typeof reviver === 'function'
      ? (function walk(holder, key) {
          var k,
            v,
            value = holder[key];
          if (value && typeof value === 'object') {
            Object.keys(value).forEach(function (k) {
              v = walk(value, k);
              if (v !== undefined) {
                value[k] = v;
              } else {
                delete value[k];
              }
            });
          }
          return reviver.call(holder, key, value);
        })({ '': result }, '')
      : result;
  };
};

module.exports = json_parse;
