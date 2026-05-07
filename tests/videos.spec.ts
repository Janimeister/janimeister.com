import { test, expect } from '@playwright/test';

test.describe('Video section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('consent-accept').click();
    // Wait for videos to load
    await page.locator('a[aria-label^="Watch on YouTube:"]').first().waitFor({ timeout: 15_000 });
  });

  test('displays video cards with correct structure', async ({ page }) => {
    const cards = page.locator('a[aria-label^="Watch on YouTube:"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // First card should have eager-loaded image
    const firstImg = cards.first().locator('img');
    await expect(firstImg).toHaveAttribute('loading', 'eager');
    await expect(firstImg).toHaveAttribute('fetchpriority', 'high');

    // Cards after 3rd should be lazy-loaded
    if (count > 3) {
      const fourthImg = cards.nth(3).locator('img');
      await expect(fourthImg).toHaveAttribute('loading', 'lazy');
    }
  });

  test('video cards link to YouTube', async ({ page }) => {
    const cards = page.locator('a[aria-label^="Watch on YouTube:"]');
    const count = await cards.count();

    for (let i = 0; i < Math.min(count, 3); i++) {
      const href = await cards.nth(i).getAttribute('href');
      expect(href).toMatch(/youtube\.com\/watch\?v=/);
    }
  });

  test('search filters videos correctly', async ({ page }) => {
    const search = page.getByPlaceholder(/seek a fallen foe/i);
    const cards = page.locator('a[aria-label^="Watch on YouTube:"]');
    const initialCount = await cards.count();

    // Search for something that won't match
    await search.fill('xyznonexistent123');
    await expect(page.getByText(/no entries match/i)).toBeVisible();

    // Clear search restores all videos
    await search.fill('');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBe(initialCount);
  });

  test('sort dropdown changes video order', async ({ page }) => {
    const cards = page.locator('a[aria-label^="Watch on YouTube:"]');
    const sortSelect = page.locator('select');

    // Get first video title with default sort (newest)
    const firstTitle = await cards.first().locator('h3').textContent();

    // Switch to oldest
    await sortSelect.selectOption('oldest');
    const oldestFirstTitle = await cards.first().locator('h3').textContent();

    // Switch to alphabetical
    await sortSelect.selectOption('alpha');
    const alphaFirstTitle = await cards.first().locator('h3').textContent();

    // At least one sort should produce a different order
    const allSame = firstTitle === oldestFirstTitle && firstTitle === alphaFirstTitle;
    expect(allSame).toBe(false);
  });

  test('video count is displayed', async ({ page }) => {
    const countText = page.locator('text=/\\d+ entries/');
    await expect(countText).toBeVisible();
  });

  test('each video card shows a publish date', async ({ page }) => {
    const cards = page.locator('a[aria-label^="Watch on YouTube:"]');
    const count = await cards.count();

    for (let i = 0; i < Math.min(count, 3); i++) {
      const time = cards.nth(i).locator('time');
      await expect(time).toHaveAttribute('datetime');
    }
  });
});
