import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { ClipboardTimeoutError, copyWithTimeout } from '../src/clipboard.ts';

test('a never-settling platform clipboard does not leave the UI waiting forever', async () => {
  const result = await Promise.race([
    copyWithTimeout(() => new Promise<void>(() => {}), 5).then(() => 'success', error => error instanceof ClipboardTimeoutError ? 'timeout' : 'other'),
    delay(50).then(() => 'still pending'),
  ]);
  assert.equal(result, 'timeout');
});

test('confirmed writes succeed; rejected or synchronous clipboard errors propagate', async () => {
  let copied = '';
  await copyWithTimeout(async () => { copied = 'synthetic-test-only'; }, 50);
  assert.equal(copied, 'synthetic-test-only');
  await assert.rejects(copyWithTimeout(async () => { throw new Error('denied'); }), /denied/);
  await assert.rejects(async () => copyWithTimeout(() => { throw new Error('unavailable'); }), /unavailable/);
});
