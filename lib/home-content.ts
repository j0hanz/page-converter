import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import 'server-only';

const CONTENT_DIRECTORY = join(process.cwd(), 'content');
const HOME_MARKDOWN_FILES = {
  about: 'about.md',
  howItWorks: 'how-it-works.md',
} as const;

async function readMarkdownFile(fileName: string): Promise<string> {
  try {
    return await readFile(join(CONTENT_DIRECTORY, fileName), 'utf8');
  } catch (error) {
    throw new Error(`Failed to load home page content: ${fileName}`, {
      cause: error,
    });
  }
}

export async function readHomePageMarkdown(): Promise<{
  aboutMarkdown: string;
  howItWorksMarkdown: string;
}> {
  const [aboutMarkdown, howItWorksMarkdown] = await Promise.all([
    readMarkdownFile(HOME_MARKDOWN_FILES.about),
    readMarkdownFile(HOME_MARKDOWN_FILES.howItWorks),
  ]);

  return { aboutMarkdown, howItWorksMarkdown };
}
