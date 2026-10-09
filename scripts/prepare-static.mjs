import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function prepareStaticHtml(html) {
  if (!html.includes('<head>') || !/src="\.?\/_expo\//.test(html)) throw new Error('Expected an Expo static HTML export.');
  let output = html.replaceAll('src="/_expo/', 'src="./_expo/');
  output = output.replace(/<title>[^<]*<\/title>/, '<title>Pass_gen · Local password generator</title>');
  if (!output.includes('id="pass-gen-policy"')) {
    output = output.replace('<head>', `<head>
    <meta id="pass-gen-policy" http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'">
    <meta name="description" content="Generate passwords locally on your device. No account, password storage, or analytics.">
    <meta name="theme-color" content="#0b141e">`);
  }
  return output;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const target = resolve('dist/index.html');
  await writeFile(target, prepareStaticHtml(await readFile(target, 'utf8')));
  console.log('Static export prepared: relative assets; outbound connections blocked by CSP.');
}
