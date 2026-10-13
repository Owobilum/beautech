import nextEslintPluginNext from '@next/eslint-plugin-next';
import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  {
    plugins: { '@next/next': nextEslintPluginNext },
    rules: {
      ...nextEslintPluginNext.configs.recommended.rules,
      ...nextEslintPluginNext.configs['core-web-vitals'].rules,
    },
  },
  ...nx.configs['flat/react'],
  ...baseConfig,
  {
    // Explicit version: eslint-plugin-react's auto-detection relies on
    // context APIs removed in ESLint 10.
    settings: { react: { version: '19.0' } },
  },
  {
    // Tests assert on values they just set up; `!` reads better than guards.
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  {
    ignores: ['.next/**/*', '**/out-tsc', 'next-env.d.ts'],
  },
];
