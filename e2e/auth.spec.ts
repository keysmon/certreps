import { test, expect } from "@playwright/test";

/**
 * Sign-in/out against a REAL Supabase project. Always skipped in CI - the app builds and
 * serves env-less by design (see playwright.config.ts and .github/workflows/ci.yml), so
 * there is no live auth backend for this to exercise there.
 *
 * To run locally:
 *   1. Put a real NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 *      and `npm run build` WITH them present (a different build than the env-less one CI
 *      uses - the values are inlined at build time).
 *   2. Create a disposable test user in that project.
 *   3. Run: E2E_SUPABASE_READY=1 E2E_TEST_EMAIL=... E2E_TEST_PASSWORD=... npx playwright test auth.spec.ts
 */
test.skip(!process.env.E2E_SUPABASE_READY, "requires a live Supabase project + test credentials - see file header");

test("sign in and out with a real account", async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  test.skip(!email || !password, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set");

  await page.goto("/login");
  await page.locator("#email").fill(email!);
  await page.locator("#password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/account/);
  // Redesign: the top bar's signed-in surface is the account-menu avatar (aria-label "Account menu"),
  // and Sign out moved inside that dropdown (was the top-level .tn-signout). Open the menu, then sign out.
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});
