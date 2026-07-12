// ─────────────────────────────────────
// Boss Trophy Room tab — per-monster-type gallery, reusing the tiered-identity
// structure item 1a introduced (TIER_PREFIXES + monsters). Only defeated (bool),
// first-kill floor, and total-defeats-as-boss are tracked — fastest-kill-time and
// highest-damage-hit are explicitly out of scope (need new instrumentation the
// game doesn't have yet), so this deliberately never renders those fields.
// ─────────────────────────────────────
import * as state from "./state.js";
import { getTrophyGallery } from "./monsters.js";

export function updateTrophyCount() {
  const el = document.getElementById("trophy-count");
  const totalEl = document.getElementById("trophy-total");
  if (!el || !totalEl) return;
  // Trophies are recorded per base monster (baseIndex 0-9), not per tier, so the headline ratio
  // is "distinct base monsters defeated as a boss out of 10" — the gallery below still shows every
  // tier's name/icon variant so the completionist pull covers the full tiered-identity set.
  const baseDefeated = Object.values(state.bossTrophies).filter(t => t.defeated).length;
  el.textContent = baseDefeated;
  totalEl.textContent = "10";
}

export function renderTrophyRoom() {
  const container = document.getElementById("trophy-list");
  if (!container) return;
  container.innerHTML = "";
  const gallery = getTrophyGallery();
  for (const entry of gallery) {
    const record = state.bossTrophies[entry.baseIndex];
    const defeated = !!record?.defeated;
    const div = document.createElement("div");
    div.className = "trophy-card " + (defeated ? "trophy-unlocked" : "trophy-locked");
    if (defeated) {
      div.innerHTML = `
        <span class="trophy-icon">${entry.icon}</span>
        <span class="trophy-info">
          <span class="trophy-name">${entry.name}</span>
          <span class="trophy-stats">First felled: Floor ${record.firstFloor} • Boss kills: ${record.kills}</span>
        </span>`;
    } else {
      div.innerHTML = `
        <span class="trophy-icon trophy-icon-locked">❔</span>
        <span class="trophy-info">
          <span class="trophy-name trophy-name-locked">???</span>
          <span class="trophy-stats">Defeat this as a boss (floor ${entry.minFloor}+)</span>
        </span>`;
    }
    container.appendChild(div);
  }
  updateTrophyCount();
}
