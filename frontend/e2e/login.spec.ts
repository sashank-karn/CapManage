import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test('loads login page and shows form elements', async ({ page }) => {
    await page.goto('/login');
    // Expect email and password fields to be present
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    // Expect submit/login button
    await expect(page.getByRole('button', { name: /log in|sign in/i })).toBeVisible();
  });
});
