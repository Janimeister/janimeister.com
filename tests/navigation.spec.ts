import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Dismiss cookie notice
    await page.getByTestId('consent-accept').click();
  });

  test('desktop nav links scroll to correct sections', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop-only assertion');

    const chroniclesLink = page.locator('nav[aria-label="Primary"] a[href="#videos"]');
    await chroniclesLink.click();
    await expect(page).toHaveURL(/#videos/);

    const aboutLink = page.locator('nav[aria-label="Primary"] a[href="#about"]');
    await aboutLink.click();
    await expect(page).toHaveURL(/#about/);
  });

  test('mobile menu opens and closes', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-only assertion');

    const menuButton = page.getByRole('button', { name: /toggle menu/i });
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    await menuButton.click();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#mobile-menu')).toBeVisible();

    // Clicking a link closes the menu
    await page.locator('#mobile-menu a[href="#videos"]').click();
    await expect(page.locator('#mobile-menu')).toBeHidden();
  });

  test('nav becomes sticky with backdrop on scroll', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop-only assertion');
    const header = page.locator('header');
    await expect(header).toHaveClass(/bg-transparent/);

    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForTimeout(300);
    await expect(header).toHaveClass(/backdrop-blur-md/);
  });

  test('external links open in new tab', async ({ page }) => {
    const youtubeLinks = page.locator('a[target="_blank"]');
    const count = await youtubeLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const link = youtubeLinks.nth(i);
      await expect(link).toHaveAttribute('rel', /noreferrer/);
      await expect(link).toHaveAttribute('rel', /noopener/);
    }
  });

  test('footer nav links are functional', async ({ page }) => {
    const footerNav = page.locator('nav[aria-label="Footer"]');
    await expect(footerNav).toBeVisible();

    const aboutLink = footerNav.getByRole('link', { name: /about/i });
    await expect(aboutLink).toHaveAttribute('href', '#about');

    const youtubeLink = footerNav.getByRole('link', { name: /youtube/i });
    await expect(youtubeLink).toHaveAttribute('href', /youtube\.com/);
    await expect(youtubeLink).toHaveAttribute('target', '_blank');

    const noticesLink = footerNav.getByRole('link', { name: /third party notices/i });
    await expect(noticesLink).toHaveAttribute('href', '#third-party-notices');
  });

  test('third party notices dialog opens and closes', async ({ page }) => {
    const footerNav = page.locator('nav[aria-label="Footer"]');
    const noticesLink = footerNav.getByRole('link', { name: /third party notices/i });

    // Scroll to footer and click the link
    await noticesLink.scrollIntoViewIfNeeded();
    await noticesLink.click();

    // Dialog should be visible
    const dialog = page.getByRole('dialog', { name: /third party notices/i });
    await expect(dialog).toBeVisible();

    // Should contain rendered markdown content from the notices body
    const noticesBody = dialog.locator('.notices-content');
    await expect(noticesBody).toBeVisible();
    // "React" is a known top-level section heading in THIRD_PARTY_NOTICES.md
    await expect(noticesBody.locator('h2', { hasText: 'React' }).first()).toBeVisible();

    // Close the dialog
    await page.getByLabel(/close third party notices/i).click();
    await expect(dialog).toBeHidden();
  });
});
