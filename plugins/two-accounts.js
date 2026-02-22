// plugins/two-accounts.js  (v3)
// Aggro + Safe-Build + Gesamt(read-only) + Stage pro Account + Strategie-Karten
(() => {
  const STORE_KEY = "ccc_active_account_v1";

  const ACCOUNTS = [
    { id: "aggro", name: "Aggro", hint: "High risk / high reward" },
    { id: "safe",  name: "Safe-Build", hint: "Stabil aufbauen" },
    { id: "all",   name: "Gesamt", hint: "Summe + Mission (read-only)" }
  ];

  // Core entries key used by your main app
  const BASE_KEY = "ccc_entries_v3";
  const KEY_AGGRO = BASE_KEY + "__aggro";
  const KEY_SAFE  = BASE_KEY + "__safe";

  // For compatibility if you earlier used "__build"
  const KEY_BUILD_LEGACY = BASE_KEY + "__build";

  const origGetItem = localStorage.getItem.bind(localStorage);
  const origSetItem = localStorage.setItem.bind(localStorage);
  const origRemoveItem = localStorage.removeItem.bind(localStorage);

  const $ = (sel) => document.querySelector(sel);

  function safeParse(s, fallback){ try { return JSON.parse(s); } catch { return fallback; } }
  function getArr(k){ return safeParse(origGetItem(k) || "[]", []); }
  function setArr(k, arr){ origSetItem(k, JSON.stringify(arr)); }
  function last(arr){ return arr.length ? arr[arr.length-1] : null; }

  function getActive(){ return localStorage.getItem(STORE_KEY) || "aggro"; }
  function setActive(id){ localStorage.setItem(STORE_KEY, id); applyMode(id); }

  function keyFor(mode){
    if (mode === "aggro") return KEY_AGGRO;
    if (mode === "safe")  return KEY_SAFE;
    return BASE_KEY;
  }

  // ---- Stage models (separat)
  // Aggro: dein vorhandener Seed-Plan (39 -> 60 usw.)
  const STAGES_AGGRO = [
    { name: "A0 Seed",   min: 0,    next: 60,   killBelow: 25,  riskLabel: "Seed / Controlled Explosion" },
    { name: "A1 Base",   min: 60,   next: 100,  killBelow: 52,  riskLabel: "Base / Aufbau" },
    { name: "A2 Grow",   min: 100,  next: 150,  killBelow: 85,  riskLabel: "Grow" },
    { name: "A3 Scale",  min: 150,  next: 300,  killBelow: 125, riskLabel: "Scale" },
    { name: "A4 Push",   min: 300,  next: 1000, killBelow: 250, riskLabel: "Push" },
    { name: "A5 Beyond", min: 1000, next: 50000, killBelow: 900, riskLabel: "Beyond" }
  ];

  // Safe-Build: konservativer Plan ab 100€
  const STAGES_SAFE = [
    { name: "S0 Stabil", min: 0,    next: 150,  killBelow: 80,   riskLabel: "Stabil / Schutz" },
    { name: "S1 Build",  min: 150,  next: 250,  killBelow: 130,  riskLabel: "Build" },
    { name: "S2 Grow",   min: 250,  next: 500,  killBelow: 220,  riskLabel: "Grow" },
    { name: "S3 Scale",  min: 500,  next: 1000, killBelow: 450,  riskLabel: "Scale" },
    { name: "S4 Expand", min: 1000, next: 5000, killBelow: 900,  riskLabel: "Expand" },
    { name: "S5 Mission",min: 5000, next: 50000,killBelow: 4500, riskLabel: "Mission" }
  ];

  function stageFor(mode, cap){
    const list = (mode === "safe") ? STAGES_SAFE : STAGES_AGGRO;
    // Find last stage whose min <= cap
    let s = list[0];
    for (const st of list) if (cap >= st.min) s = st;
    return s;
  }

  // ---- find UI controls robustly
  function findCapitalInput(){
    return document.getElementById("capitalInput")
      || $('input[placeholder*="Kapital"], input[placeholder*="USD"], input[type="number"]')
      || null;
  }
  function findDepositInput(){
    // second input in panel often = deposit
    const panel = document.querySelector(".panel") || document.body;
    const inputs = panel.querySelectorAll("input");
    return inputs.length >= 2 ? inputs[1] : null;
  }
  function findNoteInput(){
    const panel = document.querySelector(".panel") || document.body;
    const ta = panel.querySelector("textarea");
    return ta || null;
  }
  function findSaveButton(){
    return document.getElementById("saveBtn")
      || Array.from(document.querySelectorAll("button"))
          .find(b => (b.textContent || "").toLowerCase().includes("eintrag speichern"))
      || null;
  }

  // ---- selector + strategy card mount
  function mountTopUI(){
    if (document.getElementById("ccc-account-switch")) return;

    const sub = document.querySelector("header .sub") || document.querySelector("header");
    if (!sub) return;

    const wrap = document.createElement("div");
    wrap.id = "ccc-account-switch";
    wrap.style.display = "grid";
    wrap.style.gridTemplateColumns = "auto 1fr";
    wrap.style.gap = "10px";
    wrap.style.alignItems = "center";
    wrap.style.marginTop = "10px";

    wrap.innerHTML = `
      <div style="
        display:inline-flex;align-items:center;gap:8px;
        padding:6px 10px;border-radius:999px;
        font-size:12px;font-weight:900;
        border:1px solid rgba(255,255,255,.10);
        background: rgba(17,27,46,.65);
        color:#dbe6ff;">
        Account:
        <select id="cccAccountSelect" style="
          border-radius:999px;border:1px solid rgba(255,255,255,.12);
          background: rgba(13,21,36,.55);
          color:#e5e7eb;
          padding:6px 10px;
          font-weight:900;">
          ${ACCOUNTS.map(a => `<option value="${a.id}">${a.name}</option>`).join("")}
        </select>
      </div>

      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <span id="cccAccountHint" style="font-size:12px;color:#93a4b8;"></span>
        <span id="cccAccountStage" style="
          font-size:12px;font-weight:900;
          padding:6px 10px;border-radius:999px;
          border:1px solid rgba(255,255,255,.10);
          background: rgba(17,27,46,.35);
          color:#dbe6ff;">
          Stage: —
        </span>
      </div>
    `;
    sub.appendChild(wrap);

    const card = document.createElement("div");
    card.id = "ccc-strategy-card";
    card.style.marginTop = "10px";
    card.style.padding = "12px";
    card.style.borderRadius = "16px";
    card.style.border = "1px solid rgba(255,255,255,.08)";
    card.style.background = "rgba(17,27,46,.35)";
    card.innerHTML = `<div style="font-weight:900;margin-bottom:6px">Trading-Setup</div><div id="cccStrategyBody" style="color:#cbd5e1;font-size:13px;line-height:1.35"></div>`;
    sub.appendChild(card);

    const sel = document.getElementById("cccAccountSelect");
    sel.value = getActive();
    sel.addEventListener("change", () => setActive(sel.value));
  }

  function renderStrategy(mode, cap){
    const body = document.getElementById("cccStrategyBody");
    const hint = document.getElementById("cccAccountHint");
    if (hint) hint.textContent = (ACCOUNTS.find(a=>a.id===mode)?.hint) || "";

    const stagePill = document.getElementById("cccAccountStage");
    if (stagePill){
      if (!cap || !isFinite(cap)) stagePill.textContent = "Stage: —";
      else stagePill.textContent = `Stage: ${stageFor(mode === "all" ? "aggro" : mode, cap).name}`;
    }

    if (!body) return;

    if (mode === "aggro") {
      body.innerHTML = `
        <div><b>Aggro-Profil</b> (Template):</div>
        <ul style="margin:8px 0 0 18px;padding:0">
          <li>Max <b>1 Position</b> gleichzeitig</li>
          <li>Hebel <b>≤ 10x</b> (nicht erhöhen)</li>
          <li>Stop-Loss: <b>6–8%</b> | Take-Profit: <b>18–22%</b></li>
          <li>Max <b>2 Verlustzyklen</b>, dann Pause</li>
          <li><b>Kill-Switch</b> je Stage strikt respektieren</li>
        </ul>
        <div style="margin-top:8px;opacity:.9"><b>Ziel:</b> schnelle Sprünge, aber kontrolliert (kein Martingale).</div>
      `;
      return;
    }

    if (mode === "safe") {
      body.innerHTML = `
        <div><b>Safe-Build-Profil</b> (Template):</div>
        <ul style="margin:8px 0 0 18px;padding:0">
          <li>Hebel niedrig: <b>2–5x</b> (oder Spot/Grid ohne Hebel)</li>
          <li>Stop-Loss: <b>2–4%</b> | Take-Profit: <b>4–8%</b></li>
          <li>Keine Nachkäufe/Martingale, keine “Revenge Trades”</li>
          <li>Wenn Verlustserie: <b>24h Pause</b> + Setup review</li>
          <li>Fokus: <b>Kapitalschutz</b> + konstante kleine Gewinne</li>
        </ul>
        <div style="margin-top:8px;opacity:.9"><b>Ziel:</b> stabiler Aufbau – Aggro darf “spielen”, Safe-Build schützt.</div>
      `;
      return;
    }

    // Gesamt
    body.innerHTML = `
      <div><b>Gesamtansicht</b> (read-only):</div>
      <ul style="margin:8px 0 0 18px;padding:0">
        <li>Zeigt Summe für Mission/Progress</li>
        <li>Speichern ist deaktiviert</li>
        <li>Einträge bitte in <b>Aggro</b> oder <b>Safe-Build</b> machen</li>
      </ul>
    `;
  }

  // ---- hook localStorage for BASE_KEY so core writes to per-account entries
  function hookStorage(mode){
    localStorage.getItem = (k) => origGetItem(k === BASE_KEY ? keyFor(mode) : k);
    localStorage.setItem = (k,v) => origSetItem(k === BASE_KEY ? keyFor(mode) : k, v);
    localStorage.removeItem = (k) => origRemoveItem(k === BASE_KEY ? keyFor(mode) : k);
  }
  function unhookStorage(){
    localStorage.getItem = origGetItem;
    localStorage.setItem = origSetItem;
    localStorage.removeItem = origRemoveItem;
  }

  // ---- UI sync per account
  function setInputsForMode(mode){
    const capInput = findCapitalInput();
    const depInput = findDepositInput();
    const noteInput = findNoteInput();
    const saveBtn = findSaveButton();

    const aCap = last(getArr(KEY_AGGRO))?.capital || 0;
    const sCap = last(getArr(KEY_SAFE))?.capital || last(getArr(KEY_BUILD_LEGACY))?.capital || 0;

    // migrate legacy build -> safe once (if you had it)
    if (getArr(KEY_BUILD_LEGACY).length && !getArr(KEY_SAFE).length) {
      setArr(KEY_SAFE, getArr(KEY_BUILD_LEGACY));
    }

    if (mode === "all") {
      if (capInput){ capInput.value = String((aCap + sCap).toFixed(2)); capInput.disabled = true; capInput.style.opacity = "0.8"; }
      if (depInput){ depInput.value = ""; depInput.disabled = true; depInput.style.opacity = "0.6"; }
      if (noteInput){ noteInput.value = ""; noteInput.disabled = true; noteInput.style.opacity = "0.6"; }
      if (saveBtn){ saveBtn.style.opacity = "0.6"; }
      return;
    }

    if (capInput){
      capInput.disabled = false; capInput.style.opacity = "1";
      const arr = getArr(keyFor(mode));
      const cap = last(arr)?.capital;
      capInput.value = (cap == null) ? "" : String(cap);
    }
    if (depInput){ depInput.disabled = false; depInput.style.opacity = "1"; }
    if (noteInput){ noteInput.disabled = false; noteInput.style.opacity = "1"; }
    if (saveBtn){ saveBtn.style.opacity = "1"; }
  }

  // block saving in Gesamt
  function guardSave(mode){
    const btn = findSaveButton();
    if (!btn) return;

    // clear old guard if any
    btn.removeEventListener("click", onGuard, true);

    if (mode === "all") {
      btn.addEventListener("click", onGuard, true);
    }
  }
  function onGuard(e){
    e.preventDefault(); e.stopPropagation();
    alert("In 'Gesamt' wird nicht gespeichert. Bitte Aggro oder Safe-Build wählen.");
  }

  function computeCapForView(mode){
    if (mode === "all") {
      const a = last(getArr(KEY_AGGRO))?.capital || 0;
      const s = last(getArr(KEY_SAFE))?.capital || last(getArr(KEY_BUILD_LEGACY))?.capital || 0;
      return a + s;
    }
    return last(getArr(keyFor(mode)))?.capital;
  }

  function applyMode(mode){
    // reset hooks
    unhookStorage();

    // Gesamt: merged snapshot for the core renderer (so charts can show combined if you want)
    if (mode === "all") {
      const merged = [
        ...getArr(KEY_AGGRO),
        ...getArr(KEY_SAFE),
        ...getArr(KEY_BUILD_LEGACY)
      ].sort((x,y)=> String(x.ts || "").localeCompare(String(y.ts || "")));
      setArr(BASE_KEY, merged);
    } else {
      hookStorage(mode);
    }

    setInputsForMode(mode);
    guardSave(mode);

    const cap = computeCapForView(mode);
    renderStrategy(mode, cap);

    // refresh core UI
    if (typeof window.render === "function") window.render();
  }

  function init(){
    mountTopUI();
    const sel = document.getElementById("cccAccountSelect");
    if (sel) sel.value = getActive();
    applyMode(getActive());
  }

  console.log("CCC Plugin two-accounts v3 ✅");
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
