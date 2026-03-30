import { readHomePageMarkdown } from '@/lib/home-content';

const HOME_CONTENT_HEADERS = {
  'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
} as const;

export async function GET(): Promise<Response> {
  const { aboutMarkdown, howItWorksMarkdown } = await readHomePageMarkdown();

  return Response.json(
    {
      aboutMarkdown,
      markdown: aboutMarkdown,
      howItWorksMarkdown,
    },
    {
      headers: HOME_CONTENT_HEADERS,
    }
  );
}
