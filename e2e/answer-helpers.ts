import type { Page } from '@playwright/test';
/** Choose a complete response without coupling a navigation test to correctness. */
export async function chooseFirstAnswer(page: Page) {
  const options=page.locator('button.option');
  await options.first().click();
  if ((await options.first().getAttribute('class'))?.split(' ').includes('multi')) await options.nth(1).click();
}
