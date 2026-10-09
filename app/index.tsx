import React, { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import { StatusBar } from 'expo-status-bar';
import { buildCharacterSet, CHARACTER_TYPES, DEFAULT_OPTIONS, generatePassword, parseLength } from '../src/password';
import type { PasswordOptions } from '../src/password';
import { ClipboardTimeoutError, copyWithTimeout } from '../src/clipboard';

type Notice = { text: string; error?: boolean } | null;

export default function Index() {
  const { width } = useWindowDimensions();
  const narrow = width < 800;
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_OPTIONS);
  const [lengthText, setLengthText] = useState(String(DEFAULT_OPTIONS.length));
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [copying, setCopying] = useState(false);
  const revision = useRef(0);
  const length = parseLength(lengthText);
  const charsetSize = buildCharacterSet(options).length;
  const validation = length === null ? 'Choose a whole number from 4 to 128.' : charsetSize === 0 ? 'Select at least one character type.' : null;

  function clearResult() {
    revision.current++;
    setPassword('');
    setNotice(null);
    setCopying(false);
  }

  function updateLength(text: string) {
    setLengthText(text);
    clearResult();
  }

  function regenerate() {
    if (validation || length === null) return;
    clearResult();
    try {
      setPassword(generatePassword({ ...options, length }, bytes => { Crypto.getRandomValues(bytes); }));
      setNotice({ text: 'New password generated.' });
    } catch {
      setNotice({ text: 'Random generation is unavailable. Try again in a supported browser or app.', error: true });
    }
  }

  async function copyToClipboard() {
    if (!password || copying) return;
    const current = revision.current;
    setCopying(true);
    setNotice(null);
    try {
      await copyWithTimeout(async () => {
      // Direct web API reports denial. Legacy fallbacks can falsely report success.
      if (Platform.OS === 'web') {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(password);
      } else {
        const copied = await Clipboard.setStringAsync(password);
        if (!copied) throw new Error('Clipboard unavailable');
      }
      });
      if (revision.current === current) setNotice({ text: 'Copied to clipboard.' });
    } catch (error) {
      if (revision.current === current) setNotice({ text: error instanceof ClipboardTimeoutError ? 'Copy was not confirmed. Select the password and copy it manually.' : 'Copy was blocked. Select the password and copy it manually.', error: true });
    } finally {
      if (revision.current === current) setCopying(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.pageContent, narrow && styles.pageContentNarrow]} keyboardShouldPersistTaps="handled">
      <StatusBar style="light" />
      <View style={styles.content}>
        <View style={styles.nav}>
          <View style={styles.brand}><Text style={styles.brandMark}>p_</Text><Text style={styles.brandName}>pass_gen</Text></View>
          <View style={styles.badge}><View style={styles.dot} /><Text style={styles.badgeText}>ON YOUR DEVICE</Text></View>
        </View>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>ONE LESS THING TO THINK ABOUT</Text>
          <Text role="heading" aria-level={1} style={[styles.title, narrow && styles.titleNarrow]}>A fresh password.{'\n'}Just for you.</Text>
          <Text style={styles.subtitle}>Choose your characters. Generate. Copy. Done.</Text>
        </View>

        <View style={[styles.workspace, narrow && styles.workspaceNarrow]}>
          <View style={[styles.resultCard, narrow && styles.resultCardNarrow]}>
            <View style={styles.cardHeading}><Text style={styles.overline}>YOUR PASSWORD</Text><Text style={styles.localTag}>LOCAL ONLY</Text></View>
            <TextInput
              accessibilityLabel="Generated password"
              value={password}
              placeholder="Ready when you are."
              placeholderTextColor="#7e91a3"
              editable={false}
              multiline
              autoComplete="off"
              autoCorrect={false}
              spellCheck={false}
              style={[styles.password, { minHeight: password.length > 64 ? 160 : 112 }]}
            />
            <View style={styles.resultMeta}>
              <Text style={styles.muted}>{password ? `${password.length} characters · selected types included` : 'Your password appears here'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Clear from screen" disabled={!password} onPress={clearResult} style={[styles.clear, !password && styles.disabled]}>
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Generate password" accessibilityState={{ disabled: Boolean(validation) }} disabled={Boolean(validation)} onPress={regenerate} style={({ pressed }) => [styles.generate, validation && styles.disabled, pressed && styles.pressed]}>
              <Text style={styles.generateText}>Generate password</Text><Text style={styles.generateIcon}>+</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Copy password" accessibilityState={{ disabled: !password || copying }} disabled={!password || copying} onPress={copyToClipboard} style={({ pressed }) => [styles.copy, (!password || copying) && styles.disabled, pressed && styles.pressed]}>
              <Text style={styles.copyText}>{copying ? 'Copying…' : 'Copy password'}</Text>
            </Pressable>
            <View style={styles.noticeArea}>
              <Text accessibilityLiveRegion="polite" role={notice?.error ? 'alert' : 'status'} style={[styles.notice, notice?.error && styles.error]}>{notice?.text ?? 'Generated here. Never sent to a server.'}</Text>
            </View>
          </View>

          <View style={[styles.settings, narrow && styles.settingsNarrow]}>
            <Text role="heading" aria-level={2} style={styles.settingsTitle}>Make it yours</Text>
            <View style={styles.lengthHeading}><Text style={styles.optionLabel}>Password length</Text><Text style={styles.muted}>4–128</Text></View>
            <View style={styles.lengthControls}>
              <Pressable accessibilityRole="button" accessibilityLabel="Decrease length" disabled={length === 4} onPress={() => updateLength(String(Math.max(4, (length ?? 20) - 1)))} style={[styles.stepper, length === 4 && styles.disabled]}><Text style={styles.stepperText}>−</Text></Pressable>
              <TextInput accessibilityLabel="Password length" accessibilityHint="A whole number from 4 to 128" aria-invalid={length === null} value={lengthText} onChangeText={updateLength} onSubmitEditing={regenerate} keyboardType="number-pad" inputMode="numeric" selectTextOnFocus style={styles.lengthInput} />
              <Pressable accessibilityRole="button" accessibilityLabel="Increase length" disabled={length === 128} onPress={() => updateLength(String(Math.min(128, (length ?? 20) + 1)))} style={[styles.stepper, length === 128 && styles.disabled]}><Text style={styles.stepperText}>+</Text></Pressable>
            </View>
            <Text style={styles.lengthHint}>Longer is a good place to start.</Text>
            <View style={styles.divider} />
            {CHARACTER_TYPES.map(type => (
              <View key={type.key} style={styles.optionRow}>
                <View style={styles.typeLabel}><Text style={styles.optionLabel}>{type.label}</Text><Text style={styles.example}>{type.example}</Text></View>
                <Switch style={styles.switch} accessibilityLabel={type.label} value={options[type.key]} onValueChange={value => { setOptions(previous => ({ ...previous, [type.key]: value })); clearResult(); }} trackColor={{ false: '#314253', true: '#63dfb2' }} thumbColor={options[type.key] ? "#102d25" : "#fff"} />
              </View>
            ))}
            <View style={styles.settingsFootnote}><Text accessibilityLiveRegion="polite" style={[styles.muted, validation && styles.error]}>{validation ?? `${charsetSize} possible characters. Every selected type is included.`}</Text></View>
          </View>
        </View>

        <View style={[styles.footer, narrow && styles.footerNarrow]}>
          <View style={styles.footerIntro}><Text style={styles.footerTitle}>Private by design.</Text><Text style={styles.footerText}>No account. No password history. No analytics.</Text></View>
          <Text style={styles.privacy}>Passwords stay in this page’s memory until you clear, change options, or reload. Copying uses your system clipboard, where other apps or clipboard history may keep them.</Text>
        </View>
        <Text style={styles.bottomNote}>A generator, not a password manager. Save passwords somewhere you trust.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0b141e' },
  pageContent: { padding: 48, paddingTop: 30, alignItems: 'center' },
  pageContentNarrow: { padding: 20, paddingTop: 22 },
  content: { width: '100%', maxWidth: 1000 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { color: '#75e9be', fontSize: 25, fontWeight: '800', backgroundColor: '#163328', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9 },
  brandName: { color: '#eff4f5', fontSize: 18, fontWeight: '700', letterSpacing: -0.5 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#75e9be' },
  badgeText: { color: '#a5b7c4', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  hero: { marginTop: 62, marginBottom: 34 },
  eyebrow: { color: '#75e9be', fontSize: 10, letterSpacing: 1.6, fontWeight: '700', marginBottom: 15 },
  title: { fontSize: 52, lineHeight: 58, letterSpacing: -2, color: '#f0f5f6', fontWeight: '700' },
  titleNarrow: { fontSize: 36, lineHeight: 42, letterSpacing: -1.3 },
  subtitle: { color: '#a5b7c4', fontSize: 16, lineHeight: 24, marginTop: 18 },
  workspace: { flexDirection: 'row', borderWidth: 1, borderColor: '#2a3b49', borderRadius: 18, overflow: 'hidden', backgroundColor: '#111f2b' },
  workspaceNarrow: { flexDirection: 'column' },
  resultCard: { flex: 1, minWidth: 0, padding: 30, justifyContent: 'center' },
  resultCardNarrow: { padding: 20 },
  cardHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  overline: { fontSize: 10, letterSpacing: 1.4, fontWeight: '700', color: '#b2c0cb' },
  localTag: { fontSize: 9, letterSpacing: 0.8, color: '#75e9be', borderColor: '#305644', borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  password: { color: '#f0f7f4', fontSize: 24, lineHeight: 35, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', width: '100%', padding: 0, paddingVertical: 24, textAlignVertical: 'top' },
  resultMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 20 },
  muted: { fontSize: 12, lineHeight: 19, color: '#a5b7c4', flexShrink: 1 },
  clear: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  clearText: { fontSize: 12, color: '#c6d3dd', textDecorationLine: 'underline' },
  generate: { minHeight: 52, backgroundColor: '#75e9be', borderRadius: 9, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  generateText: { fontSize: 16, fontWeight: '700', color: '#0c291d' },
  generateIcon: { fontSize: 24, color: '#0c291d' },
  copy: { minHeight: 48, borderWidth: 1, borderColor: '#3d5365', borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  copyText: { fontSize: 14, fontWeight: '600', color: '#e5edf1' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
  noticeArea: { minHeight: 58, justifyContent: 'center', paddingTop: 12 },
  notice: { color: '#a5c1b4', fontSize: 12, lineHeight: 19, textAlign: 'center' },
  error: { color: '#ffb9a6' },
  settings: { width: 330, backgroundColor: '#152431', borderLeftWidth: 1, borderLeftColor: '#2a3b49', padding: 26 },
  settingsNarrow: { width: '100%', borderLeftWidth: 0, borderTopWidth: 1, borderTopColor: '#2a3b49', padding: 20 },
  settingsTitle: { fontSize: 18, color: '#f0f5f6', fontWeight: '600', marginBottom: 28 },
  lengthHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  optionLabel: { fontSize: 14, color: '#e3ecf2', fontWeight: '500' },
  lengthControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepper: { width: 44, height: 44, borderRadius: 7, backgroundColor: '#243746', justifyContent: 'center', alignItems: 'center' },
  stepperText: { color: '#e4edf2', fontSize: 23 },
  lengthInput: { flex: 1, minWidth: 0, height: 44, borderWidth: 1, borderColor: '#456071', borderRadius: 7, color: '#f0f5f6', textAlign: 'center', fontSize: 17, fontWeight: '600', backgroundColor: '#111e29' },
  lengthHint: { fontSize: 11, lineHeight: 18, color: '#9daebb', marginTop: 9 },
  divider: { height: 1, backgroundColor: '#2c3d4a', marginTop: 24, marginBottom: 13 },
  switch: { width: 48, height: 30 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, gap: 12 },
  typeLabel: { flexDirection: 'row', gap: 9, alignItems: 'center', flexWrap: 'wrap', flex: 1 },
  example: { fontSize: 11, color: '#95a9b9', fontFamily: 'monospace' },
  settingsFootnote: { marginTop: 18, minHeight: 40 },
  footer: { flexDirection: 'row', gap: 50, marginTop: 30, borderBottomWidth: 1, borderBottomColor: '#233542', paddingBottom: 24 },
  footerNarrow: { flexDirection: 'column', gap: 12, marginTop: 24 },
  footerIntro: { flex: 1 },
  footerTitle: { color: '#e4edf1', fontSize: 14, fontWeight: '600', marginBottom: 5 },
  footerText: { color: '#9bb0bd', fontSize: 12, lineHeight: 20 },
  privacy: { flex: 1, color: '#9bb0bd', fontSize: 11, lineHeight: 18 },
  bottomNote: { color: '#9bb0bd', fontSize: 11, lineHeight: 18, marginTop: 18, marginBottom: 12 },
});
