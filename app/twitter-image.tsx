import {
  SITE_NAME,
  SITE_TAGLINE,
  SOCIAL_IMAGE_ALT,
  SOCIAL_IMAGE_CONTENT_TYPE,
  SOCIAL_IMAGE_SIZE,
} from '@/lib/site';
import {
  createSocialImageResponse,
  DARK_SOCIAL_PALETTE,
} from '@/lib/social-image';

export const alt = SOCIAL_IMAGE_ALT;
export const size = SOCIAL_IMAGE_SIZE;
export const contentType = SOCIAL_IMAGE_CONTENT_TYPE;

const TWITTER_FEATURES = [
  {
    label: 'Preview',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#f8fafc',
  },
  {
    label: 'Copy',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#f8fafc',
  },
  {
    label: 'Download',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    color: '#f8fafc',
  },
] as const;

export default async function TwitterImage() {
  return createSocialImageResponse({
    eyebrowLabel: 'Clean web page extraction',
    eyebrowVariant: 'outlined',
    body: `${SITE_TAGLINE} with live progress and ready-to-share Markdown output.`,
    features: TWITTER_FEATURES,
    maxWidth: 860,
    palette: DARK_SOCIAL_PALETTE,
    title: SITE_NAME,
  });
}
