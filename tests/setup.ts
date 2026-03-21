import '@testing-library/jest-dom/vitest';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

export async function submitUrlForm(url: string) {
  const user = userEvent.setup();
  const input = screen.getByLabelText(/URL/i);

  await user.clear(input);
  await user.type(input, url);
  await user.click(screen.getByRole('button', { name: /convert/i }));
}
