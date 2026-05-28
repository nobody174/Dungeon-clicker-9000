const { test, expect } = require('@playwright/test');

test.describe('Delve — Core Game', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Start fresh — clear any saved game state
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  // ── Page loads ──────────────────────────────────────────────
  test('page title is Delve', async ({ page }) => {
    await expect(page).toHaveTitle('Delve');
  });

  // ── Starting state ───────────────────────────────────────────
  test('starts on Floor 1', async ({ page }) => {
    await expect(page.locator('#floor-label')).toContainText('Floor 1');
  });

  test('gold starts at 0', async ({ page }) => {
    await expect(page.locator('#gold-amount')).toHaveText('0');
  });

  test('first monster is a Slime', async ({ page }) => {
    await expect(page.locator('#monster-name')).toContainText('Slime');
  });

  test('HP bar is visible with correct format', async ({ page }) => {
    await expect(page.locator('#hp-text')).toBeVisible();
    await expect(page.locator('#hp-text')).toContainText('HP:');
  });

  test('achievement counter starts at 0', async ({ page }) => {
    await expect(page.locator('#ach-count')).toHaveText('0');
  });

  // ── UI elements present ──────────────────────────────────────
  test('attack button is visible', async ({ page }) => {
    await expect(page.locator('.attack-btn')).toBeVisible();
  });

  test('shop tab is visible by default', async ({ page }) => {
    await expect(page.locator('#tab-shop')).toBeVisible();
  });

  test('mute button is present', async ({ page }) => {
    await expect(page.locator('#mute-btn')).toBeVisible();
  });

  // ── Gameplay ─────────────────────────────────────────────────
  test('clicking attack reduces monster HP', async ({ page }) => {
    const hpBefore = await page.locator('#hp-text').textContent();
    await page.locator('.attack-btn').click();
    const hpAfter = await page.locator('#hp-text').textContent();
    expect(hpAfter).not.toBe(hpBefore);
  });

  test('stat panel shows click damage and DPS', async ({ page }) => {
    await expect(page.locator('#stat-click')).toBeVisible();
    await expect(page.locator('#stat-dps')).toBeVisible();
  });

});
