import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './global.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { themeInitScript } from '@/features/theme/theme';

export const metadata: Metadata = {
  title: 'Owobilum Chat',
  description:
    'An AI chat app built with Next.js and the @owobilum/ui component library.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The theme script sets data-theme before hydration.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
