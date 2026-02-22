(() => {
  if (!window.CCC) return;
  const CCC = window.CCC;

  function sum(arr){ return arr.reduce((a,b)=>a+b,0); }

  function calcStats(trades){
    const pnl = trades.map(t => Number(t.pnl || 0)).filter(n => Number.isFinite(n));
    const wins = pnl.filter(x => x > 0);
    const losses = pnl.filter(x => x < 0);

    const count = pnl.length;
    const winrate = count ? (wins.length / count) * 100 : 0;

    const grossWin = sum(wins);
    const grossLoss = Math.abs(sum(losses));
    const pf = grossLoss > 0 ? (grossWin / grossLoss) : (grossWin > 0 ? 999 : 0);

    const avgWin = wins.length ? grossWin / wins.length : 0;
    const avgLoss = losses.length ? sum(losses) / losses.length : 0; // negative
    const expectancy = count ? (sum(pnl) / count) : 0;

    const maxWin = wins.length ? Math.max(...wins) : 0;
    const maxLoss = losses.length ? Math.min(...losses) : 0; // most negative

    return { count, winrate, grossWin, grossLoss, pf, avgWin, avgLoss, expectancy, maxWin, maxLoss };
  }

  function mount(){
    const el = document.getElementById("analyticsMount");
    if (!el) return;

    const a = CCC.getAccount();
    const isTotal = a === "total";

    const trades = isTotal
      ? [...CCC.store.getTrades("aggro"), ...CCC.store.getTrades("safe")]
      : CCC.store.getTrades(a);

    const s = calcStats(trades);

    el.innerHTML = `
      <div class="note" style="margin-bottom:10px">
        Analytics basiert auf deinen gespeicherten Trades (PnL). Je mehr du einträgst, desto genauer.
        ${isTotal ? "<br><b>Gesamt</b> = Aggro + Safe zusammen." : ""}
      </div>

      <div class="kpis">
        <div class="kpi">
          <div class="t">Trades</div>
          <div class="v">${s.count}</div>
          <div class="tiny">${isTotal ? "Gesamt" : CCC.ACC[a].label}</div>
        </div>
        <div class="kpi">
          <div class="t">Winrate</div>
          <div class="v">${s.winrate.toFixed(1)}%</div>
          <div class="tiny">Wins / Trades</div>
        </div>
        <div class="kpi">
          <div class="t">Profit Factor</div>
          <div class="v">${s.pf.toFixed(2)}</div>
          <div class="tiny">GrossWin / GrossLoss</div>
        </div>
      </div>

      <div class="hr"></div>

      <div class="kpis">
        <div class="kpi">
          <div class="t">Expectancy</div>
          <div class="v">${s.expectancy.toFixed(2)}</div>
          <div class="tiny">Ø PnL pro Trade</div>
        </div>
        <div class="kpi">
          <div class="t">Avg Win</div>
          <div class="v">${s.avgWin.toFixed(2)}</div>
          <div class="tiny">Ø Gewinn</div>
        </div>
        <div class="kpi">
          <div class="t">Avg Loss</div>
          <div class="v">${s.avgLoss.toFixed(2)}</div>
          <div class="tiny">Ø Verlust (negativ)</div>
        </div>
      </div>

      <div class="hr"></div>

      <div class="kpis">
        <div class="kpi">
          <div class="t">Max Win</div>
          <div class="v">${s.maxWin.toFixed(2)}</div>
          <div class="tiny">größter Gewinn</div>
        </div>
        <div class="kpi">
          <div class="t">Max Loss</div>
          <div class="v">${s.maxLoss.toFixed(2)}</div>
          <div class="tiny">größter Verlust</div>
        </div>
        <div class="kpi">
          <div class="t">Gross</div>
          <div class="v">${(s.grossWin - s.grossLoss).toFixed(2)}</div>
          <div class="tiny">Win - Loss</div>
        </div>
      </div>

      <div class="note" style="margin-top:12px">
        <b>Quick-Check:</b><br/>
        • PF &gt; 1.2 = System okay<br/>
        • Expectancy &gt; 0 = Vorteil<br/>
        • Wenn PF &lt; 1 → Risiko runter / Setup wechseln
      </div>
    `;
  }

  CCC.on("accountChanged", mount);
  CCC.on("tradesChanged", mount);
  CCC.on("render", mount);
  mount();
})();
