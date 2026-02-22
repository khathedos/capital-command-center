// plugins/rules.js  (v2 - account aware)
(() => {
  const ACTIVE_KEY = "ccc_active_account_v1";

  const BASE_KEY = "ccc_entries_v3";
  const KEY_AGGRO = BASE_KEY + "__aggro";
  const KEY_SAFE  = BASE_KEY + "__safe";
  const KEY_BUILD_LEGACY = BASE_KEY + "__build";

  const CFG = {
    aggro: { drawdownWarnPct: 25, killStage0: 25, killStage1: 52, pollMs: 1500, vibrate: true },
    safe:  { drawdownWarnPct: 12, killStage0: 80, killStage1: 130, pollMs: 1500, vibrate: true }, // konservativer
  };

  const fmt = (n) => "$" + (Number(n) || 0).toFixed(2);
  function safeJsonParse(s, fallback){ try { return JSON.parse(s); } catch { return fallback; } }
  function getArr(k){ return safeJsonParse(localStorage.getItem(k) || "[]", []); }
  function last(arr){ return arr.length ? arr[arr.length-1] : null; }

  function computePeakDD(entries){
    if (!entries.length) return { peak: 0, cur: 0, ddPct: 0 };
    let peak = entries[0].capital;
    for (const e of entries) peak = Math.max(peak, e.capital);
    const cur = entries[entries.length-1].capital;
    const ddPct = peak > 0 ? ((peak-cur)/peak)*100 : 0;
    return { peak, cur, ddPct };
  }

  function getStageAggro(cap){
    if (cap < 60) return 0;
    if (cap < 100) return 1;
    return 2; // reicht hier für killStage0/1 Logik
  }
  function getStageSafe(cap){
    if (cap < 150) return 0;
    if (cap < 250) return 1;
    return 2;
  }

  function ensureBanner(){
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

  function setBanner(state, title, msg){
    const el = ensureBanner();
    if (localStorage.getItem("ccc_rule_hidden") === "1") return;

    const dot = document.getElementById("ccc-rule-dot");
    const t = document.getElementById("ccc-rule-title");
    const m = document.getElementById("ccc-rule-msg");

    t.textContent = title;
    m.textContent = msg;

    if (state === "ok"){ el.style.display = "none"; return; }

    el.style.display = "block";
    if (state === "stop"){
      el.style.background = "rgba(239,68,68,.20)";
      dot.style.background = "#ef4444";
    } else {
      el.style.background = "rgba(245,158,11,.18)";
      dot.style.background = "#f59e0b";
    }
  }

  function trigger(kind){
    const muted = localStorage.getItem("ccc_rule_muted") === "1";
    if (muted) return;

    const lastKind = localStorage.getItem("ccc_rule_last_kind") || "";
    if (lastKind === kind) return;
    localStorage.setItem("ccc_rule_last_kind", kind);

    if (navigator.vibrate){
      navigator.vibrate(kind === "stop" ? [200,80,200] : [120]);
    }
  }
  function clearLatch(){ localStorage.setItem("ccc_rule_last_kind", ""); }

  function evaluateAccount(mode){
    const c = CFG[mode];
    const entries =
      mode === "aggro" ? getArr(KEY_AGGRO) :
      mode === "safe"  ? (getArr(KEY_SAFE).length ? getArr(KEY_SAFE) : getArr(KEY_BUILD_LEGACY)) :
      [];

    const cur = last(entries)?.capital;
    if (!cur || !isFinite(cur)) return { state: "warn", title: "Tracker leer", msg: `${mode}: Keine Einträge.` };

    const dd = computePeakDD(entries);

    const stage = mode === "aggro" ? getStageAggro(cur) : getStageSafe(cur);
    const kill = (stage === 0 && cur < c.killStage0) || (stage === 1 && cur < c.killStage1);

    if (kill){
      return { state: "stop", title: "🛑 KILL SWITCH", msg: `${mode.toUpperCase()}: Kapital ${fmt(cur)} unter Limit.` };
    }
    if (dd.ddPct >= c.drawdownWarnPct && entries.length >= 4){
      return { state: "warn", title: "⚠️ DRAWDOWN WARNUNG", msg: `${mode.toUpperCase()}: Peak ${fmt(dd.peak)} → ${fmt(dd.cur)} (−${dd.ddPct.toFixed(1)}%).` };
    }
    return { state: "ok", title: "Status: OK", msg: "Keine Regelverletzung" };
  }

  function check(){
    const active = localStorage.getItem(ACTIVE_KEY) || "aggro";

    if (active === "all"){
      // worst-of: if any stop -> stop, else if any warn -> warn
      const a = evaluateAccount("aggro");
      const s = evaluateAccount("safe");
      if (a.state === "stop" || s.state === "stop"){
        setBanner("stop", "🛑 KILL SWITCH", a.state === "stop" ? a.msg : s.msg);
        trigger("stop");
        return;
      }
      if (a.state === "warn" || s.state === "warn"){
        setBanner("warn", "⚠️ WARNUNG", a.state === "warn" ? a.msg : s.msg);
        trigger("warn");
        return;
      }
      setBanner("ok", "Status: OK", "Keine Regelverletzung");
      clearLatch();
      return;
    }

    const r = evaluateAccount(active === "safe" ? "safe" : "aggro");
    if (r.state === "ok"){
      setBanner("ok", "Status: OK", "Keine Regelverletzung");
      clearLatch();
      return;
    }
    setBanner(r.state, r.title, r.msg);
    trigger(r.state === "stop" ? "stop" : "warn");
  }

  console.log("CCC Plugin rules v2 ✅");
  ensureBanner();
  check();
  setInterval(check, 1500);
})();
