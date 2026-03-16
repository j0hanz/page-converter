import { ImageResponse } from "next/og";
import {
  SITE_NAME,
  SITE_TAGLINE,
  SOCIAL_IMAGE_ALT,
  SOCIAL_IMAGE_CONTENT_TYPE,
  SOCIAL_IMAGE_SIZE,
} from "@/lib/site";

export const alt = SOCIAL_IMAGE_ALT;
export const size = SOCIAL_IMAGE_SIZE;
export const contentType = SOCIAL_IMAGE_CONTENT_TYPE;

const TWITTER_FEATURES = [
  { label: "Preview", tw: "bg-blue-500/20 text-slate-50" },
  { label: "Copy", tw: "bg-emerald-500/20 text-slate-50" },
  { label: "Download", tw: "bg-violet-500/20 text-slate-50" },
] as const;

function FeaturePill({ label, tw }: { label: string; tw: string }) {
  return (
    <li
      tw={`flex rounded-full px-[22px] py-3 text-[26px] font-medium leading-none ${tw}`}
    >
      {label}
    </li>
  );
}

export default function TwitterImage() {
  return new ImageResponse(
    <main tw="flex h-full w-full bg-[linear-gradient(145deg,#202020_0%,#111827_55%,#1e40af_100%)] p-12 text-slate-50">
      <section tw="flex w-full flex-col justify-between rounded-[32px] border border-white/15 bg-slate-900/55 px-11 py-11">
        <article tw="flex max-w-[860px] flex-col gap-[18px]">
          <p tw="flex self-start rounded-full border border-white/20 px-[18px] py-2.5 text-[24px]">
            Clean web page extraction
          </p>
          <h1 tw="flex text-[72px] font-bold leading-[1.05] tracking-[-0.05em]">
            {SITE_NAME}
          </h1>
          <p tw="flex text-[32px] leading-[1.35] text-slate-300">
            {SITE_TAGLINE} with live progress and ready-to-share Markdown
            output.
          </p>
        </article>

        <ul tw="flex gap-4">
          {TWITTER_FEATURES.map((feature) => (
            <FeaturePill
              key={feature.label}
              label={feature.label}
              tw={feature.tw}
            />
          ))}
        </ul>
      </section>
    </main>,
    size,
  );
}
