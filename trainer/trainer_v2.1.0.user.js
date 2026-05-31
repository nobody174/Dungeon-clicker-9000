// ==UserScript==
// @name         Dungeon Clicker 9000 — Trainer
// @namespace    laffs2k5.dungeon
// @version      2.1.0
// @description  Trainer for Dungeon Clicker 9000: value editor, auto-buy (weapons + archmage/knight), respawn tuning, auto-attack, auto-prestige, flash suppression, manual save, save export/import, and a sticky activity banner.
// @author       you
// @match        https://html-classic.itch.zone/*
// @match        https://html.itch.zone/*
// @match        https://*.itch.zone/*
// @match        https://*.hwcdn.net/*
// @match        https://nobody174.github.io/*
// @match        http://localhost/*
// @match        http://127.0.0.1/*
// @match        file:///*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  "use strict";
  console.log("[DC9000 trainer] script start in", location.href);

  const K = {
    open: "__ldr_open", noanim: "__ldr_noanim", auto: "__ldr_auto", rate: "__ldr_rate",
    ap: "__ldr_ap", apf: "__ldr_apf", ab: "__ldr_ab", respawn: "__ldr_respawn",
  };
  const get  = (k, d) => { const v = localStorage.getItem(k); return v === null ? d : v; };
  const setb = (k, v) => localStorage.setItem(k, v ? "1" : "0");
  const isOn = (k, d = false) => get(k, d ? "1" : "0") === "1";
  const notify = (t, d) => { try { if (typeof window.showToast === "function") window.showToast(t, d); } catch (_) {} };

  const WEAPON_IDS = ["sword", "gloves", "axe", "bow", "tome", "stormstrike", "shadowreaper", "deathscythe"];
  const UNIT_DPS = { squire: 2, rogue: 5, mage: 15, knight: 80, archmage: 400 }; // base DPS per unit
  const COST_GROWTH = 1.15; // game's per-purchase cost multiplier; also the "save vs buy" value threshold
  const RESPAWN_ORIG = 310; // the game's hard-coded respawn delay (unique value)

  let autoTimer = null;
  let animStyle = null;
  let respawnMs = Math.max(0, parseInt(get(K.respawn, String(RESPAWN_ORIG)), 10) || RESPAWN_ORIG);

  // ── Respawn tuning: intercept exactly the game's 310ms respawn timer ──
  (function patchTimer() {
    const orig = window.setTimeout;
    window.setTimeout = function (fn, delay) {
      if (delay === RESPAWN_ORIG) delay = respawnMs;
      return orig.apply(this, [fn, delay].concat([].slice.call(arguments, 2)));
    };
  })();

  // ── Wait for the game's layout, then inject once ──
  function waitForGame(tries = 0) {
    const layout     = document.querySelector(".layout");
    const gamePanel  = document.querySelector(".game-panel");
    const rightPanel = document.querySelector(".right-panel");
    const isGame     = document.getElementById("floor-label") || /Dungeon Clicker/i.test(document.title);
    if (layout && gamePanel && rightPanel && isGame) { inject(layout, rightPanel); return; }
    if (tries < 120) { setTimeout(() => waitForGame(tries + 1), 150); return; }
    if (isGame) console.warn("[DC9000 trainer] game detected but .layout/.right-panel not found");
  }

  function addBanner(layout) {
    if (document.getElementById("ldr-banner")) return;
    const b = document.createElement("div");
    b.id = "ldr-banner";
    b.innerHTML = `
      <style>
        #ldr-banner{position:sticky;top:0;z-index:3000;width:100%;max-width:860px;box-sizing:border-box;
          margin:0 auto .9rem;display:flex;align-items:center;gap:.55rem;font-family:Georgia,serif;
          background:#1c1430;border:1px solid #7040a0;border-left:4px solid #c9a84c;border-radius:10px;
          padding:.5rem .9rem;font-size:.82rem;color:#cc99ff;box-shadow:0 2px 12px rgba(0,0,0,.55)}
        #ldr-banner .dot{width:8px;height:8px;border-radius:50%;background:#7CFC00;
          box-shadow:0 0 8px #7CFC00;animation:ldrpulse 1.6s infinite}
        @keyframes ldrpulse{0%,100%{opacity:1}50%{opacity:.25}}
        #ldr-banner b{color:#c9a84c}
        #ldr-banner .x{margin-left:auto;background:none;border:none;color:#779;cursor:pointer;font:1rem Georgia,serif}
        #ldr-banner .x:hover{color:#ccc}
      </style>
      <span class="dot"></span>
      <span>&#128295; <b>Trainer active</b> &middot; <span id="ldr-banner-kills">0</span> kills</span>
      <button class="x" title="hide">&#10005;</button>`;
    (layout.parentNode || document.body).insertBefore(b, layout);
    b.querySelector(".x").addEventListener("click", () => b.remove());
    setInterval(() => {
      const el = document.getElementById("ldr-banner-kills");
      if (el) el.textContent = (parseInt(localStorage.getItem("totalKills") || "0", 10) || 0).toLocaleString();
    }, 600);
  }

  function inject(layout, rightPanel) {
    if (document.getElementById("ldr-panel")) return;
    console.log("[DC9000 trainer] injecting panel");

    layout.style.flexWrap = "wrap";
    addBanner(layout);
    try { if (typeof window.showToast === "function") window.showToast("\uD83D\uDEE0 Trainer active", "v2.0.0 \u2014 panel added below the arena"); } catch (_) {}

    const panel = document.createElement("div");
    panel.id = "ldr-panel";
    panel.innerHTML = `
      <style>
        #ldr-panel{flex:0 0 100%;width:100%;box-sizing:border-box;font-family:Georgia,serif;
          background:linear-gradient(to bottom,#1d2230,#121520);border:2px solid #8b6b2d;border-radius:14px;
          box-shadow:inset 0 0 18px rgba(0,0,0,.6),0 0 18px rgba(0,0,0,.35);color:#e0e0e0;overflow:hidden}
        #ldr-head{display:flex;align-items:center;gap:.5rem;cursor:pointer;user-select:none;
          padding:.65rem .95rem;background:linear-gradient(to bottom,#2a2f3d,#171b24);border-bottom:1px solid #5d4720}
        #ldr-head .t{font-size:.8rem;letter-spacing:2px;text-transform:uppercase;color:#c9a84c}
        #ldr-head .k{margin-left:auto;font-size:.78rem;color:#9090ff;font-variant-numeric:tabular-nums}
        #ldr-head .chev{transition:transform .15s;color:#9f8d62}
        #ldr-panel.closed #ldr-head .chev{transform:rotate(-90deg)}
        #ldr-body{padding:.85rem .95rem 1rem;display:flex;flex-direction:column;gap:.7rem}
        #ldr-panel.closed #ldr-body{display:none}
        .ldr-row{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
        .ldr-lbl{font-size:.82rem;color:#b0a080;min-width:8.5rem}
        .ldr-btn{padding:.4rem .8rem;border-radius:6px;cursor:pointer;font-family:Georgia,serif;font-size:.78rem;
          letter-spacing:.5px;background:#111128;color:#d0d0d0;border:1px solid #2a2a52;transition:none}
        .ldr-btn:hover{border-color:#c9a84c}
        .ldr-btn.on{background:linear-gradient(135deg,#2d1060,#4d20a0);color:#cc99ff;border-color:#7040a0}
        .ldr-btn.gold{background:linear-gradient(135deg,#c9a84c,#9a7530);color:#0f0f1a;border-color:#5f4515;font-weight:bold}
        #ldr-rate{accent-color:#c9a84c;flex:1;min-width:90px}
        #ldr-panel input[type=number]{background:#111128;color:#e0e0e0;border:1px solid #2a2a52;
          border-radius:6px;padding:.3rem .4rem;font:inherit;width:62px;text-align:center}
        .ldr-prog{height:7px;background:#111;border:1px solid #6f5524;border-radius:4px;overflow:hidden;flex:1;min-width:120px}
        .ldr-prog>i{display:block;height:100%;background:linear-gradient(90deg,#5b2d91,#9c6bff);width:0%}
        .ldr-note{font-size:.68rem;color:#556;line-height:1.4}
      </style>
      <div id="ldr-head">
        <span class="chev">&#9662;</span>
        <span class="t">&#128295; Trainer</span>
        <span class="k">&#9876; <b id="ldr-kills">0</b> kills</span>
      </div>
      <div id="ldr-body">
        <div class="ldr-row">
          <span class="ldr-lbl">10,000 kill goal</span>
          <span class="ldr-prog"><i id="ldr-prog"></i></span>
          <span id="ldr-prog-txt" class="ldr-note"></span>
        </div>
        <div class="ldr-row">
          <span class="ldr-lbl">Animations</span>
          <button class="ldr-btn" id="ldr-anim">Disable</button>
        </div>
        <div class="ldr-row">
          <span class="ldr-lbl">Auto-attack (1-shot)</span>
          <button class="ldr-btn" id="ldr-auto">Start</button>
          <input type="range" id="ldr-rate" min="1" max="20" value="${get(K.rate, "12")}">
          <span class="ldr-note" id="ldr-rate-txt">${get(K.rate, "12")}/s</span>
        </div>
        <div class="ldr-row">
          <span class="ldr-lbl">Auto-prestige &#8805; floor</span>
          <input type="number" id="ldr-apf" min="20" step="1" value="${get(K.apf, "90")}">
          <button class="ldr-btn" id="ldr-ap">Off</button>
        </div>
        <div class="ldr-row">
          <span class="ldr-lbl">Auto-buy</span>
          <button class="ldr-btn" id="ldr-ab">Off</button>
          <span class="ldr-note">Weapons + best cost/DPS units (archmage-first, lower units as they inflate).</span>
        </div>
        <div class="ldr-row">
          <span class="ldr-lbl">Respawn delay (ms)</span>
          <input type="number" id="ldr-respawn" min="0" step="10" value="${respawnMs}">
          <span class="ldr-note">Stock 310. Lower = faster kills.</span>
        </div>
        <div class="ldr-row">
          <span class="ldr-lbl">Values</span>
          <button class="ldr-btn" id="ldr-edit">&#9881; Edit values&hellip;</button>
        </div>
        <div class="ldr-row">
          <span class="ldr-lbl">Save game</span>
          <button class="ldr-btn gold" id="ldr-save">&#128190; Save</button>
          <button class="ldr-btn" id="ldr-export">&#11015; Download</button>
          <button class="ldr-btn" id="ldr-import">&#11014; Upload</button>
          <input type="file" id="ldr-file" accept="application/json,.json" style="display:none">
        </div>
        <div class="ldr-note">Auto-attack one-shots regardless of floor (kill rate set by respawn delay). To finish an achievement instantly, use Edit values (e.g. set Total kills to 10000).</div>
      </div>`;

    layout.insertBefore(panel, rightPanel);
    wire(panel);
  }

  // ── Value editor modal ──
  function openEditor() {
    if (document.getElementById("ldr-modal")) return;
    try { if (typeof window.saveGame === "function") window.saveGame(); } catch (_) {}
    const fields = [
      ["gold", "Gold"], ["clickDamage", "Click damage"], ["floor", "Floor"],
      ["totalKills", "Total kills"], ["shardBalance", "Soul shards"], ["prestigeCount", "Prestige count"],
    ];
    const cur = (k) => { const v = localStorage.getItem(k); return v === null ? "0" : v; };
    const m = document.createElement("div");
    m.id = "ldr-modal";
    m.innerHTML = `
      <style>
        #ldr-modal{position:fixed;inset:0;z-index:4000;display:flex;align-items:center;justify-content:center;
          background:rgba(0,0,0,.78);font-family:Georgia,serif}
        #ldr-modal .card{background:linear-gradient(to bottom,#1d2230,#121520);border:2px solid #8b6b2d;
          border-radius:14px;padding:1.1rem 1.2rem;width:min(92vw,360px);box-shadow:0 0 40px rgba(0,0,0,.6);color:#e0e0e0}
        #ldr-modal h3{margin:0 0 .9rem;color:#c9a84c;font-size:1rem;letter-spacing:1px;text-align:center}
        #ldr-modal .fld{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-bottom:.55rem}
        #ldr-modal .fld label{font-size:.82rem;color:#b0a080}
        #ldr-modal .fld input{width:150px;background:#111128;color:#e0e0e0;border:1px solid #2a2a52;
          border-radius:6px;padding:.4rem .5rem;font:inherit;text-align:right}
        #ldr-modal .acts{display:flex;gap:.6rem;margin-top:1rem}
        #ldr-modal .acts button{flex:1;padding:.55rem;border-radius:7px;font-family:Georgia,serif;font-size:.85rem;
          cursor:pointer;border:1px solid}
        #ldr-modal .save{background:linear-gradient(135deg,#c9a84c,#9a7530);color:#0f0f1a;border-color:#5f4515;font-weight:bold}
        #ldr-modal .cancel{background:#111128;color:#d0d0d0;border-color:#2a2a52}
      </style>
      <div class="card">
        <h3>&#9881; Value Editor</h3>
        ${fields.map(([k, l]) => `<div class="fld"><label>${l}</label><input type="number" step="1" data-k="${k}" value="${cur(k)}"></div>`).join("")}
        <div class="acts"><button class="cancel">Cancel</button><button class="save">Save</button></div>
      </div>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    m.querySelector(".cancel").onclick = close;
    m.addEventListener("click", (e) => { if (e.target === m) close(); });
    m.querySelector(".save").onclick = () => {
      m.querySelectorAll("input[data-k]").forEach((inp) => {
        const v = inp.value.trim();
        if (v !== "" && !isNaN(Number(v))) localStorage.setItem(inp.dataset.k, String(Number(v)));
      });
      localStorage.removeItem("monsterHP");           // let the new floor spawn at full HP
      localStorage.setItem("lastSeen", String(Date.now())); // avoid bogus offline earnings
      close();
      location.reload();
    };
  }

  // ── Auto-buy logic ──
  // Buys the affordable unit with the lowest cost-per-DPS (best value). Because cost
  // grows x1.15 per purchase PER TYPE, the cheapest-per-DPS unit rotates over time, so
  // archmages dominate first, then lower units fill in as their value catches up.
  // "Saving" rule: never buy a unit whose cost/DPS is worse than (best available) x1.15
  // (one cost-step). If only such units are affordable, hold gold for the better one.
  function autoBuyTick() {
    try {
      // Weapons are one-time click-damage unlocks — grab any affordable ones.
      if (typeof window.buyUpgrade === "function") {
        WEAPON_IDS.forEach((id) => { try { window.buyUpgrade(id); } catch (_) {} });
      }
      if (typeof window.buyUnit !== "function" || typeof window.getUnitCost !== "function") return;

      const ids = Object.keys(UNIT_DPS);
      let guard = 0;
      while (guard++ < 250) {
        const cpd = {};
        ids.forEach((id) => { cpd[id] = window.getUnitCost(id) / UNIT_DPS[id]; });
        const order = ids.slice().sort((a, b) => cpd[a] - cpd[b]); // best value first
        const bestCpd = cpd[order[0]];
        let bought = false;
        for (const id of order) {
          if (cpd[id] > bestCpd * COST_GROWTH) break; // worse than one step from optimal → save instead
          const before = window.getUnitCost(id);
          window.buyUnit(id);                          // self-gates on gold
          if (window.getUnitCost(id) !== before) { bought = true; break; } // success → re-evaluate
        }
        if (!bought) break; // nothing within the value threshold is affordable → hold gold
      }
    } catch (_) {}
  }

  function wire(panel) {
    const $ = (s) => panel.querySelector(s);

    // Collapse/expand
    const setOpen = (open) => { panel.classList.toggle("closed", !open); setb(K.open, open); };
    setOpen(isOn(K.open, true));
    $("#ldr-head").addEventListener("click", () => setOpen(panel.classList.contains("closed")));

    // Animations + flash suppression
    const applyAnim = (off) => {
      if (off && !animStyle) {
        animStyle = document.createElement("style");
        animStyle.textContent =
          "*,*::before,*::after{animation:none!important;-webkit-animation:none!important;" +
          "transition:none!important;animation-duration:0s!important;transition-duration:0s!important}" +
          ".boss-flash-overlay,.ascend-flash-overlay{display:none!important;opacity:0!important}";
        document.head.appendChild(animStyle);
      } else if (!off && animStyle) { animStyle.remove(); animStyle = null; }
      const b = $("#ldr-anim");
      b.classList.toggle("on", off); b.textContent = off ? "Disabled" : "Disable";
      setb(K.noanim, off);
    };
    $("#ldr-anim").addEventListener("click", () => applyAnim(!isOn(K.noanim)));
    applyAnim(isOn(K.noanim));

    // Auto-attack (one-shot)
    const tick = () => { try { if (typeof window.dealDamage === "function") window.dealDamage(1e12); } catch (_) {} };
    const startAuto = (on) => {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
      const rate = Math.max(1, parseInt(get(K.rate, "12"), 10) || 12);
      if (on) autoTimer = setInterval(tick, 1000 / rate);
      const b = $("#ldr-auto");
      b.classList.toggle("on", on); b.textContent = on ? "Stop" : "Start";
      setb(K.auto, on);
    };
    $("#ldr-auto").addEventListener("click", () => startAuto(!autoTimer));
    const rate = $("#ldr-rate");
    rate.addEventListener("input", () => {
      localStorage.setItem(K.rate, rate.value);
      $("#ldr-rate-txt").textContent = rate.value + "/s";
      if (autoTimer) startAuto(true);
    });
    if (isOn(K.auto)) startAuto(true);

    // Auto-prestige
    let apOn = isOn(K.ap, false);
    let apFloor = Math.max(20, parseInt(get(K.apf, "90"), 10) || 90);
    let apCooldown = 0;
    const curFloor = () => { const m = (document.getElementById("floor-label")?.textContent || "").match(/\d+/); return m ? parseInt(m[0], 10) : 0; };
    const apBtn = $("#ldr-ap"), apIn = $("#ldr-apf");
    const setAp = (on) => { apOn = on; setb(K.ap, on); apBtn.classList.toggle("on", on); apBtn.textContent = on ? "On" : "Off"; };
    apBtn.addEventListener("click", () => setAp(!apOn));
    apIn.addEventListener("change", () => { const v = Math.max(20, parseInt(apIn.value, 10) || 90); apIn.value = v; apFloor = v; localStorage.setItem(K.apf, String(v)); });
    setAp(apOn);
    setInterval(() => {
      if (!apOn || Date.now() < apCooldown) return;
      if (curFloor() >= apFloor && typeof window.doAscend === "function") {
        try { window.doAscend(); apCooldown = Date.now() + 1500; } catch (_) {}
      }
    }, 1000);

    // Auto-buy
    let abOn = isOn(K.ab, false);
    let abTimer = null;
    const abBtn = $("#ldr-ab");
    const setAb = (on) => {
      abOn = on; setb(K.ab, on);
      abBtn.classList.toggle("on", on); abBtn.textContent = on ? "On" : "Off";
      if (abTimer) { clearInterval(abTimer); abTimer = null; }
      if (on) abTimer = setInterval(autoBuyTick, 1200);
    };
    abBtn.addEventListener("click", () => setAb(!abOn));
    setAb(abOn);

    // Respawn delay
    const rsIn = $("#ldr-respawn");
    rsIn.addEventListener("change", () => {
      const v = Math.max(0, parseInt(rsIn.value, 10) || 0);
      rsIn.value = v; respawnMs = v; localStorage.setItem(K.respawn, String(v));
    });

    // Value editor
    $("#ldr-edit").addEventListener("click", openEditor);

    // Manual save
    $("#ldr-save").addEventListener("click", () => {
      try {
        if (typeof window.saveGame !== "function") { notify("Save unavailable", "Game not fully loaded yet."); return; }
        window.saveGame();
        if (typeof window.flashSaveIndicator === "function") window.flashSaveIndicator();
        notify("\uD83D\uDCBE Saved", "Game state written to local storage.");
      } catch (e) { notify("Save failed", String((e && e.message) || e)); }
    });

    // Export
    $("#ldr-export").addEventListener("click", () => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); data[k] = localStorage.getItem(k); }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dungeon-save-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    });

    // Import
    $("#ldr-import").addEventListener("click", () => $("#ldr-file").click());
    $("#ldr-file").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const data = JSON.parse(r.result);
          if (typeof data !== "object" || !data) throw new Error("not a save object");
          Object.keys(data).forEach((k) => localStorage.setItem(k, data[k]));
          location.reload();
        } catch (err) { alert("Invalid save file: " + err.message); }
      };
      r.readAsText(file);
    })