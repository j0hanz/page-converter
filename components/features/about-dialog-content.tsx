import AboutDialog from '@/components/features/about-dialog';

import { readHomePageMarkdown } from '@/lib/home-content';

export default async function AboutDialogContent() {
  const { aboutMarkdown, howItWorksMarkdown } = await readHomePageMarkdown();

  return (
    <AboutDialog
      aboutMarkdown={aboutMarkdown}
      howItWorksMarkdown={howItWorksMarkdown}
    />
  );
}
