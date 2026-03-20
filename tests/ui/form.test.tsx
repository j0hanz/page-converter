// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TransformForm from "@/components/form";

const onSubmit = vi.fn();
const VALID_URL = "https://example.com";

describe("TransformForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders URL input and submit button", () => {
    renderForm();

    expect(screen.getByLabelText(/URL/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /convert/i }),
    ).toBeInTheDocument();
  });

  it("submits the current URL value", () => {
    renderForm();
    submitUrl(`  ${VALID_URL}  `);

    expect(onSubmit).toHaveBeenCalledWith(VALID_URL);
  });

  it("disables the URL input and changes button text while loading", () => {
    renderForm({ loading: true });

    expect(screen.getByLabelText(/URL/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /converting/i })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /^convert$/i }),
    ).not.toBeInTheDocument();
  });
});

function renderForm({ loading = false }: { loading?: boolean } = {}) {
  return render(<TransformForm loading={loading} onSubmit={onSubmit} />);
}

function submitUrl(url: string) {
  fireEvent.change(screen.getByLabelText(/URL/i), {
    target: { value: url },
  });
  fireEvent.click(screen.getByRole("button", { name: /convert/i }));
}
