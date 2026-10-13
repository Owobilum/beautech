import type { Preview } from '@storybook/react-vite';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './preview.css';

const preview: Preview = {
  tags: ['autodocs'],
  // Theme switcher in the toolbar. "light" is forced (not the OS default) so
  // story tests and Chromatic snapshots are deterministic; stories opt into
  // dark with `globals: { theme: 'dark' }`.
  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, { globals }) => {
      document.documentElement.dataset.theme =
        globals.theme === 'dark' ? 'dark' : 'light';
      return Story();
    },
  ],
  parameters: {
    layout: 'centered',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // Fail story tests (and CI) on accessibility violations.
      test: 'error',
    },
  },
};

export default preview;
