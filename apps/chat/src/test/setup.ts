import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Server tests run with `@vitest-environment node`, without a DOM.
if (typeof window !== 'undefined') {
  // jsdom lacks APIs used by Headless UI (via @owobilum/ui) and the scroll hook.
  const noop = () => undefined;
  globalThis.ResizeObserver ??= class {
    observe = noop;
    unobserve = noop;
    disconnect = noop;
  };
  Element.prototype.getAnimations ??= () => [];
  Element.prototype.scrollTo ??= noop;
  window.matchMedia ??= (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: noop,
      removeEventListener: noop,
      addListener: noop,
      removeListener: noop,
      dispatchEvent: () => false,
    }) as MediaQueryList;

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });
}
