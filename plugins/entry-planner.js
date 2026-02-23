// plugins/entry-planner.js
(() => {
  if (!window.CCC) return;
  const CCC = window.CCC;

  const KEY = (a) => `ccc_entryplanner_${a}_v2`;

  function jget(k, fb){ try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(fb)); } catch { return fb; } }
  function jset(k, v){ localStorage.setItem(k, JSON.stringify(v)); }

  const fmt = (n) => (Number(n)||0).toFixed(6).replace(/0+$/,'').replace(/\.$/,'');
  const fmt2 = (n) => (Number(n)||0).toFixed(2);

  function getCapital(account){
    if (account === "total") {
      const a = CCC.store.getCap("aggro").slice(-1)[0]?.capital ?? 39;
      const s = CCC.store.getCap("safe").slice(-1)[0]?.capital ?? 0;
      return (Number(a)||0) + (Number(s)||0);
    }
    const last = CCC.store.getCap(account).slice(-1)[0];
    if (last && Number(last.capital) > 0) return Number(last.capital);
    return account === "aggro" ? 39 : 0;
  }

  function mount(){
    const host = document.getElementById("riskMount");
    if (!host) return;

    const account = CCC.getAccount();
    const isTotal = account === "total";
    const cap = getCapital(account);

    const saved = isTotal ? {} : jget(KEY(account), {
      symbol: "DOGEUSDT",
      dir: "Short",
      mode: "breakout",   // breakout | pullback
      price: "",
      level: "",
      slPct: account === "safe" ? 4 : 6,
      riskPct: account === "safe" ? 1.5 : 2.5,
      maxLev: account === "safe" ? 5 : 8,
      alertPct: 0.35
    });

    // Cleanup previous mount
    const old = host.querySelector("[data-entryplanner='1']");
    if (old) old.remove();

    const container = document.createElement("div");
    container.dataset.entryplanner = "1";
    container.style.marginTop = "14px";
    container.style.borderRadius = "16px";
    container.style.border = "1px solid rgba(255,255,255,.07)";
    container.style.background = "linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.02))";
    container.style.padding = "16px";
    container.style.boxShadow = "0 14px 30px rgba(0,0,0,.28)";

    container.innerHTML = `
      <h2 style="margin:0 0 10px 0;font-size:14px;color:#dbe6ff;letter-spacing:.2px">Entry Planner (halb-automatisch)</h2>

      <div class="note" style="margin-bottom:10px">
        Du trägst <b>Preis + ein Level</b> aus dem <b>5m Chart</b> ein. Die App berechnet: <b>Entry / SL / TP / Hebel / Positionsgröße</b>.
        ${isTotal ? "<br><b>Gesamt ist read-only.</b> Wähle Aggro oder Safe-Build zum Speichern." : ""}
      </div>

      <details style="margin:10px 0; border:1px solid rgba(255,255,255,.08); border-radius:14px; padding:10px; background: rgba(17,27,46,.45);">
        <summary style="cursor:pointer; font-weight:900; color:#dbe6ff;">
          🧠 Level in 10 Sekunden finden (grafisch erklärt)
        </summary>

        <div class="note" style="margin-top:10px; line-height:1.55">
          <b>Du brauchst nur 1 Linie:</b> Support (unten) oder Resistance (oben).<br/><br/>

          <b>Schritt 1:</b> Chart auf <b>5m</b> stellen und so zoomen, dass du <b>30–60 Minuten</b> siehst.<br/>
          <b>Schritt 2:</b> Such eine Stelle, wo der Kurs <b>2–3x</b> an fast derselben Preiszone reagiert (dreht/stoppt).<br/>
          <b>Schritt 3:</b> Diese Preiszone ist dein <b>Level</b>. Wenn es eine Zone ist: nimm den <b>Mittelwert</b> als Zahl.<br/><br/>

          <b>Grafik – Support (unten):</b>
          <pre style="white-space:pre-wrap; background:rgba(13,21,36,.35); padding:10px; border-radius:12px; border:1px solid rgba(255,255,255,.08); margin:8px 0;">
Preis
  |        /\\        /\\
  |       /  \\      /  \\
  |______/____\\____/____\\_____  ← SUPPORT = hier stoppt es oft / dreht
  |________________________________ Zeit
          </pre>

          <b>Grafik – Resistance (oben):</b>
          <pre style="white-space:pre-wrap; background:rgba(13,21,36,.35); padding:10px; border-radius:12px; border:1px solid rgba(255,255,255,.08); margin:8px 0;">
Preis
  |____  ____  ____            ← RESISTANCE = hier stoppt es oft / dreht
  |    \\/    \\/    \\__
  |______________________ Zeit
          </pre>

          <b>Welche Linie trägst du ein?</b><br/>
          • <b>Breakout Long:</b> Resistance (oben) eintragen (Ausbruch nach oben).<br/>
          • <b>Breakout Short:</b> Support (unten) eintragen (Ausbruch nach unten).<br/>
          • <b>Pullback Long:</b> letzte Ausbruchszone/Support eintragen (Rücklauf kaufen).<br/>
          • <b>Pullback Short:</b> letzte Ausbruchszone/Resistance eintragen (Rücklauf shorten).<br/><br/>

          <b>Mini-Regel:</b> Wenn du nicht sicher bist → nimm das letzte klare <b>Hoch</b> (für Long) oder <b>Tief</b> (für Short).
        </div>
      </details>

      <div class="row">
        <div style="flex:1;min-width:160px">
          <label>Symbol</label>
          <input id="ep_symbol" value="${CCC.utils.esc(saved.symbol||"")}" placeholder="DOGEUSDT"/>
        </div>

        <div style="min-width:140px">
          <label>Richtung</label>
          <select id="ep_dir">
            <option ${saved.dir==="Long"?"selected":""}>Long</option>
            <option ${saved.dir==="Short"?"selected":""}>Short</option>
          </select>
        </div>

        <div style="min-width:220px">
          <label>Modus</label>
          <select id="ep_mode">
            <option value="breakout" ${saved.mode==="breakout"?"selected":""}>Breakout (Level wird gebrochen)</option>
            <option value="pullback" ${saved.mode==="pullback"?"selected":""}>Pullback (Rücklauf zur Zone)</option>
          </select>
        </div>
      </div>

      <div class="row" style="margin-top:10px">
        <div style="flex:1;min-width:180px">
          <label>Aktueller Preis</label>
          <input id="ep_price" type="number" step="0.0000001" value="${saved.price}" placeholder="z.B. 0.08342"/>
        </div>
        <div style="flex:1;min-width:180px">
          <label>Level (Support/Resistance)</label>
          <input id="ep_level" type="number" step="0.0000001" value="${saved.level}" placeholder="z.B. 0.08410"/>
        </div>
        <div style="min-width:180px">
          <label>Alert-Zone (%)</label>
          <input id="ep_alertPct" type="number" step="0.05" value="${saved.alertPct}" />
        </div>
      </div>

      <div class="row" style="margin-top:10px">
        <div style="min-width:180px;flex:1">
          <label>Stop-Loss Abstand (%)</label>
          <input id="ep_slPct" type="number" step="0.1" value="${saved.slPct}"/>
        </div>
        <div style="min-width:180px;flex:1">
          <label>Risiko pro Trade (%)</label>
          <input id="ep_riskPct" type="number" step="0.1" value="${saved.riskPct}"/>
        </div>
        <div style="min-width:180px;flex:1">
          <label>Max Hebel</label>
          <input id="ep_maxLev" type="number" step="0.5" value="${saved.maxLev}"/>
        </div>
        <div style="min-width:170px">
          <button id="ep_calc">Berechnen</button>
        </div>
        <div style="min-width:160px">
          <button class="secondary" id="ep_save" ${isTotal?"disabled":""}>Speichern</button>
        </div>
      </div>

      <div class="hr"></div>

      <div id="ep_out" class="note">
        <b>Kapital:</b> ${fmt2(cap)} USDT<br/>
        Trage <b>Preis</b> + <b>Level</b> ein und klicke <b>Berechnen</b>.
      </div>
    `;

    host.appendChild(container);

    function calc(){
      const dir = document.getElementById("ep_dir").value;
      const mode = document.getElementById("ep_mode").value;
      const symbol = document.getElementById("ep_symbol").value.trim() || "Symbol";
      const price = Number(document.getElementById("ep_price").value);
      const level = Number(document.getElementById("ep_level").value);
      const slPct = Number(document.getElementById("ep_slPct").value);
      const riskPct = Number(document.getElementById("ep_riskPct").value);
      const maxLev = Number(document.getElementById("ep_maxLev").value);
      const alertPct = Number(document.getElementById("ep_alertPct").value);

      if (!Number.isFinite(price) || price <= 0) return {err:"Bitte aktuellen Preis eintragen."};
      if (!Number.isFinite(level) || level <= 0) return {err:"Bitte ein Level (Support/Resistance) eintragen."};
      if (!Number.isFinite(slPct) || slPct <= 0) return {err:"SL% fehlt."};
      if (!Number.isFinite(riskPct) || riskPct <= 0) return {err:"Risiko% fehlt."};
      if (!Number.isFinite(maxLev) || maxLev <= 0) return {err:"Max Hebel fehlt."};
      if (!Number.isFinite(alertPct) || alertPct <= 0) return {err:"Alert% fehlt."};

      // Entry logic:
      // breakout: level is the trigger line (enter on break+confirm)
      // pullback: level is the return zone
      const entry = level;

      // SL price based on entry and slPct
      let sl;
      if (dir === "Long") sl = entry * (1 - slPct/100);
      else sl = entry * (1 + slPct/100);

      // Risk $ per trade
      const riskDollars = cap * (riskPct/100);

      // Notional sizing approximation:
      // If price moves slPct against us, notional * slPct ≈ risk$
      const notional = riskDollars / (slPct/100);

      // Leverage pick:
      // We try to keep margin <= 60% of capital, but not exceed maxLev
      const targetMargin = cap * 0.60;
      let lev = notional > 0 ? (notional / Math.max(targetMargin, 1e-9)) : 1;
      lev = Math.max(1, Math.min(maxLev, lev));
      const margin = notional / lev;

      // Targets at 1R/2R/3R
      const R = Math.abs(entry - sl);
      const tp1 = dir==="Long" ? entry + 1*R : entry - 1*R;
      const tp2 = dir==="Long" ? entry + 2*R : entry - 2*R;
      const tp3 = dir==="Long" ? entry + 3*R : entry - 3*R;

      // Alerts around entry
      const band = entry * (alertPct/100);
      const alertLow = entry - band;
      const alertHigh = entry + band;

      const explain =
        (mode==="breakout")
          ? `Breakout: Du trägst das Break-Level ein. Entry wenn ${fmt(entry)} in Richtung ${dir} gebrochen + kurz bestätigt wird.`
          : `Pullback: Du trägst die Rücklauf-Zone ein. Entry nahe ${fmt(entry)} wenn Preis zurückkommt und wieder dreht.`;

      return {symbol, dir, mode, price, level, slPct, riskPct, maxLev, alertPct, entry, sl, tp1, tp2, tp3, riskDollars, notional, lev, margin, alertLow, alertHigh, explain};
    }

    function renderOut(res){
      const out = document.getElementById("ep_out");
      if (res.err){
        out.innerHTML = `<b>⚠️ ${CCC.utils.esc(res.err)}</b>`;
        return;
      }

      const marginPct = cap>0 ? (res.margin/cap)*100 : 0;
      const marginWarn = marginPct > 80;

      const marginTag = marginWarn
        ? `<span class="tag bad">Margin hoch</span> <span class="tiny">→ Risiko% runter, oder SL% größer, oder Hebel erhöhen (bis Max).</span>`
        : `<span class="tag good">Margin ok</span>`;

      // “What to do” plain language:
      let action;
      if(res.mode==="breakout"){
        action =
          `Warte bis der Preis das Level ${fmt(res.entry)} bricht. ` +
          `Wenn er kurz darüber/darunter bleibt (Bestätigung), dann Entry.`;
      }else{
        action =
          `Warte bis der Preis zur Zone ${fmt(res.entry)} zurückläuft. ` +
          `Wenn er dort wieder dreht, dann Entry.`;
      }

      out.innerHTML = `
        <b>${CCC.utils.esc(res.symbol)}</b> • <b>${CCC.utils.esc(res.dir)}</b> • <span class="tiny">${CCC.utils.esc(res.explain)}</span>

        <div class="hr"></div>

        <b>Was du jetzt machst:</b><br/>
        ${CCC.utils.esc(action)}<br/><br/>

        <b>Entry:</b> ${fmt(res.entry)}<br/>
        <b>Stop-Loss:</b> ${fmt(res.sl)} <span class="tiny">(SL ${fmt2(res.slPct)}%)</span><br/>
        <b>TP1:</b> ${fmt(res.tp1)} • <b>TP2:</b> ${fmt(res.tp2)} • <b>TP3:</b> ${fmt(res.tp3)}<br/>

        <div class="hr"></div>

        <b>Risiko ($):</b> ${fmt2(res.riskDollars)} <span class="tiny">(${fmt2(res.riskPct)}% vom Kapital)</span><br/>
        <b>Positionsgröße (Notional):</b> ${fmt2(res.notional)} USDT<br/>
        <b>Hebel (Auto ≤ Max):</b> ${fmt2(res.lev)}x <span class="tiny">(Max ${fmt2(res.maxLev)}x)</span><br/>
        <b>Benötigte Margin:</b> ${fmt2(res.margin)} USDT <span class="tiny">(${fmt2(marginPct)}%)</span><br/>
        ${marginTag}

        <div class="hr"></div>

        <b>Alert-Zone (wenn Kurs hier ist: aufmerksam werden):</b><br/>
        ${fmt(res.alertLow)} – ${fmt(res.alertHigh)}
      `;
    }

    document.getElementById("ep_calc").onclick = () => {
      renderOut(calc());
    };

    const saveBtn = document.getElementById("ep_save");
    if (saveBtn){
      saveBtn.onclick = () => {
        if (isTotal) return;
        const payload = {
          symbol: document.getElementById("ep_symbol").value.trim(),
          dir: document.getElementById("ep_dir").value,
          mode: document.getElementById("ep_mode").value,
          price: document.getElementById("ep_price").value,
          level: document.getElementById("ep_level").value,
          slPct: Number(document.getElementById("ep_slPct").value||0),
          riskPct: Number(document.getElementById("ep_riskPct").value||0),
          maxLev: Number(document.getElementById("ep_maxLev").value||0),
          alertPct: Number(document.getElementById("ep_alertPct").value||0.35),
        };
        jset(KEY(account), payload);
        alert("Entry Planner gespeichert ✅");
      };
    }
  }

  CCC.on("accountChanged", mount);
  CCC.on("render", mount);
  mount();
})();
