'use client';

import { IconButton, MonitorIcon, MoonIcon, SunIcon } from '@owobilum/ui';
import { useSyncExternalStore } from 'react';
import {
  readThemePreference,
  setThemePreference,
  subscribeTheme,
  type ThemePreference,
} from './theme';

const next: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

const icons = {
  system: <MonitorIcon />,
  light: <SunIcon />,
  dark: <MoonIcon />,
};

/** Cycles system → light → dark. Server-renders as "system" (no mismatch). */
export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    readThemePreference,
    () => 'system' as const,
  );

  return (
    <IconButton
      label={`Theme: ${theme}. Switch to ${next[theme]}`}
      icon={icons[theme]}
      onClick={() => setThemePreference(next[theme])}
    />
  );
}
