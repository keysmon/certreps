import { render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { WorkspaceNav } from "./WorkspaceNav";
let pathname = "/catalog";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
beforeEach(() => { pathname = "/catalog"; });
it("keeps catalog, progress and settings reachable with the current section identified", () => {
  render(<WorkspaceNav />);
  const rail = screen.getByRole("navigation", { name: "Workspace navigation" });
  expect(within(rail).getByRole("link", { name: /certifications/i })).toHaveAttribute("href", "/catalog");
  expect(within(rail).getByRole("link", { name: /certifications/i })).toHaveAttribute("aria-current", "page");
  expect(within(rail).getByRole("link", { name: /my progress/i })).toHaveAttribute("href", "/account");
  expect(within(rail).getByRole("link", { name: /settings/i })).toHaveAttribute("href", "/settings");
});
it("identifies saved result reviews as progress", () => {
  pathname = "/account/attempts/test";
  render(<WorkspaceNav />);
  const rail = screen.getByRole("navigation", { name: "Workspace navigation" });
  expect(within(rail).getByRole("link", { name: /my progress/i })).toHaveAttribute("aria-current", "page");
});
it("opens the mobile menu and closes it with Escape and on navigation", async () => {
  const user = userEvent.setup();
  const { rerender } = render(<WorkspaceNav />);
  const menu = screen.getByRole("button", { name: "Open navigation" });
  await user.click(menu);
  expect(screen.getByRole("navigation", { name: "Mobile workspace navigation" })).toBeVisible();
  await user.keyboard("{Escape}");
  expect(menu).toHaveFocus();
  expect(menu).toHaveAttribute("aria-expanded", "false");
  await user.click(menu);
  pathname = "/settings";
  rerender(<WorkspaceNav />);
  expect(menu).toHaveAttribute("aria-expanded", "false");
});

it("identifies curriculum and lesson routes as Learn without marking Certifications active", () => {
  for (const route of ["/learn", "/aws/aip-c01/learn", "/guides/aip-c01/implementation-and-integration"]) {
    pathname = route;
    const {unmount} = render(<WorkspaceNav />);
    const rail = screen.getByRole("navigation", { name: "Workspace navigation" });
    expect(within(rail).getByRole("link", { name: /Learn/i })).toHaveAttribute("aria-current", "page");
    expect(within(rail).getByRole("link", { name: /Certifications/i })).not.toHaveAttribute("aria-current");
    unmount();
  }
});
