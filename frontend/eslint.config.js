import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  console: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  URL: 'readonly',
  HTMLElement: 'readonly',
  HTMLAnchorElement: 'readonly',
  HTMLLinkElement: 'readonly',
  HTMLImageElement: 'readonly',
  HTMLInputElement: 'readonly',
  HTMLButtonElement: 'readonly',
  HTMLSelectElement: 'readonly',
  HTMLDivElement: 'readonly',
  SVGPathElement: 'readonly',
  SVGSVGElement: 'readonly',
  Element: 'readonly',
  Event: 'readonly',
  IntersectionObserver: 'readonly',
  MutationObserver: 'readonly',
  Navigator: 'readonly',
  fetch: 'readonly',
  navigator: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  requestIdleCallback: 'readonly',
  cancelIdleCallback: 'readonly',
  ResizeObserver: 'readonly',
  RequestCache: 'readonly',
  MouseEvent: 'readonly',
  Node: 'readonly',
  RequestInfo: 'readonly',
  RequestInit: 'readonly',
  Response: 'readonly',
  AbortController: 'readonly',
  ScrollBehavior: 'readonly',
  ScrollToOptions: 'readonly',
  MediaQueryList: 'readonly',
  CSSStyleDeclaration: 'readonly',
  DOMRect: 'readonly',
  history: 'readonly',
  performance: 'readonly',
  PerformanceNavigationTiming: 'readonly',
  caches: 'readonly',
};

const reactRules = {
  ...reactPlugin.configs.recommended.rules,
  'react/react-in-jsx-scope': 'off',
  'react/prop-types': 'off',
  'react/jsx-uses-vars': 'error',
  'react/jsx-uses-react': 'off',
};

export default [
  { ignores: ['dist/**', 'node_modules/**', 'scripts/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: browserGlobals,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactRules,
      ...reactHooksPlugin.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: browserGlobals,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactRules,
      ...reactHooksPlugin.configs.recommended.rules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'react-hooks/set-state-in-effect': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
