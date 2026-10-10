import nx from '@nx/eslint-plugin';
import storybook from 'eslint-plugin-storybook';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...nx.configs['flat/react'],
  ...baseConfig,
  ...storybook.configs['flat/recommended'],
  {
    // Explicit version: eslint-plugin-react's auto-detection relies on
    // context APIs removed in ESLint 10.
    settings: { react: { version: '19.0' } },
  },
  {
    // Tooling deps are declared in the workspace root package.json.
    files: ['.storybook/main.ts'],
    rules: {
      'storybook/no-uninstalled-addons': [
        'error',
        { packageJsonLocation: '../../package.json' },
      ],
    },
  },
  {
    ignores: ['storybook-static', 'out-tsc', '!.storybook'],
  },
];
