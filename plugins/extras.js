/* plugins/extras.js
   CCC Rule-Breach Alarm + iPhone Safe-Area Top Bar
*/
(() => {
  const CFG = {
    drawdownWarnPct: 25,   // Warnung ab -25% vom Peak
    killStage0: 25,        // Stage 0: Stop unter $25
    killStage1: 52,        // Stage 1: Pause unter $52
    pollMs: 1500,
    vibrate: true,
    beep: false
  };

  const fmt = (n) => "$" + (Number(n) || 0).toFixed(2);

  function safeJsonParse(s, fallback) {
    try { return JSON.parse(s); } catch { return fallback; }
  }

  // ---------- 1) SAFE AREA TOP BAR (iPhone Notch fix) ----------
  function injectSafeAreaCSS() {
    if (document.getElementById("ccc-safe-area-style")) return;

    const style = document.createElement("style");
    style.id = "ccc-safe-area-style";
    style.textContent = `
      /* Platz für iPhone Notch/Dynamic Island */
      body{
        padding-top: env(safe-area-inset-top);
      }
      /* Balken oben, damit es nicht "weiß" / leer wirkt */
      body::before{
        content:"";
        position: fixed;
        top: 0; left: 0; right: 0;
        height: env(safe-area-inset-top);
        background: rgba(10,16,28,.72);
        backdrop-filter: blur(10px);
        z-index: 99998;
        pointer-events: none;
        border-bottom: 1px solid rgba(255,255,255,.06);
      }
    `;
    document.head.appendChild(style);
  }

  // ---------- Entries / Peak DD ----------
  function loadEntries() {
    const keys = ["ccc_entries_v3", "ccc_entries_v2", "ccc_entries_v1"];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      const arr = safeJsonParse(raw, null);
      if (Array.isArray(arr) && arr.length) return { key: k, entries: arr };
    }
    return { key: null, entries: [] };
  }

  function last(arr) { return arr.length ? arr[arr.length - 1] : null; }

  function computePeakDrawdown(entries) {
    if (!entries.length) return { peak: 0, cur: 0, ddPct: 0, ddAbs: 0 };
    let peak = entries[0].capital;
    for (const e of entries) peak = Math.max(peak, e.capital);
    const cur = entries[entries.length - 1].capital;
    const ddAbs = peak - cur;
    const ddPct = peak > 0 ? (ddAbs / peak) * 100 : 0;
    return { peak, cur, ddPct, ddAbs };
  }

  function getStage(cap) {
    if (cap < 60) return 0;
    if (cap < 100) return 1;
    if (cap < 150) return 2;
    if (cap < 300) return 3;
    if (cap < 1000) return 4;
    return 5;
  }

  // ---------- 2) RULE ALARM BANNER ----------
  function ensureBanner() {
    let el = document.getElementById("ccc-rule-banner");
    if (el) return el;

    el = document.createElement("div");
    el.id = "ccc-rule-banner";
    el.style.position = "sticky";
    el.style.top = "0";
    el.style.zIndex = "99999";
    el.style.padding = "10px 12px";
    el.style.borderBottom = "1px solid rgba(255,255,255,.10)";
    el.style.backdropFilter = "blur(10px)";
    el.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
    el.style.display = "none";

    el.innerHTML = `
      <div style="max-width:1120px;margin:0 auto;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <div id="ccc-rule-dot" style="width:10px;height:10px;border-radius:999px;background:#22c55e;"></div>
          <div style="font-weight:900" id="ccc-rule-title">Status: OK</div>
          <div style="opacity:.85;font-size:12px" id="ccc-rule-msg">Keine Regelverletzung</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button id="ccc-rule-mute" style="border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#e5e7eb;padding:8px 10px;font-weight:800;cursor:pointer">
            Alarm aus
          </button>
          <button id="ccc-rule-hide" style="border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#e5e7eb;padding:8px 10px;font-weight:800;cursor:pointer">
            Ausblenden
          </button>
        </div>
      </div>
    `;

    document.body.insertBefore(el, document.body.firstChild);

    const muteBtn = document.getElementById("ccc-rule-mute");
    const hideBtn = document.getElementById("ccc-rule-hide");

    muteBtn.addEventListener("click", () => {
      const muted = localStorage.getItem("ccc_rule_muted") === "1";
      localStorage.setItem("ccc_rule_muted", muted ? "0" : "1");
      muteBtn.textContent = muted ? "Alarm aus" : "Alarm an";
    });

    hideBtn.addEventListener("click", () => {
      localStorage.setItem("ccc_rule_hidden", "1");
      el.style.display = "none";
    });

    const muted = localStorage.getItem("ccc_rule_muted") === "1";
    muteBtn.textContent = muted ? "Alarm an" : "Alarm aus";

    return el;
  }

  function setBanner(state, title, msg) {
    const el = ensureBanner();
    if (localStorage.getItem("ccc_rule_hidden") === "1") return;

    const dot = document.getElementById("ccc-rule-dot");
    const t = document.getElementById("ccc-rule-title");
    const m = document.getElementById("ccc-rule-msg");

    t.textContent = title;
    m.textContent = msg;

    if (state === "ok") {
      el.style.display = "none";
      return;
    }

    el.style.display = "block";

    if (state === "stop") {
      el.style.background = "rgba(239,68,68,.20)";
      dot.style.background = "#ef4444";
    } else {
      el.style.background = "rgba(245,158,11,.18)";
      dot.style.background = "#f59e0b";
    }
  }

  function triggerAlertOnce(kind) {
    const muted = localStorage.getItem("ccc_rule_muted") === "1";
    if (muted) return;

    const lastKind = localStorage.getItem("ccc_rule_last_kind") || "";
    if (lastKind === kind) return;
    localStorage.setItem("ccc_rule_last_kind", kind);

    if (CFG.vibrate && navigator.vibrate) {
      navigator.vibrate(kind === "stop" ? [200, 80, 200] : [120]);
    }
    if (CFG.beep) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = kind === "stop" ? 220 : 440;
        g.gain.value = 0.03;
        o.connect(g); g.connect(ctx.destination);
        o.start();
        setTimeout(() => { o.stop(); ctx.close(); }, 120);
      } catch {}
    }
  }

  function clearAlertLatch() {
    localStorage.setItem("ccc_rule_last_kind", "");
  }

  function checkRules() {
    const { entries } = loadEntries();
    const cur = last(entries)?.capital;

    if (!cur || !isFinite(cur)) {
      setBanner("warn", "Tracker leer", "Trage mindestens 1 Kapital-Eintrag ein, damit Regeln geprüft werden.");
      return;
    }

    const stage = getStage(cur);
    const dd = computePeakDrawdown(entries);

    const kill =
      (stage === 0 && cur < CFG.killStage0) ||
      (stage === 1 && cur < CFG.killStage1);

    if (kill) {
      setBanner(
        "stop",
        "🛑 KILL SWITCH",
        `Kapital ${fmt(cur)} unter kritischem Level. Bot pausieren. 24h Pause. (Stage ${stage})`
      );
      triggerAlertOnce("stop");
      return;
    }

    if (dd.ddPct >= CFG.drawdownWarnPct && entries.length >= 4) {
      setBanner(
        "warn",
        "⚠️ DRAWDOWN WARNUNG",
        `Peak ${fmt(dd.peak)} → jetzt ${fmt(dd.cur)} (−${dd.ddPct.toFixed(1)}%). Risiko reduzieren / pausieren.`
      );
      triggerAlertOnce("warn");
      return;
    }

    setBanner("ok", "Status: OK", "Keine Regelverletzung");
    clearAlertLatch();
  }

  // Boot
  console.log("CCC Plugin: SafeArea + Rule Alarm ✅");
  injectSafeAreaCSS();
  ensureBanner();
  checkRules();
  setInterval(checkRules, CFG.pollMs);
})();
