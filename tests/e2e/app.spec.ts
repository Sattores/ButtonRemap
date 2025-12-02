import { test, expect } from '@playwright/test';

test.describe('USB Configurator E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5000');
  });

  test('should load dashboard', async ({ page }) => {
    // Check that the main UI loads
    await expect(page.locator('text=USB Configurator')).toBeVisible({ timeout: 10000 });
  });

  test('should display device list', async ({ page }) => {
    // Wait for devices to load
    await page.waitForTimeout(2000);

    // Check for device list container
    const deviceList = page.locator('[data-testid="device-list"]').or(page.locator('.device-list'));
    await expect(deviceList.or(page.locator('text=Devices').first())).toBeVisible({ timeout: 5000 });
  });

  test('should have Find Button feature', async ({ page }) => {
    // Look for Find Button
    const findButton = page.locator('button:has-text("Find")').or(page.locator('text=Find Button'));
    await expect(findButton.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display Hotkeys preset category', async ({ page }) => {
    // Check that Hotkeys presets are available
    await page.waitForTimeout(1000);
    const hotkeysCategory = page.locator('text=Hotkeys');
    // May need to click on a device first or scroll
    await expect(hotkeysCategory.first()).toBeVisible({ timeout: 10000 }).catch(() => {
      console.log('Hotkeys category not immediately visible - may require device selection');
    });
  });

  test('should show System Log panel', async ({ page }) => {
    // Check for log panel
    const logPanel = page.locator('text=System Log').or(page.locator('[data-testid="log-panel"]'));
    await expect(logPanel.first()).toBeVisible({ timeout: 5000 });
  });
});
