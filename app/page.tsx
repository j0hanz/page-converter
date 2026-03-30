import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';

import HomeClient from '@/components/features/home-client';

import { resolveSiteUrl, SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: SITE_NAME,
    url: '/',
  },
  twitter: {
    title: SITE_NAME,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: resolveSiteUrl().toString(),
  applicationCategory: 'Utility',
  operatingSystem: 'All',
};

async function CachedHome() {
  'use cache';

  cacheLife('max');

  const jsonLdMarkup = await Promise.resolve(
    JSON.stringify(jsonLd).replace(/</g, '\u003c')
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdMarkup,
        }}
      />
      <HomeClient />
    </>
  );
}

export default function Home() {
  return <CachedHome />;
}
