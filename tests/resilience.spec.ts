import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Resilience', () => {
  test('a failed feed keeps the page usable and offers YouTube + retry', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.route('**/videos.json', (route) => route.fulfill({ status: 500, body: 'down' }));

    await page.goto('/');

    await expect(page.getByRole('alert')).toContainText(/archive could not be summoned/i);
    await expect(page.getByRole('link', { name: /watch on youtube/i }).last()).toHaveAttribute(
      'href',
      'https://www.youtube.com/@janimeister/videos',
    );
    // The rest of the page still renders.
    await expect(page.getByRole('heading', { level: 1, name: /janimeister/i })).toBeVisible();
    await expect(page.locator('#about')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    expect(errors).toEqual([]);

    const results = await new AxeBuilder({ page })
      .include('#videos')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('retry recovers once the feed is reachable again', async ({ page }) => {
    let fail = true;
    await page.route('**/videos.json', (route) =>
      fail ? route.fulfill({ status: 503, body: 'down' }) : route.fallback(),
    );
    await page.goto('/');
    await expect(page.getByRole('alert')).toBeVisible();

    fail = false;
    await page.getByRole('button', { name: /try again/i }).click();

    await expect(page.locator('a[aria-label^="Watch on YouTube:"]').first()).toBeVisible();
    await expect(page.getByRole('alert')).toBeHidden();
  });

  test('a malformed feed does not blank the page', async ({ page }) => {
    await page.route('**/videos.json', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"videos": null}' }),
    );
    await page.goto('/');
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: /janimeister/i })).toBeVisible();
  });

  test('entries with unparseable dates show "Date unknown"', async ({ page }) => {
    await page.route('**/videos.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          channelId: 'UC1',
          channelTitle: 'Janimeister',
          channelUrl: 'https://www.youtube.com/@janimeister',
          fetchedAt: '2024-03-15T12:00:00.000Z',
          videos: [{ id: 'x1', title: 'Undated Boss', url: 'https://www.youtube.com/watch?v=x1', thumbnail: '', publishedAt: 'nope' }],
        }),
      }),
    );
    await page.goto('/');
    await expect(page.getByText('Undated Boss')).toBeVisible();
    await expect(page.getByText('Date unknown')).toBeVisible();
    await expect(page.getByText(/invalid date/i)).toHaveCount(0);
  });
});

test.describe('Without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the built page lists the videos in a noscript fallback', async ({ page }) => {
    await page.goto('/');
    const links = page.locator('noscript a[href^="https://www.youtube.com/watch?v="]');
    await expect(links.first()).toBeVisible();
    await expect(links.first()).toHaveText('Malenia, Blade of Miquella | No Hit');
  });
});

test.describe('Content Security Policy', () => {
  test('only allows same-origin connections when no live feed is configured', async ({ page }) => {
    await page.goto('/');
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("connect-src 'self';");
    expect(csp).not.toMatch(/connect-src[^;]*https:(?!\/\/)/);
  });
});
