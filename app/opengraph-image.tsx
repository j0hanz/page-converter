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

const OG_FEATURES = [
  { label: "Clean extraction", tw: "bg-blue-100 text-slate-900" },
  { label: "No account needed", tw: "bg-emerald-100 text-slate-900" },
  { label: "Markdown export", tw: "bg-violet-100 text-slate-900" },
] as const;

function FeaturePill({ label, tw }: { label: string; tw: string }) {
  return (
    <li
      tw={`flex rounded-full px-6 py-3 text-[28px] font-medium leading-none ${tw}`}
    >
      {label}
    </li>
  );
}

export default function OpenGraphImage() {
  return new ImageResponse(
    <main tw="flex h-full w-full bg-[linear-gradient(135deg,#ebebeb_0%,#ffffff_45%,#d9e6ff_100%)] p-14 text-slate-900">
      <section tw="flex w-full rounded-[32px] border border-slate-900/10 bg-white/80 px-12 py-12 shadow-2xl">
        <article tw="flex w-full flex-col justify-between">
          <header tw="flex flex-col gap-[18px]">
            <p tw="flex self-start rounded-full bg-slate-900 px-5 py-2.5 text-[26px] font-semibold tracking-[-0.02em] text-slate-50">
              Web page to Markdown
            </p>
            <h1 tw="flex text-[76px] font-bold leading-[1.05] tracking-[-0.05em]">
              {SITE_NAME}
            </h1>
            <p tw="flex max-w-[820px] text-[34px] leading-[1.3] text-slate-700">
              {SITE_TAGLINE} with live progress, preview, copy, and download.
            </p>
          </header>

          <ul tw="flex gap-[18px]">
            {OG_FEATURES.map((feature) => (
              <FeaturePill
                key={feature.label}
                label={feature.label}
                tw={feature.tw}
              />
            ))}
          </ul>
        </article>
      </section>
    </main>,
    size,
  );
}
