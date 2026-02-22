// plugins/two-accounts.js
(() => {
  const STORE_KEY = "ccc_active_account_v1";
  const ACCOUNTS = [
    { id: "aggro", name: "Aggro (39$)", hint: "High risk / high reward" },
    { id: "build", name: "Build (100€)", hint: "Stabil aufbauen" },
    { id: "all",   name: "Gesamt", hint: "Summe + Mission" }
  ];

  // Helpers
  const $ = (id) => document.getElementById(id);
  const bySel = (sel) => document.querySelector(sel);

  function getActive() {
    return localStorage.getItem(STORE_KEY) || "aggro";
  }
  function setActive(id) {
    localStorage.setItem(STORE_KEY, id);
    applyMode(id);
  }

  // Creates a small account selector UI under header
  function mountSelector() {
    if (document.getElementById("ccc-account-switch")) return;

    // Try to attach near top: inside header .sub if exists
    // Your header has .sub and pills — we add a clean dropdown.
    const sub = document.querySelector("header .sub") || document.querySelector("header");
    if (!sub) return;

    const wrap = document.createElement("div");
    wrap.id = "ccc-account-switch";
    wrap.style.display = "inline-flex";
    wrap.style.gap = "8px";
    wrap.style.alignItems = "center";

    wrap.innerHTML = `
      <span style="
        display:inline-flex;align-items:center;gap:8px;
        padding:6px 10px;border-radius:999px;
        font-size:12px;font-weight:800;
        border:1px solid rgba(255,255,255,.10);
        background: rgba(17,27,46,.65);
        color:#dbe6ff;">
        Account:
        <select id="cccAccountSelect" style="
          border-radius:999px;border:1px solid rgba(255,255,255,.12);
          background: rgba(13,21,36,.55);
          color:#e5e7eb;
          padding:6px 10px;
          font-weight:900;
        ">
          ${ACCOUNTS.map(a => `<option value="${a.id}">${a.name}</option>`).join("")}
        </select>
      </span>
      <span id="cccAccountHint" style="font-size:12px;color:#93a4b8;"></span>
    `;

    sub.appendChild(wrap);

    const sel = document.getElementById("cccAccountSelect");
    sel.value = getActive();
    sel.addEventListener("change", () => setActive(sel.value));

    updateHint(sel.value);
  }

  function updateHint(id){
    const h = document.getElementById("cccAccountHint");
    if (!h) return;
    const a = ACCOUNTS.find(x => x.id === id);
    h.textContent = a ? a.hint : "";
  }

  // Core behavior:
  // We don't rewrite your whole app. We do a simple, reliable approach:
  // - For Aggro/Build: we FILTER the UI view by reading/saving separate entry lists.
  // - We monkey-patch localStorage key usage by duplicating the core key per account.
  //
  // Your app stores entries in localStorage under "ccc_entries_v3".
  // We'll redirect it depending on selected account:
  // - Aggro: ccc_entries_v3__aggro
  // - Build: ccc_entries_v3__build
  //
  // "Gesamt" shows combined KPIs by temporarily merging for view.
  //
  // This works without changing index.html internals.

  const BASE_KEY = "ccc_entries_v3";
  const KEY_AGGRO = BASE_KEY + "__aggro";
  const KEY_BUILD = BASE_KEY + "__build";

  // Keep original storage functions
  const origGetItem = localStorage.getItem.bind(localStorage);
  const origSetItem = localStorage.setItem.bind(localStorage);
  const origRemoveItem = localStorage.removeItem.bind(localStorage);

  function remapKey(key, mode){
    if (key !== BASE_KEY) return key;
    if (mode === "aggro") return KEY_AGGRO;
    if (mode === "build") return KEY_BUILD;
    return key; // "all" uses base as temporary merged snapshot
  }

  // Merge helper for Gesamt view
  function getArr(k){
    try { return JSON.parse(origGetItem(k) || "[]"); } catch { return []; }
  }
  function setArr(k, arr){
    origSetItem(k, JSON.stringify(arr));
  }

  function applyMode(mode){
    updateHint(mode);

    // Restore original hooks first (idempotent)
    localStorage.getItem = origGetItem;
    localStorage.setItem = origSetItem;
    localStorage.removeItem = origRemoveItem;

    if (mode === "all") {
      // For Gesamt: we build a merged list and store it temporarily into BASE_KEY,
      // but we do NOT overwrite account data. We only overwrite BASE_KEY.
      const a = getArr(KEY_AGGRO);
      const b = getArr(KEY_BUILD);

      // Merge and sort by timestamp string (works with your format "YYYY-MM-DD HH:MM")
      const merged = [...a, ...b].sort((x,y)=> String(x.ts).localeCompare(String(y.ts)));
      setArr(BASE_KEY, merged);

      // Trigger core re-render if available
      if (typeof window.render === "function") window.render();
      return;
    }

    // For aggro/build: hook storage calls for BASE_KEY only
    localStorage.getItem = function(key){
      return origGetItem(remapKey(key, mode));
    };
    localStorage.setItem = function(key, value){
      return origSetItem(remapKey(key, mode), value);
    };
    localStorage.removeItem = function(key){
      return origRemoveItem(remapKey(key, mode));
    };

    // Trigger core re-render if available
    if (typeof window.render === "function") window.render();
  }

  function init(){
    mountSelector();
    applyMode(getActive());
  }

  console.log("CCC Plugin two-accounts ✅");
  // Wait for DOM ready and core scripts to define render()
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
