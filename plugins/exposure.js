// plugins/exposure.js
(() => {
  const TRADES_PREFIX = "ccc_trades_v1";

  function loadTrades(ctx, acc){
    return ctx.storage.getJSON(ctx.storage.keyFor(TRADES_PREFIX, acc), []);
  }

  function render(root, ctx){
    const wrap = document.createElement("div");
    wrap.className = "card";
    wrap.style.boxShadow = "none";
    wrap.style.padding = "12px";

    const aTrades = loadTrades(ctx, "aggro").filter(t=>t.status==="OPEN");
    const sTrades = loadTrades(ctx, "safe").filter(t=>t.status==="OPEN");

    const expAggro = aTrades.reduce((sum,t)=>sum + (Number(t.sizeUsd)||0), 0);
    const expSafe  = sTrades.reduce((sum,t)=>sum + (Number(t.sizeUsd)||0), 0);
    const expTotal = expAggro + expSafe;

    const capA = ctx.capitalAggro;
    const capS = ctx.capitalSafe;

    // Limits (you can tweak)
    const limAggro = Math.max(0, capA * 3.0); // notional cap heuristic
    const limSafe  = Math.max(0, capS * 2.0);
    const limTotal = Math.max(0, (capA+capS) * 2.5);

    function statLine(label, exp, lim){
      const pct = lim>0 ? Math.min(999, (exp/lim)*100) : 0;
      const cls = pct>=100 ? "bad" : (pct>=75 ? "warn" : "good");
      return { pct, cls, html: `
        <div class="kpi">
          <div class="t">${label}</div>
          <div class="v">${ctx.fmt(exp)}</div>
          <div class="tiny">Limit ${ctx.fmt(lim)} • ${pct.toFixed(0)}%</div>
        </div>
      `};
    }

    const s1 = statLine("Exposure Aggro (OPEN)", expAggro, limAggro);
    const s2 = statLine("Exposure Safe (OPEN)",  expSafe,  limSafe);
    const s3 = statLine("Exposure Gesamt",        expTotal, limTotal);

    wrap.innerHTML = `
      <h2 style="margin:0 0 8px 0;">Exposure Monitor</h2>
      <div class="mini">Summiert offene Trades (Notional). Warnung bei zu hoher Gesamtbelastung.</div>
      <div class="hr"></div>

      <div class="kpis">
        ${s1.html}
        ${s2.html}
        ${s3.html}
      </div>

      <div class="hr"></div>

      <div class="alert ${ (s1.cls==="bad"||s2.cls==="bad"||s3.cls==="bad") ? "show bad" :
                           (s1.cls==="warn"||s2.cls==="warn"||s3.cls==="warn") ? "show warn" : "" }">
        ${
          (s1.cls==="bad"||s2.cls==="bad"||s3.cls==="bad")
          ? "<b>🛑 Exposure zu hoch</b><br/>Positionen reduzieren oder keine neuen Trades öffnen."
          : (s1.cls==="warn"||s2.cls==="warn"||s3.cls==="warn")
            ? "<b>⚠️ Exposure hoch</b><br/>A
