// Browser-native equivalent of the Playwright acceptance tests, for environments
// that provide an interactive browser but do not permit launching test browsers.
const results = document.querySelector('#results');
const status = document.querySelector('#status');
const run = document.querySelector('#run');
const area = document.querySelector('#frame-area');
const pause = () => new Promise(resolve => setTimeout(resolve, 30));
async function until(check, description) {
  for (let i = 0; i < 200; i++) { if (check()) return; await pause(); }
  throw new Error(`Timed out: ${description}`);
}
function assert(value, message) { if (!value) throw new Error(message); }
function record(text, passed = true) {
  const item = document.createElement('li'); item.textContent = text; item.className = passed ? 'pass' : 'fail'; results.append(item);
}
async function verifyWidth(width) {
  const frame = document.createElement('iframe');
  frame.title = `${width}px password generator test viewport`;
  frame.width = String(width); frame.src = '/'; area.replaceChildren(frame);
  await new Promise(resolve => { frame.onload = resolve; });
  const w = frame.contentWindow; const d = frame.contentDocument;
  assert(w.innerWidth === width, `Expected ${width}px viewport; got ${w.innerWidth}px`);
  const byLabel = label => d.querySelector(`[aria-label="${label}"]`);
  await until(() => byLabel('Generate password'), 'app loads');
  const output = () => byLabel('Generated password').value;
  const disabled = label => byLabel(label).getAttribute('aria-disabled') === 'true' || byLabel(label).disabled;
  const click = async label => { byLabel(label).click(); await pause(); };
  const fill = async value => {
    const input = byLabel('Password length');
    Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new w.Event('input', { bubbles: true })); await pause();
  };
  const hasEveryType = value => [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].every(pattern => pattern.test(value));
  assert(byLabel('Increase length').getBoundingClientRect().right <= byLabel('Increase length').parentElement.getBoundingClientRect().right + 1, 'length increment control is clipped');
  assert(output() === '' && disabled('Copy password'), 'initial copy must be disabled and no password generated');
  await click('Generate password');
  await until(() => output().length === 20, 'default generation');
  assert(hasEveryType(output()), 'default categories');
  const first = output(); await click('Generate password'); assert(output() !== first, 'repeat generation');
  record(`${width}px: initial state, generation, and repeated generation passed`);
  await fill('4'); assert(output() === '', 'option edit must clear old result');
  const started = performance.now();
  for (let i = 0; i < 25; i++) { await click('Generate password'); assert(output().length === 4 && hasEveryType(output()), 'four-character category guarantee'); }
  record(`${width}px: 25 repeated four-character/all-category generations passed (${Math.round(performance.now() - started)}ms including UI waits)`);
  await fill('128'); await click('Generate password'); assert(output().length === 128, 'maximum length');
  const textarea = byLabel('Generated password');
  assert(textarea.scrollWidth <= textarea.clientWidth + 1, 'password horizontal overflow');
  assert(d.documentElement.scrollWidth <= w.innerWidth + 1, 'page horizontal overflow');
  record(`${width}px: all 128 characters remain selectable without horizontal overflow`);
  for (const value of ['', '3', '129', '4.5', 'abc']) {
    await fill(value); assert(disabled('Generate password') && output() === '', `invalid input ${value}`);
    assert(d.body.textContent.includes('Choose a whole number from 4 to 128.'), 'visible validation');
  }
  await fill('20');
  for (const label of ['Lowercase', 'Uppercase', 'Numbers', 'Symbols']) await click(label);
  assert(disabled('Generate password') && d.body.textContent.includes('Select at least one character type.'), 'all-off validation');
  await click('Numbers'); await click('Generate password'); assert(/^\d{20}$/.test(output()), 'numbers-only recovery');
  record(`${width}px: blank, out-of-range, fractional, nonnumeric, all-off, and numbers-only recovery passed`);
  Object.defineProperty(w.navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new w.DOMException('denied', 'NotAllowedError'); } } });
  await click('Copy password');
  await until(() => d.body.textContent.includes('Copy was blocked.'), 'clipboard denial');
  let copied = '';
  Object.defineProperty(w.navigator, 'clipboard', { configurable: true, value: { writeText: async text => { copied = text; } } });
  await click('Copy password'); await until(() => d.body.textContent.includes('Copied to clipboard.'), 'clipboard recovery');
  assert(copied === output(), 'exact clipboard value'); copied = '';
  Object.defineProperty(w.navigator, 'clipboard', { configurable: true, value: { writeText: () => new Promise(() => {}) } });
  await click('Copy password');
  await until(() => d.body.textContent.includes('Copy was not confirmed.'), 'clipboard timeout');
  assert(!disabled('Copy password'), 'timed-out clipboard must allow retry');
  let finishCopy;
  Object.defineProperty(w.navigator, 'clipboard', { configurable: true, value: { writeText: () => new Promise(resolve => { finishCopy = resolve; }) } });
  await click('Copy password'); await click('Generate password'); finishCopy(); await pause();
  assert(d.body.textContent.includes('New password generated.') && !d.body.textContent.includes('Copied to clipboard.'), 'stale clipboard completion must not replace new status');
  await click('Clear from screen'); assert(output() === '' && disabled('Copy password'), 'clear result');
  record(`${width}px: denied, successful, timed-out, and interrupted clipboard flows plus clearing passed`);
  assert(w.localStorage.length === 0 && w.sessionStorage.length === 0 && d.cookie === '', 'no browser persistence');
  const resources = w.performance.getEntriesByType('resource').map(entry => entry.name);
  assert(resources.every(url => url.startsWith(w.location.origin + '/')), 'unexpected external resource');
  await click('Generate password');
  w.crypto.getRandomValues = () => { throw new Error('test: crypto unavailable'); };
  await click('Generate password');
  assert(output() === '' && disabled('Copy password') && d.body.textContent.includes('Random generation is unavailable.'), 'crypto must fail closed');
  record(`${width}px: no local/session storage, cookies or external resources; crypto failure closes safely`);
  await new Promise(resolve => { frame.onload = resolve; frame.src = '/'; });
  await until(() => frame.contentDocument.querySelector('[aria-label="Generated password"]'), 'reload');
  assert(frame.contentDocument.querySelector('[aria-label="Generated password"]').value === '', 'reload clears result');
  record(`${width}px: reload starts without a saved password`);
}
run.addEventListener('click', async () => {
  run.disabled = true; results.replaceChildren(); status.textContent = 'Running';
  try {
    for (const width of [1100, 390, 320]) await verifyWidth(width);
    status.textContent = 'PASS: all desktop and mobile-width browser checks passed'; status.className = 'pass';
  } catch (error) {
    status.textContent = 'FAIL: ' + error.message; status.className = 'fail'; record(error.message, false);
  } finally { run.disabled = false; }
});
