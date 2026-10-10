import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';
import { defaultClientConditions, mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: (config) =>
    mergeConfig(config, {
      plugins: [tailwindcss()],
      // Resolve workspace packages to their TypeScript source (see the
      // "@owobilum/source" export condition), so edits in packages/ui
      // hot-reload without a build.
      resolve: {
        conditions: ['@owobilum/source', ...defaultClientConditions],
      },
    }),
};

export default config;
