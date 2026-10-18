import { defineConfig, devices } from "@playwright/test";

// Real-user E2E suite against a PREBUILT app (see README note below) - never `next dev`,
// so what we test is the same optimized/static output that ships. Anonymous flows only:
// the app builds and serves env-less (NEXT_PUBLIC_SUPABASE_* empty), matching CI exactly
// (see .github/workflows/ci.yml) and lib/supabase/client.ts's supabaseAvailable() gate.
//
// Local run: `npm run build` once, then `npm run e2e` (or `npm run e2e:ui`). CI builds in
// an earlier step and this config's webServer starts the prebuilt .next for the test run.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3300",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", testIgnore: /iphone-mobile\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "iphone-safari", testMatch: /iphone-mobile\.spec\.ts/, use: { ...devices["iPhone 14 Pro Max"], browserName: "webkit", contextOptions: { reducedMotion: "reduce" } } },
  ],
  webServer: {
    command: "npx next start -p 3300",
    url: "http://localhost:3300",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      // Empty, not omitted: NEXT_PUBLIC_* values are inlined at build time, so this only
      // documents the contract for anyone running `next start` directly - it changes
      // nothing the build didn't already bake in.
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    },
  },
});
