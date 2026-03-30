import 'server-only';

import { cacheLife } from 'next/cache';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const CONTENT_DIRECTORY = join(process.cwd(), 'content');
const HOME_MARKDOWN_FILES = {
  about: 'about.md',
  howItWorks: 'how-it-works.md',
} as const;
type HomePageMarkdown = {
  aboutMarkdown: string;
  howItWorksMarkdown: string;
};

async function readMarkdownFile(fileName: string): Promise<string> {
  try {
    return await readFile(join(CONTENT_DIRECTORY, fileName), 'utf8');
  } catch (error) {
    throw new Error(`Failed to load home page content: ${fileName}`, {
      cause: error,
    });
  }
}

async function readHomePageMarkdownImpl(): Promise<HomePageMarkdown> {
  const [aboutMarkdown, howItWorksMarkdown] = await Promise.all([
    readMarkdownFile(HOME_MARKDOWN_FILES.about),
    readMarkdownFile(HOME_MARKDOWN_FILES.howItWorks),
  ]);

  return { aboutMarkdown, howItWorksMarkdown };
}

export async function readHomePageMarkdown(): Promise<HomePageMarkdown> {
  'use cache';

  cacheLife('max');

  return readHomePageMarkdownImpl();
}
