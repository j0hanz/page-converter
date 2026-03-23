import type { Metadata, Viewport } from 'next';

import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';

import {
  resolveSiteUrl,
  SITE_CATEGORY,
  SITE_CREATOR,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
} from '@/lib/site';
import { AppThemeProviders } from '@/lib/theme-provider';

const metadataBase = resolveSiteUrl();

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ebebeb' },
    { media: '(prefers-color-scheme: dark)', color: '#202020' },
  ],
};

export const metadata: Metadata = {
  metadataBase,
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [...SITE_KEYWORDS],
  authors: [{ name: SITE_CREATOR }],
  creator: SITE_CREATOR,
  publisher: SITE_CREATOR,
  category: SITE_CATEGORY,
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: SITE_NAME,
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppThemeProviders>{children}</AppThemeProviders>
      </body>
    </html>
  );
}
