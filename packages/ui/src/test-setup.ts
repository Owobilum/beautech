import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom lacks APIs Headless UI's Listbox uses: ResizeObserver (tracking the
// button's position) and getAnimations (waiting for transitions to end).
// Layout and animation aren't tested here, so no-ops do.
const noop = () => undefined;
globalThis.ResizeObserver ??= class {
  observe = noop;
  unobserve = noop;
  disconnect = noop;
};
Element.prototype.getAnimations ??= () => [];

afterEach(() => {
  cleanup();
});
