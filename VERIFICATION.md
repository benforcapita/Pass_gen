# Verification and release scope

## Source and scope

This change starts from `14244069dec8061a1a73eb9112ccca3ad6521275` and repairs the existing one-screen password generator. It preserves local-only generation and does not add an account, backend, storage, analytics, or a production deployment.

The original generator overwrote random positions independently for each required character type. A deterministic regression demonstrated that an all-four-category request could return `aaa!`, with uppercase and digits missing. It also accepted fractional and oversized lengths. Those failures were reproduced before replacement.

## Completed source checks

- Clean `npm ci` from the committed lockfile.
- `npm test`: 12 passing tests, including all 15 nonempty type combinations at lengths 4, 20, and 128, repeated 40 times each (1,800 generated test values).
- Unbiased byte rejection, complete-candidate category rejection, empty selection, invalid length text, random-source failure and bounded retries.
- Static HTML portability, no-outbound-connection CSP, idempotent preparation and malformed-export rejection.
- `npm run typecheck` and `npm run lint` pass.
- `npm run build` produces a roughly 411 KB JavaScript bundle plus static HTML. Password-generation code is unchanged between the app and the demo.
- Independent source review found no remaining core correctness or app persistence/network/logging issue. This is not a formal cryptographic audit.

## Browser verification

The final production export passed **21 browser acceptance groups** in the provided Chromium browser at exact **1100, 390, and 320 pixel viewport widths**, verified by the browser-native harness. This included:

- Initial empty state and disabled Copy, normal/repeated generation, 25 four-character/all-category generations per width, full 128-character output, no horizontal overflow, and unclipped length controls.
- Blank, below-minimum, above-maximum, fractional, and nonnumeric length inputs; all categories off; recovery to numbers-only output.
- Clipboard denial, successful writes, a never-settling clipboard with a five-second timeout, stale completion after regeneration, and clearing.
- No local/session storage, cookies, or external resources; unavailable cryptography fails closed; reload starts empty.
- Additional direct keyboard checks verified Enter generation and Space toggling. A separate real system-clipboard write visibly reached “Copied to clipboard.”

Visual inspection caught a clipped increment button, which was fixed and added to the final browser regression checks. Browser tooling sometimes timed out taking full-page screenshots; ordinary desktop and mobile-width screenshots and the textual acceptance report were saved successfully.

The Playwright suite is provided for normal development/CI environments. Its direct process launch was blocked by this execution environment, so it is **not reported as passing** here. Actual browser acceptance was completed using the separate harness and direct interaction in the provided cloud browser. The harness is outside `dist/`; its clipboard/crypto fault injection never enters production code.

Native iOS/Android devices and app-store builds are untested. Mobile-width browser testing does not establish native-device compatibility. This change does not publish or deploy the app.

## Dependency audit, October 9, 2026

The inherited SDK 51 dependency tree reported 89 advisories (4 critical, 57 high, 26 moderate, 2 low). Updating to the stable Expo SDK 57 compatibility set and removing the unused Router stack reduced this to **22 advisories: 15 high and 7 moderate, zero critical**.

Remaining reports propagate from three development-tool dependencies:

- `braces@3.0.3`, reached through Metro/micromatch. Deeply nested build patterns can cause stack-exhaustion denial of service. [Advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
- `node-forge@1.4.0`, reached through Expo CLI/code-signing tooling. A signature-verification issue affects crafted inputs. [Advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
- `uuid@7.0.3`, reached through the Xcode project-manipulation dependency. Certain buffer-writing UUID APIs lack bounds checks. [Advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq)

A source-map inventory of the production browser bundle contains none of those exact npm package paths. It also confirms the former Router `decode-uri-component` package is absent. Expo packages are declared as production dependencies by npm even when particular subdependencies are build tooling; the audit count is not suppressed or reclassified by changing dependency labels.

Do not expose Metro publicly, process untrusted build inputs, or use this change as evidence that Expo signing/native build workflows have been audited. No known-vulnerability-free claim is made. The remaining tooling findings need upstream maintenance; speculative overrides, forced SDK downgrades, and prerelease dependencies were not used to hide them.

## Reproduce

See [README.md](README.md) for local setup, export, Playwright, and browser-native acceptance commands. Browser screenshots and report values must use disposable synthetic outputs only. No actual credentials are used in tests.
