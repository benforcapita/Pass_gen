# Pass_gen

A small, local-only password generator for the browser and Expo. Choose a length and character types, generate a password, and copy it. No account, password history, analytics, database, or backend.

## Run locally

Requires Node.js 22.13+ and npm.

```sh
npm ci
npm run web
```

Build and preview the production website:

```sh
npm run build
npm run preview
```

Open http://127.0.0.1:4196. The `dist/` folder is a portable static website; it can be hosted at the root or a subdirectory. Host over HTTPS for clipboard support. Do not use the development server as a public production service.

`npm run android` and `npm run ios` retain Expo development entry points. Native device builds and app-store submission have not been verified in this change.

## Behavior and privacy

- Lengths must be whole numbers from 4 to 128. At least one character type is required.
- Every enabled type is present in every successful result. Disabled types are excluded.
- Generation uses `expo-crypto.getRandomValues`, backed by the platform's cryptographic random source. There is no `Math.random` fallback.
- Byte rejection sampling avoids modulo bias. Complete candidates missing a required type are rejected rather than overwritten. Accepted passwords are uniform over the valid strings for the chosen settings, assuming a correctly functioning platform random source.
- Sampling has finite retry limits and fails closed if the random source fails. Passwords are not labeled with unsubstantiated strength scores. Very short passwords are permitted for compatibility, not recommended for valuable accounts.
- Values exist only in component memory. Editing options, clearing, or reloading removes the displayed result. No password is saved or transmitted by the app.
- Copying puts a value on the operating system clipboard. Other apps or clipboard history may keep it; clearing the screen does not erase the clipboard. Clipboard denial or a five-second confirmation timeout produces a visible manual-copy fallback.
- The static export has a Content Security Policy blocking outbound connections. It loads only its own script and local styles/assets.

## Verification

```sh
npm test
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

`CHROMIUM_PATH` may select an existing compatible Chromium executable. The Playwright configuration keeps the browser sandbox enabled.

Where a provided cloud browser is available but process launching is restricted, run the same kinds of acceptance checks with `npm run preview`, then open http://127.0.0.1:4196/__qa and select **Run desktop + mobile-width checks**. This development-only harness is outside `dist/`. It uses synthetic, disposable values, verifies exact viewport widths, and does not display values in its report. Clipboard success/denial and unavailable-crypto conditions are injected only into the test iframe.

See [VERIFICATION.md](VERIFICATION.md) for the actual checks completed, remaining limitations, and dependency audit scope.

## Implementation notes

The app uses the stable Expo SDK 57 / React Native 0.86 compatibility set. The previous unused Router stack was removed because this product has a single screen and no navigation. `index.tsx` registers that screen with a safe-area wrapper.

The build's `scripts/prepare-static.mjs` makes Expo's script URL relative, adds metadata, and applies the static Content Security Policy. It does not modify generator code. No generated passwords or test fixtures are placed in the production export.

Compatibility references: [Expo SDK matrix](https://docs.expo.dev/versions/latest/), [SDK 57 release notes](https://expo.dev/changelog/sdk-57), [upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/).
