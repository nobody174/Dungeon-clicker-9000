// ─────────────────────────────────────
// Display updaters, tab switching, and misc DOM-facing effects.
// ─────────────────────────────────────
import * as state from "./state.js";
import { formatNum } from "./utils.js";
import { getTotalMult } from "./stats.js";
import { heroes } from "./heroes.js";

export function updateGold() {
  document.getElementById("gold-amount").textContent = formatNum(state.gold);
}

export function updateHPBar() {
  const pct = state.monsterMaxHP > 0 ? (state.monsterHP / state.monsterMaxHP) * 100 : 0;
  document.getElementById("hp-fill").style.width = pct + "%";
  document.getElementById("hp-text").textContent = "HP: " + formatNum(state.monsterHP) + " / " + formatNum(state.monsterMaxHP);

  const shieldWrap = document.getElementById("shield-bar-wrap");
  const shieldText = document.getElementById("shield-text");
  if (state.monsterShieldMax > 0 && state.monsterShield > 0) {
    shieldWrap.classList.add("shield-active");
    shieldText.classList.remove("hidden");
    const sPct = (state.monsterShield / state.monsterShieldMax) * 100;
    document.getElementById("shield-fill").style.width = sPct + "%";
    shieldText.textContent = "🛡 " + formatNum(state.monsterShield) + " / " + formatNum(state.monsterShieldMax);
  } else {
    shieldWrap.classList.remove("shield-active");
    shieldText.classList.add("hidden");
  }

  const pipsEl = document.getElementById("phase-pips");
  if (state.bossPhaseCount > 0) {
    pipsEl.innerHTML = "";
    for (let i = 0; i < state.bossPhaseCount; i++) {
      const pip = document.createElement("div");
      pip.className = "phase-pip" + (i < state.bossPhaseIndex ? " pip-done" : i === state.bossPhaseIndex ? " pip-active" : "");
      pipsEl.appendChild(pip);
    }
  } else {
    pipsEl.innerHTML = "";
  }
}

export function renderStats() {
  const effClick = Math.floor(state.clickDamage * (1 + getTotalMult("clickMult")));
  document.getElementById("stat-click").textContent = formatNum(effClick) + " dmg";
  const atkDmg = document.getElementById("atk-dmg");
  if (atkDmg) atkDmg.textContent = formatNum(effClick) + " dmg";
  const effDPS = Math.floor(state.passiveDamage * (1 + getTotalMult("dpsMult")));
  document.getElementById("stat-dps").textContent = formatNum(effDPS) + " / sec";

  const aldric = heroes.find(h => h.id === "aldric");
  const speedRow = document.getElementById("stat-speed-row");
  if (aldric?.unlocked) {
    speedRow.classList.remove("hidden");
    document.getElementById("stat-speed").textContent = "+" + Math.round(getTotalMult("attackSpeedMult") * 100) + "%";
  } else {
    speedRow.classList.add("hidden");
  }
}

export function updateShardDisplay() {
  document.getElementById("shard-balance").textContent = state.shardBalance;
  const mult = (1 + state.totalShardsEarned * 0.1).toFixed(1);
  document.getElementById("shard-mult").textContent = mult;
}

export function updateAscendSection() {
  const canAscend = state.currentFloor >= 20;
  const btn  = document.getElementById("ascend-btn");
  const info = document.getElementById("ascend-info");
  const dot  = document.getElementById("ascend-dot");

  if (canAscend) {
    // calcShardsToEarn lives in stats.js; compute inline-equivalent to avoid importing prestige-adjacent
    // logic here — same formula as stats.js:calcShardsToEarn.
    const n = Math.max(1, Math.floor(state.currentFloor / 5) - 3);
    info.textContent = "Ready! You'll earn " + n + " Soul Shard" + (n !== 1 ? "s" : "") + ".";
    btn.style.display = "block";
    btn.classList.add("pulsing");
    dot.style.display = "inline";
  } else {
    info.textContent = "Reach floor 20 to Ascend.  (Floor " + state.currentFloor + ")";
    btn.style.display = "none";
    dot.style.display = "none";
  }
}

export function updatePrestigeBadge() {
  const b = document.getElementById("prestige-badge");
  if (!b) return;
  if (state.prestigeCount > 0) { b.textContent = "⚡ P" + state.prestigeCount; b.style.display = "inline-block"; }
  else b.style.display = "none";
}

export function flashSaveIndicator() {
  const el = document.getElementById("save-indicator");
  if (!el) return;
  el.style.opacity = "1";
  clearTimeout(state.saveIndicatorTimer);
  state.setSaveIndicatorTimer(setTimeout(() => { el.style.opacity = "0"; }, 2000));
}

export function shakeScreen() {
  const p = document.querySelector(".game-panel");
  if (!p) return;
  p.classList.remove("shaking-screen"); void p.offsetWidth; p.classList.add("shaking-screen");
}

export function flashGold() {
  const d = document.querySelector(".gold-display");
  if (!d) return;
  d.classList.remove("flash"); void d.offsetWidth; d.classList.add("flash");
}

export function resetGame() {
  if (!confirm("Delete all save data and restart? This cannot be undone.")) return;
  localStorage.clear(); location.reload();
}

const TAB_ORDER = ["shop","gear","heroes","potions","shards","achievements","trophies","dev"];

export function showTab(tab) {
  TAB_ORDER.forEach(t => {
    const el = document.getElementById("tab-" + t);
    if (t !== tab) { el.style.display = "none"; return; }
    el.style.display = t === "shop" ? "flex" : "block";
  });
  document.querySelectorAll(".tab-btn").forEach((btn, i) => {
    btn.classList.toggle("active", i === TAB_ORDER.indexOf(tab));
  });
}

export function showShopTab(sub) {
  ["weapons","units"].forEach(s => {
    document.getElementById("subtab-" + s).style.display = s === sub ? "block" : "none";
  });
  document.querySelectorAll("#tab-shop .sub-tab-btn").forEach((btn, i) => {
    btn.classList.toggle("active", i === ["weapons","units"].indexOf(sub));
  });
}

export function showGearTab(sub) {
  ["equipped","bag"].forEach(s => {
    document.getElementById("subtab-" + s).style.display = s === sub ? "block" : "none";
  });
  document.querySelectorAll("#tab-gear .sub-tab-btn").forEach((btn, i) => {
    btn.classList.toggle("active", i === ["equipped","bag"].indexOf(sub));
  });
}
