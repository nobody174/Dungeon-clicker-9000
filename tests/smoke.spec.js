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

// BACKLOG.md #18: a boss kill used to grant no loot roll at all if a previous drop's modal was
// still open (combat.js gated the whole roll behind `pendingLoot === null`). Verifies the fix —
// killing a second boss while the first drop's modal is still up queues the second drop instead
// of silently skipping it, and it's shown once the first is resolved. Uses __dealDamage() instead
// of a real click for the second kill: the modal overlay legitimately blocks clicks on the attack
// button while open (same as a real player), so this simulates the actual repro path — passive
// DPS/units still killing bosses in the background while a modal sits unattended.
test('loot pop-up queues a second drop instead of dropping it while one is already open', async ({ page }) => {
  await page.evaluate(() => { window.__setCurrentFloor(5); window.__loadMonster(5); window.devKillBoss(); window.__dealDamage(1, false); });

  await expect(page.locator('#loot-modal')).toBeVisible({ timeout: 3000 });
  await expect.poll(() => page.evaluate(() => window.__lootQueueLen())).toBe(1);

  // Kill a second boss while the first drop's modal is still open and unresolved.
  await page.evaluate(() => { window.__setCurrentFloor(10); window.__loadMonster(10); window.devKillBoss(); window.__dealDamage(1, false); });
  await page.waitForTimeout(1700); // loot roll fires on a 1.5s setTimeout in combat.js

  // Second drop queued behind the first, not dropped — queue length is 2, modal still shows drop #1.
  await expect.poll(() => page.evaluate(() => window.__lootQueueLen())).toBe(2);
  await expect(page.locator('#loot-modal')).toBeVisible();

  // Resolving the first (Discard) advances to the second — queue shrinks, modal stays open.
  await page.evaluate(() => window.discardPendingLoot());
  await expect.poll(() => page.evaluate(() => window.__lootQueueLen())).toBe(1);
  await expect(page.locator('#loot-modal')).toBeVisible();

  await page.evaluate(() => window.discardPendingLoot());
  await expect.poll(() => page.evaluate(() => window.__lootQueueLen())).toBe(0);
  await expect(page.locator('#loot-modal')).toBeHidden();
});

// BACKLOG.md #19/#24: 0 HP used to be a silent no-op (state.setPlayerHP clamps at 0) while the
// gold miss-penalty kept firing every miss regardless — reaching 0 HP changed nothing. Revised
// design (2026-07-26, after manual playtest feedback): 0 HP does NOT refill and continue — it
// permanently "loses" the current boss fight. The boss stops attacking (no more HP/gold loss is
// possible for the rest of this fight), a defeated banner replaces the HP bar/dodge button, and
// the player must still land the killing blow to advance, but that kill grants no reward.
test('reaching 0 HP loses the fight: boss stops attacking, defeated banner shows, no reward on kill', async ({ page }) => {
  await page.evaluate(() => { window.__setGold(100000); window.__setCurrentFloor(5); window.__loadMonster(5); });
  await expect(page.locator('#player-hp-text')).toHaveText('❤️ 4 / 4');

  // Force 3 misses — HP drops 4 -> 1, fight keeps going, floor unchanged.
  for (let i = 0; i < 3; i++) await page.evaluate(() => window.__forceMiss());
  expect(await page.evaluate(() => window.__playerHP())).toBe(1);
  await expect(page.locator('#floor-label')).toHaveText('Floor 5');

  // 4th miss hits 0 HP — fight is lost: HP stays at 0, HP bar hides, defeated banner shows.
  await page.evaluate(() => window.__forceMiss());
  expect(await page.evaluate(() => window.__playerHP())).toBe(0);
  await expect(page.locator('#player-hp-wrap')).toBeHidden();
  await expect(page.locator('#player-defeated-banner')).toBeVisible();

  // Boss stops attacking: a further forced miss attempt is a no-op (already lost, nothing to lose).
  const goldBeforeExtra = await page.locator('#gold-amount').textContent();
  await page.evaluate(() => window.__forceMiss());
  await expect(page.locator('#gold-amount')).toHaveText(goldBeforeExtra);
  expect(await page.evaluate(() => window.__playerHP())).toBe(0);

  // Landing the killing blow still advances the floor, but grants no gold/loot. Checked
  // immediately after the kill (not after the boss-death animation's 310ms floor transition) so
  // unrelated passive-DPS gold gain from the *next* floor's monster can't be mistaken for a boss
  // reward — this test is only about the lost boss fight's own kill, not what happens afterward.
  const goldBeforeKill = await page.locator('#gold-amount').textContent();
  await page.evaluate(() => { window.devKillBoss(); window.__dealDamage(1, false); });
  await expect(page.locator('#gold-amount')).toHaveText(goldBeforeKill);
  await expect(page.locator('#loot-modal')).toBeHidden();
});

// BACKLOG.md #19: the miss-penalty percentage now tapers down by tier instead of staying a flat
// 5% forever, so a late-game hoarder doesn't lose an ever-larger absolute chunk of gold per miss.
test('miss gold penalty percentage is smaller at a higher floor tier', async ({ page }) => {
  const parseGold = (t) => Number(t.replace(/[^0-9.-]/g, ""));

  await page.evaluate(() => { window.__setGold(100000); window.__setCurrentFloor(5); window.__loadMonster(5); });
  await page.evaluate(() => window.__forceMiss());
  const goldAfterTier0 = parseGold(await page.locator('#gold-amount').textContent());
  const lossTier0 = 100000 - goldAfterTier0;

  await page.evaluate(() => { window.__setGold(100000); window.__setCurrentFloor(205); window.__loadMonster(205); });
  await page.evaluate(() => window.__forceMiss());
  const goldAfterTier20 = parseGold(await page.locator('#gold-amount').textContent());
  const lossTier20 = 100000 - goldAfterTier20;

  expect(lossTier20).toBeLessThan(lossTier0);
});
