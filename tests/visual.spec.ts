import { test, expect } from '@playwright/test';

test.describe('Visual and responsive', () => {
  test('page renders without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.locator('a[aria-label^="Watch on YouTube:"]').first().waitFor({ timeout: 15_000 });

    expect(errors).toEqual([]);
  });

  test('no broken images on the page', async ({ page }) => {
    // The fixture's video IDs don't exist, so YouTube answers their thumbnails
    // with a 404 placeholder, which Firefox treats as a broken image. Serve a
    // thumbnail-sized image instead so the test checks the page, not YouTube.
    await page.route('https://i.ytimg.com/**', (route) =>
      route.fulfill({ path: 'tests/fixtures/thumbnail.png' }),
    );
    await page.goto('/');
    await page.locator('a[aria-label^="Watch on YouTube:"]').first().waitFor({ timeout: 15_000 });

    const brokenImages = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      return Array.from(images).filter(
        (img) => img.complete && img.naturalWidth === 0,
      ).length;
    });

    expect(brokenImages).toBe(0);
  });

  test('page has correct meta tags', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Janimeister/);
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /FromSoftware/);

    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /Janimeister/);
  });

  test('page loads within reasonable time', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.locator('h1').waitFor();
    const loadTime = Date.now() - start;

    // Page should load within 5 seconds even on slower CI
    expect(loadTime).toBeLessThan(5000);
  });

  test('responsive layout adapts for mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-only assertion');
    await page.goto('/');
    await page.getByTestId('consent-accept').click();
    await page.locator('a[aria-label^="Watch on YouTube:"]').first().waitFor({ timeout: 15_000 });

    // On mobile, video grid should be single column
    const grid = page.locator('ul.grid');
    const gridClass = await grid.getAttribute('class');
    expect(gridClass).toContain('grid-cols-1');

    // Mobile menu button should be visible
    await expect(page.getByRole('button', { name: /toggle menu/i })).toBeVisible();
  });

  test('fonts are loaded', async ({ page }) => {
    await page.goto('/');
    // `document.fonts.ready` can resolve before the page starts loading Cinzel
    // (seen in WebKit under load), so poll until it has loaded.
    await expect
      .poll(() => page.evaluate(() => document.fonts.check('16px Cinzel')))
      .toBe(true);
  });
});
