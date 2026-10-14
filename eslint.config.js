import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'test-results/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser, ...globals.node } },
    rules: { 'no-empty': ['error', { allowEmptyCatch: true }], 'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }] }
  }
];
