import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareStaticHtml } from '../scripts/prepare-static.mjs';

const html = '<!doctype html><html><head><meta charset="utf-8"><title>Pass_gen</title></head><body><div id="root"></div><script src="/_expo/static/js/web/index-abc.js" defer></script></body></html>';
test('static export works from a subdirectory and enforces no outbound connections', () => {
  const result = prepareStaticHtml(html);
  assert.ok(result.includes('src="./_expo/static/js/web/index-abc.js"'));
  assert.ok(result.includes("connect-src 'none'"));
  assert.ok(result.includes("script-src 'self'"));
  assert.ok(result.includes('<title>Pass_gen · Local password generator</title>'));
});
test('repeated preparation is stable and invalid export fails visibly', () => {
  assert.equal(prepareStaticHtml(prepareStaticHtml(html)), prepareStaticHtml(html));
  assert.throws(() => prepareStaticHtml('<html>broken export</html>'), /Expo/);
});
