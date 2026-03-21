import { parseUrlString } from '@/lib/validate';

const DEFAULT_SITE_URL = 'http://localhost:3000';
const SITE_URL_ENV_KEYS = [
  'NEXT_PUBLIC_APP_URL',
  'SITE_URL',
  'VERCEL_PROJECT_PRODUCTION_URL',
  'VERCEL_URL',
] as const;
type SiteEnvironment = Readonly<Record<string, string | undefined>>;

export const SITE_NAME = 'Page Converter';
export const SITE_TAGLINE = 'Turn public web pages into clean Markdown';
export const SITE_DESCRIPTION =
  'Convert public web pages into clean Markdown with live progress, in-app preview, one-click copy, and Markdown downloads.';
export const SITE_CATEGORY = 'productivity';
export const SITE_CREATOR = 'j0hanz';
export const SITE_REPOSITORY_URL = 'https://github.com/j0hanz/page-converter';
export const SITE_KEYWORDS = [
  'page converter',
  'web page to markdown',
  'html to markdown',
  'markdown converter',
  'clean markdown',
  'article to markdown',
  'mcp',
] as const;
export const SOCIAL_IMAGE_ALT = `${SITE_NAME} preview`;
export const SOCIAL_IMAGE_SIZE = {
  width: 1200,
  height: 630,
} as const;
export const SOCIAL_IMAGE_CONTENT_TYPE = 'image/png';

function createDefaultSiteUrl(): URL {
  return new URL(DEFAULT_SITE_URL);
}

function normalizeSiteUrl(value: string): URL | null {
  const trimmedValue = value.trim();
  const withProtocol = /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;
  const url = parseUrlString(withProtocol);

  if (!url) {
    return null;
  }

  url.pathname = '/';
  url.search = '';
  url.hash = '';

  return url;
}

function readConfiguredSiteUrl(
  environment: SiteEnvironment
): string | undefined {
  for (const key of SITE_URL_ENV_KEYS) {
    const value = environment[key]?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}

export function resolveSiteUrl(
  environment: SiteEnvironment = process.env
): URL {
  const configuredUrl = readConfiguredSiteUrl(environment);
  if (!configuredUrl) {
    return createDefaultSiteUrl();
  }

  return normalizeSiteUrl(configuredUrl) ?? createDefaultSiteUrl();
}
