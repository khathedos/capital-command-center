// plugins/risk-engine.js
(() => {
  function render(root, ctx){
    const acc = ctx.account;
    const isTotal = acc === "total";
    const cap = isTotal ? ctx.capital : ctx.capital;

    const wrap = document.createElement("div");
    wrap.className = "card";
    wrap.style.boxShadow = "none";
    wrap.style.padding = "12px";
    wrap.innerHTML = `
      <h2 style="margin:0 0 8px 0;">Risk Engine</h2>
      <div class="mini">Berechnet Positionsgröße aus Risiko / SL / Hebel.</div>
      <div class="hr"></div>

      <div class="row">
        <div style="flex:1;min-width:150px">
          <label>Risiko pro Trade (%)</label>
          <input id="reRiskPct" type="number" step="0.1" value="${acc==="aggro" ? 3 : acc==="safe" ? 1.5 : 2}" ${isTotal?"disabled":""}>
        </div>
        <div style="flex:1;min-width:150px">
          <label>Stop-Loss (%)</label>
          <input id="reSlPct" type="number" step="0.1" value="${acc==="aggro" ? 6 : acc==="safe" ? 4 : 5}" ${isTotal?"disabled":""}>
        </div>
        <div style="flex:1;min-width:150px">
          <label>Hebel (x)</label>
          <input id="reLev" type="number" step="1" value="${acc==="aggro" ? 10 : acc==="safe" ? 5 : 7}" ${isTotal?"disabled":""}>
        </div>
      </div>

      <div class="hr"></div>

      <div class="kpis">
        <div class="kpi">
          <div class="t">Kapital</div>
          <div class="v">${ctx.fmt(cap)}</div>
          <div class="tiny">${isTotal ? "Gesamt (read-only)" : (acc==="aggro"?"Aggro":"Safe")}</div>
        </div>
        <div class="kpi">
          <div class="t">Max Verlust ($)</div>
          <div class="v" id="reRiskUsd">$0</div>
          <div class="tiny">= Kapital * Risiko%</div>
        </div>
        <div class="kpi">
          <div class="t">Max Positionsgröße ($)</div>
          <div class="v" id="rePosUsd">$0</div>
          <div class="tiny">≈ Risiko$ / SL%</div>
        </div>
      </div>

      <div class="hr"></div>

      <div class="kpis">
        <div class="kpi">
          <div class="t">Margin Needed ($)</div>
          <div class="v" id="reMargin">$0</div>
          <div class="tiny">≈ Position / Hebel</div>
        </div>
        <div class="kpi">
          <div class="t">Hinweis</div>
          <div class="v" id="reHint">—</div>
          <div class="tiny">Caps pro Account</div>
        </div>
        <div class="kpi">
          <div class="t">Empfehlung</div>
          <div class="v" id="reReco">—</div>
          <div class="tiny">Konservativ > Überleben</div>
        </div>
      </div>
    `;
    root.appendChild(wrap);

    function calc(){
      const riskPct = Number(wrap.querySelector("#reRiskPct")?.value || 0);
      const slPct = Number(wrap.querySelector("#reSlPct")?.value || 0);
      const lev = Math.max(1, Number(wrap.querySelector("#reLev")?.value || 1));

      const riskUsd = cap * (riskPct/100);
      const posUsd = slPct>0 ? (riskUsd / (slPct/100)) : 0;
      const margin = lev>0 ? (posUsd / lev) : 0;

      wrap.querySelector("#reRiskUsd").textContent = ctx.fmt(riskUsd);
      wrap.querySelector("#rePosUsd").textContent = ctx.fmt(posUsd);
      wrap.querySelector("#reMargin").textContent = ctx.fmt(margin);

      let hint = "—";
      if(acc==="aggro") hint = "Aggro Cap: ≤10x, Risiko 2–4%";
      else if(acc==="safe") hint = "Safe Cap: ≤5x, Risiko 1–2%";
      else hint = "Gesamt: nur Anzeige";
      wrap.querySelector("#reHint").textContent = hint;

      let reco = "OK";
      if(acc==="safe" && lev>5) reco = "Hebel zu hoch";
      if(acc==="aggro" && lev>10) reco = "Hebel zu hoch";
      if(riskPct>5) reco = "Risiko zu hoch";
      wrap.querySelector("#reReco").textContent = reco;
    }

    if(!isTotal){
      ["#reRiskPct","#reSlPct","#reLev"].forEach(sel=>{
        wrap.querySelector(sel).addEventListener("input", calc);
      });
    }
    calc();
  }

  window.CCC?.registerPanel({ id:"risk", title:"Risk", render });
  console.log("CCC risk-engine ✅");
})();
