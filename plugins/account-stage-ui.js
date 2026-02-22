// plugins/account-stage-ui.js (SAFE)
(() => {
  const ACTIVE_KEY = "ccc_active_account_v1";
  const BASE_KEY = "ccc_entries_v3";
  const KEY_AGGRO = BASE_KEY + "__aggro";
  const KEY_SAFE  = BASE_KEY + "__safe";
  const KEY_BUILD_LEGACY = BASE_KEY + "__build";

  const $ = (sel) => document.querySelector(sel);

  function parseJSON(s, fallback){ try { return JSON.parse(s); } catch { return fallback; } }
  function getArr(k){ return parseJSON(localStorage.getItem(k) || "[]", []); }
  function last(arr){ return arr.length ? arr[arr.length-1] : null; }

  function active(){ return localStorage.getItem(ACTIVE_KEY) || "aggro"; }

  function capAggro(){ return Number(last(getArr(KEY_AGGRO))?.capital || 0); }
  function capSafe(){
    const s = getArr(KEY_SAFE);
    if (s.length) return Number(last(s)?.capital || 0);
    const b = getArr(KEY_BUILD_LEGACY);
    return Number(last(b)?.capital || 0);
  }
  function capTotal(){ return capAggro() + capSafe(); }

  // ---- stage logic
  function stageAggro(cap){
    if (cap < 60) return { stage:"A0 Seed", next:60, risk:"Seed", lever:"≤ 10x", sl:"6–8%", tp:"18–22%", kill:"<25$ STOP" };
    if (cap < 100) return { stage:"A1 Base", next:100, risk:"Aggro", lever:"≤ 10x", sl:"6–8%", tp:"18–22%", kill:"<52$ STOP" };
    if (cap < 150) return { stage:"A2 Grow", next:150, risk:"Aggro", lever:"≤ 10x", sl:"6–8%", tp:"18–22%", kill:"Kill je Stage" };
    return { stage:"A3+", next:300, risk:"Aggro", lever:"≤ 10x", sl:"6–8%", tp:"18–22%", kill:"Kill je Stage" };
  }
  function stageSafe(cap){
    if (cap < 150) return { stage:"S0 Stabil", next:150, risk:"Stable", lever:"≤ 5x", sl:"3–5%", tp:"8–12%", kill:"<80$ STOP" };
    if (cap < 250) return { stage:"S1 Build", next:250, risk:"Stable", lever:"≤ 5x", sl:"3–5%", tp:"8–12%", kill:"<130$ STOP" };
    if (cap < 500) return { stage:"S2 Grow", next:500, risk:"Stable", lever:"≤ 5x", sl:"3–5%", tp:"8–12%", kill:"Kill je Stage" };
    return { stage:"S3+", next:1000, risk:"Stable", lever:"≤ 5x", sl:"3–5%", tp:"8–12%", kill:"Kill je Stage" };
  }

  // ---- helpers to find small pills safely
  function setPill(prefix, text){
    // finds element that starts with prefix in textContent and replaces full content
    const nodes = Array.from(document.querySelectorAll("div,span,button"));
    const el = nodes.find(n => (n.textContent || "").trim().startsWith(prefix));
    if (el) el.textContent = text;
  }

  function setStageLabel(text){
    // your header has "Stage 0" pill; we replace it
    const nodes = Array.from(document.querySelectorAll("div,span"));
    const el = nodes.find(n => (n.textContent || "").trim().startsWith("Stage"));
    if (el) el.textContent = text;
  }

  function setProgressText(next){
    // updates the "xx.x% bis $YY" label if found
    const nodes = Array.from(document.querySelectorAll("div,span"));
    const el = nodes.find(n => (n.textContent || "").includes("% bis $"));
    if (el){
      // Keep percent already in UI? We'll rewrite based on capital later
      // Placeholder; actual percent set by update()
      return el;
    }
    return null;
  }

  function update(){
    const mode = active();

    const cap = (mode === "all") ? capTotal() : (mode === "safe" ? capSafe() : capAggro());
    const st = (mode === "safe") ? stageSafe(cap) : stageAggro(cap);
    const stageText = (mode === "all") ? "Stage Gesamt" : `Stage ${st.stage}`;

    // Stage pill
    setStageLabel(stageText);

    // Risk + Next pills
    if (mode === "all"){
      setPill("Risk:", "Risk: Gesamt");
      // Next: show the nearer next of both accounts (cleaner than random)
      const a = stageAggro(capAggro()).next;
      const s = stageSafe(capSafe()).next;
      setPill("Next:", `Next: $${Math.min(a, s)}`);
    } else {
      setPill("Risk:", `Risk: ${st.risk}`);
      setPill("Next:", `Next: $${st.next}`);
    }

    // Update "Max Tagesverlust" / Kill-switch card hints if your UI shows them
    // (We only touch pills that already exist)
    setPill("Kill:", `Kill: ${st.kill}`);

    // Progress label "xx.x% bis $YY"
    const progressEl = setProgressText(st.next);
    if (progressEl){
      const pct = st.next > 0 ? Math.min(100, (cap / st.next) * 100) : 0;
      progressEl.textContent = `${pct.toFixed(1)}% bis $${st.next}`;
    }
  }

  console.log("CCC Plugin account-stage-ui ✅");
  update();
  setInterval(update, 1200);
})();
