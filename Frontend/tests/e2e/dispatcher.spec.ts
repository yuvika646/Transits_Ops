import { test, expect } from '@playwright/test';
test('dispatcher can sign in and reach dispatch board', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByText('Trip Dispatcher')).not.toBeVisible();
  await page.goto('/trips');
  await expect(page.getByText('New trip')).toBeVisible();
});
