import {
  SITE_NAME,
  SITE_TAGLINE,
  SOCIAL_IMAGE_ALT,
  SOCIAL_IMAGE_CONTENT_TYPE,
  SOCIAL_IMAGE_SIZE,
} from '@/lib/site';
import {
  createSocialImageResponse,
  LIGHT_SOCIAL_PALETTE,
} from '@/lib/social-image';

export const alt = SOCIAL_IMAGE_ALT;
export const size = SOCIAL_IMAGE_SIZE;
export const contentType = SOCIAL_IMAGE_CONTENT_TYPE;

const OG_FEATURES = [
  { label: 'Clean extraction', backgroundColor: '#dbeafe' },
  { label: 'No account needed', backgroundColor: '#d1fae5' },
  { label: 'Markdown export', backgroundColor: '#ede9fe' },
] as const;

export default function OpenGraphImage() {
  return createSocialImageResponse({
    eyebrowLabel: 'Web page to Markdown',
    body: `${SITE_TAGLINE} with live progress, preview, copy, and download.`,
    features: OG_FEATURES,
    palette: LIGHT_SOCIAL_PALETTE,
    title: SITE_NAME,
  });
}
