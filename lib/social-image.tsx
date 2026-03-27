import 'server-only';

import { type CSSProperties, type ReactNode } from 'react';

import { cacheLife } from 'next/cache';
import { ImageResponse } from 'next/og';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { SOCIAL_IMAGE_SIZE } from '@/lib/site';

interface SocialImagePalette {
  accentBackground: string;
  accentColor: string;
  background: string;
  bodyColor: string;
  cardBackground: string;
  cardBorder: string;
  textColor: string;
}

interface SocialImageFrameProps {
  children: ReactNode;
  palette: SocialImagePalette;
}

interface SocialFeaturePillProps {
  backgroundColor: string;
  color?: string;
  label: string;
}

type SocialImageFeature = SocialFeaturePillProps;

interface SocialImageResponseOptions {
  body: string;
  eyebrowLabel: string;
  eyebrowVariant?: 'filled' | 'outlined';
  features: readonly SocialImageFeature[];
  maxWidth?: number;
  palette: SocialImagePalette;
  title: string;
}

const FONT_STACK = "'Geist Variable', sans-serif";
const OG_FONT_PATH = join(process.cwd(), 'assets', 'Geist-Regular.ttf');

const ROOT_STYLE: CSSProperties = {
  display: 'flex',
  height: '100%',
  width: '100%',
  padding: 48,
  fontFamily: FONT_STACK,
};

const CARD_STYLE: CSSProperties = {
  display: 'flex',
  width: '100%',
  height: '100%',
  flexDirection: 'column',
  justifyContent: 'space-between',
  borderRadius: 32,
  padding: '44px 48px',
};

const CONTENT_STACK_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
};

const TITLE_STYLE: CSSProperties = {
  display: 'flex',
  fontSize: 74,
  fontWeight: 700,
  lineHeight: 1.05,
  letterSpacing: '-0.05em',
};

const FEATURE_LIST_STYLE: CSSProperties = {
  display: 'flex',
  gap: 16,
};

function SocialImageFrame({ children, palette }: SocialImageFrameProps) {
  return (
    <main
      style={{
        ...ROOT_STYLE,
        color: palette.textColor,
        background: palette.background,
      }}
    >
      <section
        style={{
          ...CARD_STYLE,
          background: palette.cardBackground,
          border: `1px solid ${palette.cardBorder}`,
        }}
      >
        {children}
      </section>
    </main>
  );
}

function SocialImageContent({
  children,
  maxWidth,
}: {
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <article
      style={{
        ...CONTENT_STACK_STYLE,
        ...(maxWidth ? { maxWidth } : {}),
      }}
    >
      {children}
    </article>
  );
}

function SocialEyebrow({
  label,
  palette,
  variant = 'filled',
}: {
  label: string;
  palette: SocialImagePalette;
  variant?: 'filled' | 'outlined';
}) {
  return (
    <p
      style={{
        display: 'flex',
        alignSelf: 'flex-start',
        borderRadius: 999,
        padding: '10px 18px',
        fontSize: 24,
        fontWeight: 600,
        letterSpacing: '-0.02em',
        ...(variant === 'filled'
          ? {
              backgroundColor: palette.accentBackground,
              color: palette.accentColor,
            }
          : {
              border: `1px solid ${palette.cardBorder}`,
              color: palette.textColor,
            }),
      }}
    >
      {label}
    </p>
  );
}

function SocialTitle({ children }: { children: ReactNode }) {
  return <h1 style={TITLE_STYLE}>{children}</h1>;
}

function SocialBody({
  children,
  color,
}: {
  children: ReactNode;
  color: string;
}) {
  return (
    <p
      style={{
        display: 'flex',
        fontSize: 32,
        lineHeight: 1.3,
        color,
      }}
    >
      {children}
    </p>
  );
}

function SocialFeatureList({ children }: { children: ReactNode }) {
  return <ul style={FEATURE_LIST_STYLE}>{children}</ul>;
}

function SocialFeaturePill({
  backgroundColor,
  color = '#0f172a',
  label,
}: SocialFeaturePillProps) {
  return (
    <li
      style={{
        display: 'flex',
        borderRadius: 999,
        padding: '12px 22px',
        fontSize: 26,
        fontWeight: 500,
        lineHeight: 1,
        backgroundColor,
        color,
      }}
    >
      {label}
    </li>
  );
}

async function readOgFontData(): Promise<ArrayBuffer> {
  'use cache';

  cacheLife('max');

  const fontBuffer = await readFile(OG_FONT_PATH);

  return fontBuffer.buffer.slice(
    fontBuffer.byteOffset,
    fontBuffer.byteOffset + fontBuffer.byteLength
  );
}

export async function createSocialImageResponse({
  body,
  eyebrowLabel,
  eyebrowVariant = 'filled',
  features,
  maxWidth,
  palette,
  title,
}: SocialImageResponseOptions) {
  const geistFont = await readOgFontData();

  return new ImageResponse(
    <SocialImageFrame palette={palette}>
      <SocialImageContent maxWidth={maxWidth}>
        <SocialEyebrow
          label={eyebrowLabel}
          palette={palette}
          variant={eyebrowVariant}
        />
        <SocialTitle>{title}</SocialTitle>
        <SocialBody color={palette.bodyColor}>{body}</SocialBody>
      </SocialImageContent>

      <SocialFeatureList>
        {features.map((feature) => (
          <SocialFeaturePill key={feature.label} {...feature} />
        ))}
      </SocialFeatureList>
    </SocialImageFrame>,
    {
      ...SOCIAL_IMAGE_SIZE,
      fonts: [
        {
          name: 'Geist Variable',
          data: geistFont,
          style: 'normal',
          weight: 400,
        },
      ],
    }
  );
}

export const LIGHT_SOCIAL_PALETTE: SocialImagePalette = {
  accentBackground: '#0f172a',
  accentColor: '#f8fafc',
  background: '#ebebeb',
  bodyColor: '#334155',
  cardBackground: '#ffffff',
  cardBorder: 'rgba(15, 23, 42, 0.08)',
  textColor: '#0f172a',
};

export const DARK_SOCIAL_PALETTE: SocialImagePalette = {
  accentBackground: '#1d4ed8',
  accentColor: '#eff6ff',
  background: '#202020',
  bodyColor: '#cbd5e1',
  cardBackground: '#111827',
  cardBorder: 'rgba(255, 255, 255, 0.14)',
  textColor: '#f8fafc',
};
