import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**', '.expo/**', 'test-results/**', 'verification/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { window: 'readonly', document: 'readonly', navigator: 'readonly', innerWidth: 'readonly', localStorage: 'readonly', sessionStorage: 'readonly', DOMException: 'readonly', console: 'readonly', process: 'readonly', URL: 'readonly', setTimeout: 'readonly', performance: 'readonly' } } },
  { files: ['**/*.{ts,tsx}'], plugins: { 'react-hooks': reactHooks }, rules: reactHooks.configs.recommended.rules },
);
