// plugins/ui-switcher.js
(() => {
  const ACTIVE = "ccc_active_account_v1";
  const BASE = "ccc_entries_v3";
  const AKEY = BASE + "__aggro";
  const SKEY = BASE + "__safe";
  const LEGACY = BASE + "__build";

  function j(s,f){ try{return JSON.parse(s)}catch{return f} }
  function getArr(k){ return j(localStorage.getItem(k)||"[]",[]); }
  function last(arr){ return arr.length?arr[arr.length-1]:null; }

  function getCapAggro(){ return last(getArr(AKEY))?.capital || 0; }
  function getCapSafe(){
    const s = getArr(SKEY);
    if (s.length) return last(s)?.capital || 0;
    const b = getArr(LEGACY);
    return last(b)?.capital || 0;
  }

  // --- stage definitions
  function stageAggro(cap){
    if (cap < 60) return {name:"A0 Seed", next:60, risk:"Seed", lever:"≤ 10x", sltp:"SL 6–8% | TP 18–22%", kill:"<25$ STOP"};
    if (cap < 100) return {name:"A1 Base", next:100, risk:"Aggro", lever:"≤ 10x", sltp:"SL 6–8% | TP 18–22%", kill:"<52$ STOP"};
    return {name:"A2 Grow", next:150, risk:"Aggro", lever:"≤ 10x", sltp:"SL 6–8% | TP 18–22%", kill:"Kill je Stage"};
  }
  function stageSafe(cap){
    if (cap < 150) return {name:"S0 Stabil", next:150, risk:"Stable", lever:"≤ 5x", sltp:"SL 3–5% | TP 8–12%", kill:"<80$ STOP"};
    if (cap < 250) return {name:"S1 Build", next:250, risk:"Stable", lever:"≤ 5x", sltp:"SL 3–5% | TP 8–12%", kill:"<130$ STOP"};
    return {name:"S2 Grow", next:500, risk:"Stable", lever:"≤ 5x", sltp:"SL 3–5% | TP 8–12%", kill:"Kill je Stage"};
  }

  // --- DOM helpers (robust)
  const q = (sel) => document.querySelector(sel);
  const qa = (sel) => Array.from(document.querySelectorAll(sel));

  function setTextLikeContains(needle, newText){
    // finds small pills/buttons that contain needle text
    const el = qa("*").find(n => (n.textContent||"").includes(needle));
    if (el) el.textContent = newText;
  }

  function swapStageCard(mode, cap){
    // Stage card area: we replace the left title + bullets + right "Next Trigger"
    // Try to detect by headings:
    const card = qa("div").find(d => (d.textContent||"").includes("Stage 0") && (d.textContent||"").includes("Controlled Explosion"));
    if (!card) return;

    const st = mode==="safe" ? stageSafe(cap) : stageAggro(cap);

    // Replace key strings inside card content
    card.innerHTML = card.innerHTML
      .replace(/Stage 0\s*–\s*Controlled Explosion/g, `Stage – ${st.name}`)
      .replace(/Ziel:\s*39\$\s*→\s*60\$/g, mode==="safe" ? `Ziel: ${cap.toFixed(0)}$ → ${st.next}$` : `Ziel: ${cap.toFixed(0)}$ → ${st.next}$`)
      .replace(/Hebel\s*≤\s*10x\s*\(nie erhöhen\)/g, `Hebel ${st.lever} (nicht erhöhen)`)
      .replace(/SL\s*6–8%\s*\|\s*TP\s*18–22%/g, st.sltp)
      .replace(/Kill:\s*<25\$\s*STOP/g, `Kill: ${st.kill}`)
      .replace(/\$60\s*→\s*Stage\s*1/g, `$${st.next} → next stage`);

    // Also fix small pills if they exist:
    setTextLikeContains("Bot:", mode==="safe" ? "Bot: 20–30$ | 2–5x" : "Bot: 30$ | 10x");
  }

  function swapTopProgress(mode, cap){
    // Progress label: "65.0% bis $60"
    // Find the line that includes "bis $" and replace based on next target.
    const st = mode==="safe" ? stageSafe(cap) : stageAggro(cap);

    const label = qa("div").find(d => (d.textContent||"").includes("bis $"));
    if (label) {
      const pct = st.next > 0 ? Math.min(100, (cap / st.next) * 100) : 0;
      label.textContent = `${pct.toFixed(1)}% bis $${st.next}`;
    }

    // Progress bar width (first bar)
    const bar = q("div[style*='width'][style*='%']");
    // too risky to touch generic; skip unless you want: we can adjust later precisely.
  }

  function apply(){
    const mode = localStorage.getItem(ACTIVE) || "aggro";

    if (mode === "all") {
      const cap = getCapAggro() + getCapSafe();
      // In Gesamt: show combined next target from BOTH? we choose: next = Aggro next + Safe next (simple)
      // We'll just change the hint pills and keep stage card as "Gesamt".
      setTextLikeContains("Risk:", "Risk: Gesamt");
      setTextLikeContains("Next:", `Next: $${Math.max(60, Math.ceil(cap/10)*10)}`);
      return;
    }

    const cap = mode==="safe" ? getCapSafe() : getCapAggro();

    // Change pills "Risk:" and "Next:"
    const st = mode==="safe" ? stageSafe(cap) : stageAggro(cap);
    setTextLikeContains("Risk:", `Risk: ${st.risk}`);
    setTextLikeContains("Next:", `Next: $${st.next}`);

    swapTopProgress(mode, cap);
    swapStageCard(mode, cap);
  }

  // refresh periodically + on visibility
  console.log("CCC Plugin ui-switcher ✅");
  setInterval(apply, 1200);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) apply(); });
})();
