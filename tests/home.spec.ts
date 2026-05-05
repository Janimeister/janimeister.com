import { test, expect } from '@playwright/test';

test.describe('Janimeister site', () => {
  test('renders hero, navigation and chronicles', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Janimeister/);

    // Hero
    await expect(page.getByRole('heading', { level: 1, name: /janimeister/i })).toBeVisible();

    // CTA enters the archive
    const cta = page.getByRole('link', { name: /enter the archive/i });
    await expect(cta).toBeVisible();

    // At least one video card appears
    const videoCards = page.locator('a[aria-label^="Watch on YouTube:"]');
    await expect(videoCards.first()).toBeVisible({ timeout: 15_000 });
    expect(await videoCards.count()).toBeGreaterThan(0);

    // Each card links to a YouTube watch URL.
    const href = await videoCards.first().getAttribute('href');
    expect(href).toMatch(/youtube\.com\/watch\?v=/);
  });

  test('search filters chronicles', async ({ page }) => {
    await page.goto('/');
    const search = page.getByPlaceholder(/seek a fallen foe/i);
    await search.fill('zzzznotreallyaboss');
    await expect(page.getByText(/no entries match/i)).toBeVisible();
    await search.fill('');
    await expect(page.locator('a[aria-label^="Watch on YouTube:"]').first()).toBeVisible();
  });

  test('cookie notice persists acknowledgement in localStorage', async ({ page }) => {
    await page.goto('/');
    const dialog = page.getByRole('dialog', { name: /a note from the bonfire/i });
    await expect(dialog).toBeVisible();

    await page.getByTestId('consent-accept').click();
    await expect(dialog).toBeHidden();

    const stored = await page.evaluate(() =>
      window.localStorage.getItem('janimeister.consent.v1'),
    );
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toMatchObject({ acknowledged: true });

    await page.reload();
    await expect(page.getByRole('dialog', { name: /a note from the bonfire/i })).toHaveCount(0);
  });

  test('mobile menu opens', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-only assertion');
    await page.goto('/');
    await page.getByRole('button', { name: /toggle menu/i }).click();
    await expect(page.getByRole('link', { name: /chronicles/i })).toBeVisible();
  });
});
