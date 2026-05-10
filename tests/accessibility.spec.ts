import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('homepage has no critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    // Wait for video cards to load so we audit the full page
    await page.locator('a[aria-label^="Watch on YouTube:"]').first().waitFor({ timeout: 15_000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('cookie notice dialog is accessible', async ({ page }) => {
    await page.goto('/');
    const dialog = page.getByRole('dialog', { name: /a note from the bonfire/i });
    await expect(dialog).toBeVisible();

    // Dialog has proper labelling
    await expect(dialog).toHaveAttribute('aria-labelledby', 'consent-title');

    // Buttons are keyboard accessible
    const acceptBtn = page.getByTestId('consent-accept');
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.focus();
    await expect(acceptBtn).toBeFocused();
  });

  test('skip link navigates to videos section', async ({ page }) => {
    // Pre-acknowledge the cookie notice so it does not capture Tab focus
    // before the skip link (role="dialog" steals focus on mobile Chrome).
    await page.addInitScript(() => {
      localStorage.setItem(
        'janimeister.consent.v1',
        JSON.stringify({ acknowledged: true, decidedAt: new Date().toISOString() }),
      );
    });
    await page.goto('/');
    // Tab to reach the skip link
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: /skip to videos/i });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#videos/);
  });

  test('reduced-motion media query is respected', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    // Ember field animations should be effectively disabled
    const ember = page.locator('[aria-hidden="true"] .animate-ember-rise').first();
    const durationStr = await ember.evaluate((el) => getComputedStyle(el).animationDuration);
    // Convert to ms regardless of unit (browsers may return "0.001ms" or "1e-06s")
    const ms = durationStr.endsWith('ms')
      ? parseFloat(durationStr)
      : parseFloat(durationStr) * 1000;
    expect(ms).toBeLessThanOrEqual(1);
  });

  test('images have appropriate alt text or are decorative', async ({ page }) => {
    await page.goto('/');
    await page.locator('a[aria-label^="Watch on YouTube:"]').first().waitFor({ timeout: 15_000 });

    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      // Images should either have alt text or be explicitly decorative (alt="")
      expect(alt).not.toBeNull();
    }
  });

  test('all interactive elements are keyboard focusable', async ({ page }) => {
    await page.goto('/');
    // Dismiss cookie notice first
    await page.getByTestId('consent-accept').click();

    // Tab through and check we can reach key interactive elements
    const focusableSelectors = [
      'a[href="#videos"]', // skip link or CTA
      'a[href="#home"]', // nav brand
    ];
    for (const selector of focusableSelectors) {
      const el = page.locator(selector).first();
      await el.focus();
      await expect(el).toBeFocused();
    }
  });
});
