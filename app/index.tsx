import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, TouchableOpacity, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import { StatusBar } from 'expo-status-bar';

type PasswordOptions = {
  length: number;
  includeLowercase: boolean;
  includeUppercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
};

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?~';

function secureRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) {
    throw new Error('maxExclusive must be positive');
  }
  const maxByte = 256;
  const limit = Math.floor(maxByte / maxExclusive) * maxExclusive;
  while (true) {
    const byteArray = new Uint8Array(1);
    Crypto.getRandomValues(byteArray);
    const value = byteArray[0];
    if (value < limit) {
      return value % maxExclusive;
    }
  }
}

function buildCharacterSet(options: PasswordOptions): string {
  let chars = '';
  if (options.includeLowercase) chars += LOWERCASE;
  if (options.includeUppercase) chars += UPPERCASE;
  if (options.includeNumbers) chars += NUMBERS;
  if (options.includeSymbols) chars += SYMBOLS;
  return chars;
}

function ensureAtLeastOneFromEachCategory(passwordChars: string[], options: PasswordOptions): void {
  const categories: Array<[boolean, string]> = [
    [options.includeLowercase, LOWERCASE],
    [options.includeUppercase, UPPERCASE],
    [options.includeNumbers, NUMBERS],
    [options.includeSymbols, SYMBOLS],
  ];

  for (const [enabled, set] of categories) {
    if (!enabled) continue;
    const idxToReplace = secureRandomInt(passwordChars.length);
    const replacementChar = set[secureRandomInt(set.length)];
    passwordChars[idxToReplace] = replacementChar;
  }
}

function secureShuffle<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    const tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
}

function generatePassword(options: PasswordOptions): string {
  const { length } = options;
  const charset = buildCharacterSet(options);
  if (charset.length === 0) {
    throw new Error('Select at least one character type');
  }
  if (length < 4) {
    throw new Error('Password length must be at least 4');
  }

  const chars: string[] = [];
  for (let i = 0; i < length; i++) {
    const idx = secureRandomInt(charset.length);
    chars.push(charset[idx]);
  }

  ensureAtLeastOneFromEachCategory(chars, options);
  secureShuffle(chars);

  return chars.join('');
}

export default function Index() {
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    includeLowercase: true,
    includeUppercase: true,
    includeNumbers: true,
    includeSymbols: false,
  });
  const [password, setPassword] = useState('');

  const charsetPreview = useMemo(() => buildCharacterSet(options), [options]);

  function regenerate() {
    try {
      const next = generatePassword(options);
      setPassword(next);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to generate password');
    }
  }

  useEffect(() => {
    regenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyToClipboard() {
    if (!password) return;
    await Clipboard.setStringAsync(password);
    Alert.alert('Copied', 'Password copied to clipboard');
  }

  function clampLength(value: number): number {
    if (Number.isNaN(value)) return options.length;
    return Math.min(128, Math.max(4, Math.floor(value)));
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <Text style={styles.title}>Secure Password Generator</Text>

      <View style={styles.card}>
        <Text selectable style={styles.password} numberOfLines={2}>
          {password}
        </Text>

        <View style={styles.row}>
          <TouchableOpacity style={styles.button} onPress={regenerate}>
            <Text style={styles.buttonText}>Generate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondary]} onPress={copyToClipboard}>
            <Text style={[styles.buttonText, styles.secondaryText]}>Copy</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.options}>
        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>Length</Text>
          <View style={styles.lengthControls}>
            <TouchableOpacity
              style={[styles.pillButton]}
              onPress={() => setOptions(o => ({ ...o, length: clampLength(o.length - 1) }))}
            >
              <Text style={styles.pillText}>-</Text>
            </TouchableOpacity>

            <TextInput
              value={String(options.length)}
              onChangeText={txt =>
                setOptions(o => ({ ...o, length: clampLength(parseInt(txt, 10)) }))
              }
              keyboardType="number-pad"
              style={styles.lengthInput}
            />

            <TouchableOpacity
              style={[styles.pillButton]}
              onPress={() => setOptions(o => ({ ...o, length: clampLength(o.length + 1) }))}
            >
              <Text style={styles.pillText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>Lowercase (a-z)</Text>
          <Switch
            value={options.includeLowercase}
            onValueChange={v => setOptions(o => ({ ...o, includeLowercase: v }))}
          />
        </View>

        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>Uppercase (A-Z)</Text>
          <Switch
            value={options.includeUppercase}
            onValueChange={v => setOptions(o => ({ ...o, includeUppercase: v }))}
          />
        </View>

        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>Numbers (0-9)</Text>
          <Switch
            value={options.includeNumbers}
            onValueChange={v => setOptions(o => ({ ...o, includeNumbers: v }))}
          />
        </View>

        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>Symbols (!@#...)</Text>
          <Switch
            value={options.includeSymbols}
            onValueChange={v => setOptions(o => ({ ...o, includeSymbols: v }))}
          />
        </View>

        <Text style={styles.preview} numberOfLines={1}>
          Charset size: {charsetPreview.length}
        </Text>
      </View>

      <Text style={styles.note}>
        This app never stores passwords. It generates a new one on demand and only allows copying to the clipboard.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
    padding: 16,
    gap: 16,
  },
  title: {
    color: '#E2E8F0',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  password: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#052016',
    fontWeight: '700',
    fontSize: 16,
  },
  secondary: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryText: {
    color: '#E2E8F0',
  },
  options: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLabel: {
    color: '#CBD5E1',
    fontSize: 16,
  },
  lengthControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lengthInput: {
    width: 56,
    height: 36,
    backgroundColor: '#111827',
    color: '#E5E7EB',
    borderRadius: 6,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#374151',
    padding: 0,
  },
  pillButton: {
    width: 36,
    height: 36,
    backgroundColor: '#1F2937',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  pillText: {
    color: '#E2E8F0',
    fontSize: 18,
    fontWeight: '700',
  },
  preview: {
    color: '#94A3B8',
    marginTop: 4,
  },
  note: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
});