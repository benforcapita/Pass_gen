import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { buildCharacterSet, CHARACTER_TYPES, DEFAULT_OPTIONS, generatePassword, parseLength, secureRandomInt } from '../src/password.ts';
import type { PasswordOptions, RandomFill } from '../src/password.ts';

const fill: RandomFill = bytes => { webcrypto.getRandomValues(bytes); };
function sequence(values: number[]): RandomFill {
  let index = 0;
  return bytes => { assert.ok(index < values.length, 'unexpected random draw'); bytes[0] = values[index++]; };
}

test('category regression: reject a missing-category candidate, then keep all selected types', () => {
  const password = generatePassword({ ...DEFAULT_OPTIONS, length: 4 }, sequence([0, 0, 0, 0, 0, 26, 52, 62]));
  assert.equal(password, 'aA0!');
});

test('uniform byte sampling discards the incomplete range rather than using biased modulo', () => {
  assert.equal(secureRandomInt(87, sequence([255, 254, 174, 173])), 86);
  assert.equal(secureRandomInt(256, sequence([255])), 255);
  assert.equal(secureRandomInt(1, sequence([255])), 0);
});

test('each accepted byte maps equally often for every alphabet size used', () => {
  const sizes = new Set<number>();
  for (let mask = 1; mask < 16; mask++) {
    const options = { ...DEFAULT_OPTIONS };
    CHARACTER_TYPES.forEach((type, index) => { options[type.key] = Boolean(mask & (1 << index)); });
    sizes.add(buildCharacterSet(options).length);
  }
  for (const size of sizes) {
    const frequencies = Array(size).fill(0) as number[];
    const limit = 256 - 256 % size;
    for (let byte = 0; byte < limit; byte++) frequencies[secureRandomInt(size, sequence([byte]))]++;
    assert.ok(frequencies.every(count => count === limit / size));
  }
});

test('all 15 nonempty category combinations are guaranteed at lengths 4, 20, and 128', () => {
  for (let mask = 1; mask < 16; mask++) {
    const options = { ...DEFAULT_OPTIONS };
    CHARACTER_TYPES.forEach((type, index) => { options[type.key] = Boolean(mask & (1 << index)); });
    for (const length of [4, 20, 128]) {
      for (let sample = 0; sample < 40; sample++) {
        const password = generatePassword({ ...options, length }, fill);
        assert.equal(password.length, length);
        assert.ok([...password].every(char => buildCharacterSet(options).includes(char)));
        for (const type of CHARACTER_TYPES) {
          assert.equal([...password].some(char => type.characters.includes(char)), options[type.key]);
        }
      }
    }
  }
});

test('invalid lengths and empty selection fail before consuming randomness', () => {
  const noRandom: RandomFill = () => { assert.fail('invalid input must not consume random bytes'); };
  for (const length of [NaN, Infinity, -Infinity, -1, 0, 3, 4.5, 129, 1e8]) {
    assert.throws(() => generatePassword({ ...DEFAULT_OPTIONS, length }, noRandom), /whole number from 4 to 128/);
  }
  const options: PasswordOptions = { length: 20, includeLowercase: false, includeUppercase: false, includeNumbers: false, includeSymbols: false };
  assert.throws(() => generatePassword(options, noRandom), /at least one/);
});

test('length editing accepts complete integers and rejects partial/coerced input', () => {
  for (const text of ['', ' ', '3', '129', '4.5', '12abc', '1e2', '-8', 'Infinity', 'NaN']) assert.equal(parseLength(text), null);
  for (const [text, value] of [['4', 4], ['20', 20], ['128', 128], [' 16 ', 16]] as const) assert.equal(parseLength(text), value);
});

test('unavailable or pathological random source fails closed and does not hang', () => {
  assert.throws(() => generatePassword(DEFAULT_OPTIONS, () => { throw new Error('crypto unavailable'); }), /crypto unavailable/);
  assert.throws(() => secureRandomInt(87, bytes => { bytes[0] = 255; }), /random data/);
  assert.throws(() => generatePassword({ ...DEFAULT_OPTIONS, length: 4 }, bytes => { bytes[0] = 0; }), /these options/);
  for (const max of [0, -1, 257, Infinity, NaN, 1.5]) assert.throws(() => secureRandomInt(max, fill), /Random range/);
});

test('repeated generation produces new disposable values without changing options', () => {
  const options = { ...DEFAULT_OPTIONS };
  const results = new Set(Array.from({ length: 100 }, () => generatePassword(options, fill)));
  assert.equal(results.size, 100);
  assert.deepEqual(options, DEFAULT_OPTIONS);
});
