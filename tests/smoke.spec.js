const { test, expect } = require('@playwright/test');

// Regression harness for the js/css file-split migration (Option B).
// Each test clears localStorage first so runs don't leak state into each other.

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('page loads without console errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.locator('.attack-btn')).toBeVisible();
  await expect(page.locator('#floor-label')).toHaveText('Floor 1');
  expect(errors).toEqual([]);
});

test('clicking attack deals damage and eventually earns gold', async ({ page }) => {
  const goldEl = page.locator('#gold-amount');
  await expect(goldEl).toHaveText('0');

  // Slime has 40 HP, starting click damage is 10 — a handful of clicks should kill it.
  for (let i = 0; i < 10; i++) {
    await page.locator('.attack-btn').click();
  }

  const goldText = await goldEl.textContent();
  expect(Number(goldText)).toBeGreaterThan(0);
});

test('buying a unit increases passive DPS stat', async ({ page }) => {
  const dpsEl = page.locator('#stat-dps');
  await expect(dpsEl).toHaveText('0 / sec');

  // Earn enough gold to afford the cheapest unit (Squire, 200g).
  for (let i = 0; i < 40; i++) {
    await page.locator('.attack-btn').click();
  }

  await page.evaluate(() => { window.__setGold(1000); showShopTab('units'); });

  const squireBtn = page.locator('#unit-list button', { hasText: 'Squire' }).first();
  await squireBtn.click();

  await expect(dpsEl).not.toHaveText('0 / sec');
});

test('save and reload round-trips gold and floor state', async ({ page }) => {
  for (let i = 0; i < 10; i++) {
    await page.locator('.attack-btn').click();
  }
  const goldBefore = await page.locator('#gold-amount').textContent();

  await page.evaluate(() => window.__saveGame());
  await page.reload();

  const goldAfter = await page.locator('#gold-amount').textContent();
  expect(goldAfter).toBe(goldBefore);
});

test('reaching floor 5 shows boss UI', async ({ page }) => {
  await page.evaluate(() => {
    window.__setGold(50000);
    window.__setClickDamage(5000);
    window.__setCurrentFloor(4);
    window.__loadMonster(4);
  });

  await page.locator('.attack-btn').click();

  await expect(page.locator('#floor-label')).toHaveText('Floor 5');
  await expect(page.locator('#boss-badge')).toBeVisible();
});

test('boss floor shows player HP bar and dodge button; non-boss floor hides it', async ({ page }) => {
  await page.evaluate(() => {
    window.__setCurrentFloor(5);
    window.__loadMonster(5);
  });
  await expect(page.locator('#player-hp-wrap')).toBeVisible();
  await expect(page.locator('#player-hp-text')).toHaveText('❤️ 4 / 4');
  await expect(page.locator('#dodge-btn')).toBeVisible();

  await page.evaluate(() => {
    window.__setCurrentFloor(6);
    window.__loadMonster(6);
  });
  await expect(page.locator('#player-hp-wrap')).toBeHidden();
});

test('trophy room tab shows the full tiered gallery and locked/unlocked state', async ({ page }) => {
  await page.evaluate(() => showTab('trophies'));
  await expect(page.locator('#tab-trophies')).toBeVisible();
  await expect(page.locator('#trophy-list .trophy-card')).toHaveCount(80);
  await expect(page.locator('#trophy-count')).toHaveText('0');
});

test('challenge run isolates state from the main save and restores it on exit', async ({ page }) => {
  for (let i = 0; i < 5; i++) await page.locator('.attack-btn').click();
  const goldBefore = await page.locator('#gold-amount').textContent();

  await page.evaluate(() => window.startChallenge());
  await expect(page.locator('#challenge-bar')).toBeVisible();
  await expect(page.locator('#gold-amount')).toHaveText('0');

  await page.evaluate(() => window.exitChallengeEarly());
  await expect(page.locator('#challenge-bar')).toBeHidden();
  await expect(page.locator('#gold-amount')).toHaveText(goldBefore);
});
