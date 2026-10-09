import { test, expect } from '@playwright/test';

test('complete repeated generate, edit, copy denial, recovery, clear, and reload flow', async ({ page }, testInfo) => {
  const errors: string[] = [];
  const outbound: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (!request.url().startsWith('http://127.0.0.1:4196/')) outbound.push(request.url());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /A fresh password.*Just for you./s })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy password' })).toBeDisabled();
  await page.getByRole('button', { name: 'Generate password' }).click();
  const output = page.getByRole('textbox', { name: 'Generated password' });
  const first = await output.inputValue();
  expect(first).toHaveLength(20);
  for (const regex of [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/]) expect(first).toMatch(regex);
  await page.getByRole('button', { name: 'Generate password' }).click();
  expect(await output.inputValue()).not.toEqual(first);

  const length = page.getByRole('textbox', { name: 'Password length' });
  await length.fill('4');
  await expect(output).toHaveValue('');
  for (let i = 0; i < 15; i++) {
    await page.getByRole('button', { name: 'Generate password' }).click();
    const value = await output.inputValue();
    expect(value).toHaveLength(4);
    for (const regex of [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/]) expect(value).toMatch(regex);
  }
  await length.fill('128');
  await page.getByRole('button', { name: 'Generate password' }).click();
  await expect(output).toHaveValue(/^[\s\S]{128}$/);
  expect(await output.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  for (const input of ['', '3', '129', '4.5', 'abc']) {
    await length.fill(input);
    await expect(page.getByText('Choose a whole number from 4 to 128.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate password' })).toBeDisabled();
  }
  await length.fill('20');
  for (const label of ['Lowercase', 'Uppercase', 'Numbers', 'Symbols']) await page.getByRole('switch', { name: label, exact: true }).click();
  await expect(page.getByText('Select at least one character type.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate password' })).toBeDisabled();
  await page.getByRole('switch', { name: 'Numbers', exact: true }).click();
  await page.getByRole('button', { name: 'Generate password' }).click();
  await expect(output).toHaveValue(/^\d{20}$/);

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new DOMException('denied', 'NotAllowedError'); } } });
  });
  await page.getByRole('button', { name: 'Copy password' }).click();
  await expect(page.getByText('Copy was blocked. Select the password and copy it manually.')).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => {} } });
  });
  await page.getByRole('button', { name: 'Copy password' }).click();
  await expect(page.getByText('Copied to clipboard.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear from screen' }).click();
  await expect(output).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Copy password' })).toBeDisabled();
  await page.getByRole('button', { name: 'Generate password' }).click();
  await page.reload();
  await expect(output).toHaveValue('');
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(await page.context().cookies()).toEqual([]);
  expect(outbound).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({ path: `verification/${testInfo.project.name}.png`, fullPage: true });
});

test('keyboard controls, small viewport, and unavailable crypto fail safely', async ({ page }) => {
  await page.goto('/');
  const length = page.getByRole('textbox', { name: 'Password length' });
  await length.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('16');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Generated password' })).toHaveValue(/^[\s\S]{16}$/);
  await page.getByRole('switch', { name: 'Symbols', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('switch', { name: 'Symbols', exact: true })).not.toBeChecked();
  await page.setViewportSize({ width: 320, height: 568 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => {
    window.crypto.getRandomValues = () => { throw new Error('unavailable'); };
  });
  await page.getByRole('button', { name: 'Generate password' }).click();
  await expect(page.getByText('Random generation is unavailable. Try again in a supported browser or app.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Generated password' })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Copy password' })).toBeDisabled();
});
