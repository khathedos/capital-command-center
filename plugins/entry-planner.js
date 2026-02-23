/* plugins/entry-planner.js
   CCC Entry Planner (10 Sekunden) – Guided + Capital Sizing + Risk Score + Dual Plans
   - Outputs SAFE plan + HIGH RISK plan
   - Risk score 0–100 with explanation
*/

(function () {
  const PLUGIN_ID = "ccc-entry-planner";
  const STATE_KEY = "ccc_entry_planner_state_v2";

  // ---------- helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const num = (x) => {
    const n = Number(String(x ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };
  const fmt = (n, d = 2) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return "—";
    return v.toFixed(d);
  };
  const fmtUSD = (n) => "$" + fmt(n, 2);

  function getActiveAccount() {
    try {
      if (window.CCC && typeof window.CCC.getActiveAccount === "function") {
        return window.CCC.getActiveAccount();
      }
      const sel = document.getElementById("accountSelect");
      if (sel && sel.value) return sel.value;
    } catch {}
    return "aggro";
  }

  function getCurrentCapitalFromUI() {
    try {
      if (window.CCC && typeof window.CCC.getActiveCapital === "function") {
        return num(window.CCC.getActiveCapital());
      }
    } catch {}
    const el = document.getElementById("capitalBig");
    if (el) return num(String(el.textContent || "").replace("$", ""));
    const inp = document.getElementById("capitalInput");
    if (inp) return num(inp.value);
    return 0;
  }

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STATE_KEY) || "{}"); }
    catch { return {}; }
  }
  function saveState(s) {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(s || {})); } catch {}
  }

  function findExtrasAnchor() {
    const h2s = $$("h2");
    const extrasH2 = h2s.find(h => (h.textContent || "").trim().toLowerCase() === "extras");
    if (!extrasH2) return null;
    const after = extrasH2.nextElementSibling || extrasH2;
    return after;
  }

  function ensureInjected() {
    if (document.getElementById(PLUGIN_ID)) return true;
    const anchor = findExtrasAnchor();
    if (!anchor) return false;

    const wrap = document.createElement("div");
    wrap.id = PLUGIN_ID;
    wrap.className = "card";
    wrap.style.marginTop = "14px";

    wrap.innerHTML = `
      <h2>Entry Planner (10 Sekunden)</h2>
      <div class="note" style="margin-top:-6px">
        <b>Du gibst nur 2 Chart-Werte ein:</b><br/>
        1) <b>Pullback-Level</b> (wo der Preis zurückläuft / Support/Resistance / MA-Zone)<br/>
        2) <b>Trigger-Level</b> (Break über/unter Struktur – dein “Go”-Punkt)<br/>
        Danach bekommst du <b>SAFE</b> + <b>HIGH RISK</b> Plan inkl. <b>Risiko-Score 0–100</b>.
      </div>

      <div class="hr"></div>

      <div class="row">
        <div style="flex:1;min-width:210px">
          <label>Coin / Pair</label>
          <input id="epPair" type="text" placeholder="z.B. ETH / DOGE" />
        </div>

        <div style="flex:1;min-width:260px">
          <label>Trend (5m) – schnelle Wahl</label>
          <select id="epTrend">
            <option value="up">Uptrend (Long bevorzugt)</option>
            <option value="down">Downtrend (Short bevorzugt)</option>
            <option value="range">Range / Chop (vorsichtig)</option>
          </select>
        </div>

        <div style="flex:1;min-width:260px">
          <label>Setup-Typ (was siehst du?)</label>
          <select id="epSetup">
            <option value="pullback">Pullback → Continuation</option>
            <option value="breakout">Breakout → Go</option>
            <option value="reversal">Reversal (riskanter)</option>
          </select>
        </div>
      </div>

      <div class="hr"></div>

      <div class="row">
        <div style="flex:1;min-width:220px">
          <label>Pullback-Level (Preis)</label>
          <input id="epPullback" type="number" step="0.000001" placeholder="z.B. 1944" />
          <div class="tiny">Wo der Preis “zurücksetzt” (MA/Support/Resistance Zone).</div>
        </div>

        <div style="flex:1;min-width:220px">
          <label>Trigger-Level (Preis)</label>
          <input id="epTrigger" type="number" step="0.000001" placeholder="z.B. 1953" />
          <div class="tiny">Der Punkt, wo du sagst: “jetzt rein” (Break).</div>
        </div>

        <div style="flex:1;min-width:240px">
          <label>Entry-Style</label>
          <select id="epEntryStyle">
            <option value="trigger">Entry = Trigger (Standard)</option>
            <option value="pullback">Entry = Pullback (Limit-Entry)</option>
            <option value="mid">Entry = Mitte (Pullback↔Trigger)</option>
          </select>
          <div class="tiny">Wenn du unsicher bist: <b>Trigger</b> nehmen.</div>
        </div>
      </div>

      <div class="hr"></div>

      <div class="row">
        <div style="flex:1;min-width:220px">
          <label>Gesamtkapital (Account) – optional</label>
          <input id="epTotalCap" type="number" step="0.01" placeholder="Auto aus App (oder manuell)" />
          <div class="tiny">Wenn leer: nimmt den aktuellen Stand aus CCC.</div>
        </div>

        <div style="flex:1;min-width:220px">
          <label>Trade-Kapital (Margin/Investment)</label>
          <input id="epTradeCap" type="number" step="0.01" placeholder="z.B. 30 oder 50" />
          <div class="tiny">Das ist der Betrag, den du im Bot/Trade als Investment angibst.</div>
        </div>

        <div style="flex:1;min-width:220px">
          <label>Account-Modus (Preset)</label>
          <select id="epMode">
            <option value="auto">Auto (nach CCC Account)</option>
            <option value="aggro">Aggro</option>
            <option value="safe">Safe-Build</option>
          </select>
          <div class="tiny">Auto = Aggro/Safe aus der Auswahl oben.</div>
        </div>

        <div style="min-width:180px">
          <button id="epCalcBtn">Plan berechnen</button>
          <div class="tiny" style="margin-top:6px">Ergebnis: SAFE + HIGH RISK + Risiko-Score.</div>
        </div>
      </div>

      <div class="hr"></div>

      <div id="epRiskBox" class="alert show" style="display:none"></div>

      <div class="two" style="margin-top:12px">
        <div id="epSafeOut" class="kpi" style="padding:14px; display:none"></div>
        <div id="epRiskyOut" class="kpi" style="padding:14px; display:none"></div>
      </div>

      <div class="hr"></div>

      <div class="note">
        <b>Grafisch (10 Sekunden Check):</b><br/>
        1) Trend: Higher Highs/Higher Lows = Up | Lower Highs/Lower Lows = Down<br/>
        2) Pullback: Preis läuft zurück an MA/Zone/Struktur<br/>
        3) Trigger: Bricht wieder in Trendrichtung (Break über/unter Mini-Struktur)<br/>
        4) SL: <b>hinter</b> Pullback/letztem Swing (nicht mitten drin)<br/>
        5) TP: nächster Widerstand/Support + “R” Ziel (SAFE kleiner, Risky größer)
      </div>
    `;

    anchor.insertAdjacentElement("afterend", wrap);
    return true;
  }

  // ---------- risk scoring ----------
  function riskScore({ trend, setup, leverage, slPct, tpPct, entryMode, distPct, accountMode }) {
    // Start baseline
    let score = 35;

    // Trend
    if (trend === "range") score += 18;
    if (trend === "down") score += 6; // generally more volatile / squeezes (heuristic)

    // Setup
    if (setup === "breakout") score += 10;
    if (setup === "reversal") score += 22;

    // Leverage
    score += clamp((leverage - 5) * 4, 0, 35); // above 5x quickly increases risk

    // SL tightness vs leverage (too tight with high lev = stop-out risk)
    // slPct is account SL; effective move needed = slPct/leverage
    const effMove = leverage > 0 ? slPct / leverage : slPct;
    if (effMove < 0.9) score += 12;     // very small wiggle room
    else if (effMove < 1.3) score += 7;

    // TP aggressive
    if (tpPct >= 18) score += 6;
    if (tpPct >= 25) score += 10;

    // Entry method
    if (entryMode === "trigger") score += 4; // breakout/trigger entries are more failure-prone than limit
    if (entryMode === "mid") score += 2;

    // Distance between pullback and trigger: large distance often means late entry or choppy
    // distPct is |trigger-pullback|/pullback*100
    if (distPct > 0.9) score += 8;
    if (distPct > 1.6) score += 12;

    // Account mode: Safe reduces risk appetite baseline, Aggro increases
    if (accountMode === "safe") score -= 10;
    if (accountMode === "aggro") score += 6;

    return clamp(Math.round(score), 0, 100);
  }

  function scoreLabel(score) {
    if (score <= 25) return { txt: "Sehr ruhig", cls: "good" };
    if (score <= 45) return { txt: "Okay / normal", cls: "good" };
    if (score <= 65) return { txt: "Vorsicht", cls: "warn" };
    if (score <= 80) return { txt: "Hoch", cls: "warn" };
    return { txt: "Extrem", cls: "bad" };
  }

  // ---------- plan calculation ----------
  function calcPlan({ dir, entry, pullback, trigger, mode, tradeCap, planType }) {
    // planType: "safe" or "risky"
    const base = (mode === "safe")
      ? { levMax: 5, sl: 4, tp: 10, riskPct: 1.0 }
      : { levMax: 10, sl: 7, tp: 20, riskPct: 2.0 };

    // Adjust for SAFE vs HIGH RISK
    let lev = planType === "safe" ? Math.min(base.levMax, 5) : Math.min(base.levMax, 10);
    let slPct = planType === "safe" ? (mode === "safe" ? 3.5 : 6.0) : (mode === "safe" ? 5.0 : 8.0);
    let tpPct = planType === "safe" ? (mode === "safe" ? 9.0 : 15.0) : (mode === "safe" ? 12.0 : 22.0);

    // Direction-aware SL/TP price computation
    const slPrice = dir === "long"
      ? entry * (1 - slPct / 100)
      : entry * (1 + slPct / 100);

    const tpPrice = dir === "long"
      ? entry * (1 + tpPct / 100)
      : entry * (1 - tpPct / 100);

    // Sizing suggestion (very simplified):
    // Risk in USD = tradeCap * riskPct%
    // Approx loss at SL (as % of margin) ~ slPct%
    // So position sizing doesn't matter here; we output "Risk Budget" and "Max Loss on margin"
    const riskUSD = tradeCap * (base.riskPct / 100) * (planType === "safe" ? 0.8 : 1.2);
    const estLossAtSL = tradeCap * (slPct / 100); // margin loss approx (ignores fees/funding)

    // Effective price move before stop (approx) = slPct / lev
    const wigglePct = lev > 0 ? (slPct / lev) : slPct;

    return {
      lev,
      slPct,
      tpPct,
      slPrice,
      tpPrice,
      riskUSD,
      estLossAtSL,
      wigglePct
    };
  }

  function directionFromTrend(trend) {
    if (trend === "up") return "long";
    if (trend === "down") return "short";
    // range: default to "wait" but we still output both; choose smaller targets
    return "long";
  }

  function renderPlanBox({ title, cls, pair, dir, entry, pullback, trigger, tradeCap, plan, score }) {
    const dirTxt = dir === "long" ? "LONG" : "SHORT";
    const s = scoreLabel(score);

    const orderBox = `
Pair: ${esc(pair || "—")}
Direction: ${dirTxt}
Investment/Margin: ${fmt(tradeCap, 2)}
Leverage: ${plan.lev}x
Entry: ${fmt(entry, 6)}
Stop-Loss (${fmt(plan.slPct, 1)}%): ${fmt(plan.slPrice, 6)}
Take-Profit (${fmt(plan.tpPct, 1)}%): ${fmt(plan.tpPrice, 6)}
Risk Budget (≈): ${fmtUSD(plan.riskUSD)}
Est. Loss @ SL (≈): ${fmtUSD(plan.estLossAtSL)}
`;

    const hint =
      `Wiggle-Room: bei ${plan.lev}x & SL ${fmt(plan.slPct,1)}% ≈ <b>${fmt(plan.wigglePct,2)}%</b> Kursbewegung gegen dich.`;

    return `
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
        <div>
          <div style="font-weight:950;font-size:14px">${esc(title)} <span class="tag ${esc(cls)}">${dirTxt}</span></div>
          <div class="tiny" style="margin-top:6px;color:#93a4b8">
            Pullback: ${fmt(pullback, 6)} · Trigger: ${fmt(trigger, 6)} · Entry: ${fmt(entry, 6)}
          </div>
        </div>
        <div style="text-align:right">
          <div class="tiny">Risiko-Score</div>
          <div style="font-weight:950;font-size:18px">${score}%</div>
          <div class="tiny"><span class="tag ${s.cls}">${s.txt}</span></div>
        </div>
      </div>

      <div class="hr"></div>

      <div class="tiny">${hint}</div>

      <div class="hr"></div>

      <div class="tiny" style="margin-bottom:6px"><b>Order-Box (Copy)</b></div>
      <textarea readonly style="width:100%;min-height:160px;resize:vertical">${orderBox}</textarea>
    `;
  }

  // ---------- main ----------
  function wire() {
    if (!ensureInjected()) return;

    const st = loadState();
    const acc = getActiveAccount();
    const activeCap = getCurrentCapitalFromUI();

    const defaultsPair = st.pair || "ETH";
    $("#epPair").value = defaultsPair;
    $("#epTrend").value = st.trend || "up";
    $("#epSetup").value = st.setup || "pullback";
    $("#epEntryStyle").value = st.entryStyle || "trigger";
    $("#epPullback").value = st.pullback ?? "";
    $("#epTrigger").value = st.trigger ?? "";
    $("#epTradeCap").value = st.tradeCap ?? "";
    $("#epTotalCap").value = st.totalCap ?? (activeCap ? fmt(activeCap, 2) : "");
    $("#epMode").value = st.mode || "auto";

    function resolveMode() {
      const m = $("#epMode").value;
      if (m === "aggro" || m === "safe") return m;
      // auto
      const a = String(acc).toLowerCase();
      return a.includes("safe") ? "safe" : "aggro";
    }

    function computeEntry(pullback, trigger, entryStyle) {
      if (!pullback || !trigger) return 0;
      if (entryStyle === "pullback") return pullback;
      if (entryStyle === "mid") return (pullback + trigger) / 2;
      return trigger; // trigger default
    }

    function update() {
      const pair = $("#epPair").value.trim();
      const trend = $("#epTrend").value;
      const setup = $("#epSetup").value;
      const entryStyle = $("#epEntryStyle").value;

      const pullback = num($("#epPullback").value);
      const trigger = num($("#epTrigger").value);
      const entry = computeEntry(pullback, trigger, entryStyle);

      const totalCap = num($("#epTotalCap").value) || activeCap || 0;
      const tradeCap = num($("#epTradeCap").value);
      const mode = resolveMode();

      // Persist state
      saveState({ pair, trend, setup, entryStyle, pullback, trigger, tradeCap, totalCap, mode: $("#epMode").value });

      // Validation
      const riskBox = $("#epRiskBox");
      riskBox.style.display = "none";
      riskBox.className = "alert show";
      riskBox.innerHTML = "";

      if (!pair || !pullback || !trigger || !entry || !tradeCap) {
        $("#epSafeOut").style.display = "none";
        $("#epRiskyOut").style.display = "none";
        riskBox.style.display = "block";
        riskBox.className = "alert show warn";
        riskBox.innerHTML = `<b>✍️ Eingaben fehlen</b><br/>Bitte <b>Pair</b>, <b>Pullback</b>, <b>Trigger</b> und <b>Trade-Kapital</b> eintragen.`;
        return;
      }

      // Determine direction
      const dir = directionFromTrend(trend);

      // Distance metric (for risk)
      const distPct = pullback > 0 ? (Math.abs(trigger - pullback) / pullback) * 100 : 0;

      // Create SAFE and RISKY plans
      const safePlan = calcPlan({ dir, entry, pullback, trigger, mode, tradeCap, planType: "safe" });
      const riskyPlan = calcPlan({ dir, entry, pullback, trigger, mode, tradeCap, planType: "risky" });

      // Score each plan separately
      const safeScore = riskScore({
        trend, setup,
        leverage: safePlan.lev,
        slPct: safePlan.slPct,
        tpPct: safePlan.tpPct,
        entryMode: entryStyle,
        distPct,
        accountMode: mode
      });

      const riskyScore = riskScore({
        trend, setup,
        leverage: riskyPlan.lev,
        slPct: riskyPlan.slPct,
        tpPct: riskyPlan.tpPct,
        entryMode: entryStyle,
        distPct,
        accountMode: mode
      });

      // risk box overview
      const s1 = scoreLabel(safeScore);
      const s2 = scoreLabel(riskyScore);

      const modeTxt = mode === "safe" ? "Safe-Build" : "Aggro";
      const trendTxt = trend === "up" ? "Uptrend" : trend === "down" ? "Downtrend" : "Range";
      const setupTxt = setup === "pullback" ? "Pullback" : setup === "breakout" ? "Breakout" : "Reversal";

      riskBox.style.display = "block";
      riskBox.className = "alert show";
      const worst = Math.max(safeScore, riskyScore);
      riskBox.classList.add(worst >= 80 ? "bad" : worst >= 55 ? "warn" : "good");

      riskBox.innerHTML = `
        <b>🧭 Einschätzung</b><br/>
        Account: <b>${esc(modeTxt)}</b> · Trend: <b>${esc(trendTxt)}</b> · Setup: <b>${esc(setupTxt)}</b><br/>
        Distanz Pullback↔Trigger: <b>${fmt(distPct,2)}%</b><br/>
        <div style="margin-top:8px">
          SAFE Score: <span class="tag ${s1.cls}">${safeScore}% · ${esc(s1.txt)}</span>
          HIGH RISK Score: <span class="tag ${s2.cls}">${riskyScore}% · ${esc(s2.txt)}</span>
        </div>
        <div class="tiny" style="margin-top:8px">
          <b>Lesen:</b> Score steigt bei Range/Reversal, hohem Hebel, zu engem SL (bei hohem Hebel) und großem Pullback↔Trigger Abstand.
        </div>
      `;

      // Output boxes
      const safeOut = $("#epSafeOut");
      const riskyOut = $("#epRiskyOut");

      safeOut.style.display = "block";
      riskyOut.style.display = "block";

      safeOut.innerHTML = renderPlanBox({
        title: "✅ SAFE Trade",
        cls: "good",
        pair,
        dir,
        entry,
        pullback,
        trigger,
        tradeCap,
        plan: safePlan,
        score: safeScore
      });

      riskyOut.innerHTML = renderPlanBox({
        title: "⚡ HIGH RISK / HIGH REWARD",
        cls: "warn",
        pair,
        dir,
        entry,
        pullback,
        trigger,
        tradeCap,
        plan: riskyPlan,
        score: riskyScore
      });
    }

    $("#epCalcBtn").addEventListener("click", update);

    // Auto update if user edits quickly (debounced)
    let t = null;
    ["epPair","epTrend","epSetup","epEntryStyle","epPullback","epTrigger","epTotalCap","epTradeCap","epMode"].forEach(id=>{
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(update, 250);
      });
      el.addEventListener("change", () => {
        clearTimeout(t);
        t = setTimeout(update, 50);
      });
    });

    // Initial render (if enough data)
    update();
  }

  function boot() {
    // wait until DOM & CCC have rendered
    const tryInit = () => {
      if (ensureInjected()) {
        wire();
        return true;
      }
      return false;
    };

    if (!tryInit()) {
      let tries = 0;
      const iv = setInterval(() => {
        tries++;
        if (tryInit() || tries > 30) clearInterval(iv);
      }, 250);
    }

    // Re-render on account change if your app dispatches this
    window.addEventListener("ccc:account", () => {
      // just re-wire safely
      setTimeout(() => {
        try { wire(); } catch {}
      }, 50);
    });
  }

  boot();
})();
