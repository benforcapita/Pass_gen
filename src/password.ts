export type PasswordOptions = {
  length: number;
  includeLowercase: boolean;
  includeUppercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
};

export const CHARACTER_TYPES = [
  { key: 'includeLowercase', label: 'Lowercase', example: 'a–z', characters: 'abcdefghijklmnopqrstuvwxyz' },
  { key: 'includeUppercase', label: 'Uppercase', example: 'A–Z', characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  { key: 'includeNumbers', label: 'Numbers', example: '0–9', characters: '0123456789' },
  { key: 'includeSymbols', label: 'Symbols', example: '!@#$', characters: '!@#$%^&*()_+-=[]{}|;:,.<>?~' },
] as const;

export const DEFAULT_OPTIONS: PasswordOptions = {
  length: 20,
  includeLowercase: true,
  includeUppercase: true,
  includeNumbers: true,
  includeSymbols: true,
};

/** Fill bytes with the platform CSPRNG. There is deliberately no Math.random fallback. */
export type RandomFill = (bytes: Uint8Array) => void;

export function buildCharacterSet(options: PasswordOptions): string {
  return CHARACTER_TYPES.filter(type => options[type.key]).map(type => type.characters).join('');
}

export function parseLength(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const length = Number(text);
  return Number.isSafeInteger(length) && length >= 4 && length <= 128 ? length : null;
}

/** Reject the incomplete byte range, so each accepted index is equally likely. */
export function secureRandomInt(maxExclusive: number, fill: RandomFill): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > 256) {
    throw new Error('Random range must be a whole number from 1 to 256.');
  }
  const limit = 256 - (256 % maxExclusive);
  const byte = new Uint8Array(1);
  for (let attempt = 0; attempt < 1024; attempt++) {
    fill(byte);
    if (byte[0] < limit) return byte[0] % maxExclusive;
  }
  throw new Error('Could not generate random data. Please try again.');
}

export function generatePassword(options: PasswordOptions, fill: RandomFill): string {
  if (!Number.isInteger(options.length) || options.length < 4 || options.length > 128) {
    throw new Error('Choose a whole number from 4 to 128.');
  }
  const categories = CHARACTER_TYPES.filter(type => options[type.key]);
  if (categories.length === 0) throw new Error('Select at least one character type.');
  const alphabet = buildCharacterSet(options);

  // Every candidate is sampled uniformly. Accept only candidates containing all
  // selected types: no overwrites, fixed category positions, or biased repair.
  // A finite limit fails closed even with an unavailable/broken random source.
  for (let attempt = 0; attempt < 1024; attempt++) {
    let candidate = '';
    for (let i = 0; i < options.length; i++) {
      candidate += alphabet[secureRandomInt(alphabet.length, fill)];
    }
    if (categories.every(type => [...candidate].some(char => type.characters.includes(char)))) {
      return candidate;
    }
  }
  throw new Error('Could not generate a password with these options. Please try again.');
}
