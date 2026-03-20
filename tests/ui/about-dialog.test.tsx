// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AboutDialog from "@/components/about-dialog";

describe("AboutDialog", () => {
  it("exposes an accessible dialog name", async () => {
    const user = userEvent.setup();
    render(
      <AboutDialog markdown="# Overview" howItWorksMarkdown="# How It Works" />,
    );

    await user.click(
      screen.getByRole("button", { name: /about page converter/i }),
    );

    expect(
      await screen.findByRole("dialog", { name: /about/i }),
    ).toBeInTheDocument();
  });

  it("renders the markdown tab content", async () => {
    const user = userEvent.setup();
    render(
      <AboutDialog markdown="# Overview" howItWorksMarkdown="# How It Works" />,
    );

    expect(
      screen.getByRole("button", { name: /about page converter/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /about page converter/i }),
    );

    expect(
      await screen.findByRole("heading", { name: "Overview" }),
    ).toBeInTheDocument();
  });
});
