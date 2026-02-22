(() => {
  if (!window.CCC) return;
  const CCC = window.CCC;

  function toDateSafe(ts){
    // ts format "YYYY-MM-DD HH:MM"
    // convert to ISO-like for Safari safety
    if(!ts) return null;
    const iso = ts.replace(" ", "T");
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  function getWeekKey(d){
    // simple week key: YYYY-Wxx (approx; stable enough for our scoreboard)
    const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const oneJan = new Date(dt.getFullYear(), 0, 1);
    const day = Math.floor((dt - oneJan) / 86400000);
    const week = Math.ceil((day + oneJan.getDay() + 1) / 7);
    return `${dt.getFullYear()}-W${String(week).padStart(2,"0")}`;
  }

  function calcDrawdownPct(capEntries){
    if (!capEntries || capEntries.length < 2) return 0;
    let peak = Number(capEntries[0].capital) || 0;
    for (const e of capEntries) peak = Math.max(peak, Number(e.capital) || 0);
    const cur = Number(capEntries[capEntries.length - 1].capital) || 0;
    return peak > 0 ? ((peak - cur) / peak) * 100 : 0;
  }

  function mount(){
    const el = document.getElementById("disciplineMount");
    if (!el) return;

    const a = CCC.getAccount();
    const isTotal = a === "total";
    const accounts = isTotal ? ["aggro", "safe"] : [a];

    let score = 100;
    const notes = [];

    const now = new Date();
    const wk = getWeekKey(now);

    for (const acc of accounts){
      const capEntries = CCC.store.getCap(acc);
      const trades = CCC.store.getTrades(acc);

      // Journal presence
      if (!capEntries.length){
        score -= 20;
        notes.push(`${CCC.ACC[acc].label}: keine Kapital-Einträge`);
      }

      // Weekly trade overload (simple guardrail)
      const tradesThisWeek = trades.filter(t => {
        const d = toDateSafe(t.ts);
        return d ? (getWeekKey(d) === wk) : false;
      });

      const limit = (acc === "aggro") ? 25 : 15;
      if (tradesThisWeek.length > limit){
        score -= 15;
        notes.push(`${CCC.ACC[acc].label}: zu viele Trades (${tradesThisWeek.length}/${limit})`);
      }

      // Drawdown discipline
      const dd = calcDrawdownPct(capEntries);
      if (acc === "aggro" && dd >= 25){
        score -= 20;
        notes.push(`Aggro Drawdown hoch (${dd.toFixed(1)}%)`);
      }
      if (acc === "safe" && dd >= 12){
        score -= 20;
        notes.push(`Safe Drawdown hoch (${dd.toFixed(1)}%)`);
      }

      // Last 3 trades behavior
      const last3 = trades.slice(-3).map(t => Number(t.pnl||0));
      const negStreak = last3.length === 3 && last3.every(x => x < 0);
      if (negStreak){
        score -= 10;
        notes.push(`${CCC.ACC[acc].label}: 3 Verluste in Folge → PAUSE-Regel aktiv`);
      }
    }

    score = Math.max(0, Math.min(100, score));

    const grade =
      score >= 90 ? "A (Elite)"
      : score >= 75 ? "B (Gut)"
      : score >= 60 ? "C (Wacklig)"
      : "D (Stop & Reset)";

    el.innerHTML = `
      <div class="kpis">
        <div class="kpi">
          <div class="t">Disziplin Score</div>
          <div class="v">${score}/100</div>
          <div class="tiny">${grade}</div>
        </div>
        <div class="kpi">
          <div class="t">Wochen-Regel</div>
          <div class="v">No Revenge</div>
          <div class="tiny">Nach Verlustserie Pause</div>
        </div>
        <div class="kpi">
          <div class="t">Wochen-Regel</div>
          <div class="v">Journal</div>
          <div class="tiny">Kapital + Trades pflegen</div>
        </div>
      </div>

      <div class="hr"></div>

      <div class="note">
        <b>Diese Woche (${wk}):</b><br/>
        ${notes.length ? notes.map(n => `• ${CCC.utils.esc(n)}`).join("<br/>") : "• Alles sauber ✅"}<br/><br/>
        <b>Fix-Plan (automatisch):</b><br/>
        • 2x SL/Tag (Aggro) oder 1x SL/Tag (Safe) → Risiko halbieren / Pause<br/>
        • 3 Verluste in Folge → 24h Pause + Review<br/>
        • Drawdown hoch → Setup enger + weniger Trades
      </div>
    `;
  }

  CCC.on("accountChanged", mount);
  CCC.on("render", mount);
  CCC.on("tradesChanged", mount);
  mount();
})();
