// plugins/entry-planner.js
(function(){
  function ready(fn){
    if(document.readyState === "complete" || document.readyState === "interactive") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function waitForCCC(cb){
    var tries = 0;
    (function tick(){
      tries++;
      if(window.CCC && typeof window.CCC.requestRender === "function") return cb();
      if(tries > 200) return console.log("[entry-planner] CCC not ready");
      setTimeout(tick, 25);
    })();
  }

  function el(tag, attrs, html){
    var n = document.createElement(tag);
    if(attrs){
      Object.keys(attrs).forEach(function(k){
        if(k === "class") n.className = attrs[k];
        else if(k === "style") n.setAttribute("style", attrs[k]);
        else n.setAttribute(k, attrs[k]);
      });
    }
    if(html != null) n.innerHTML = html;
    return n;
  }

  function ensureCard(){
    // wir hängen uns an die rechte Spalte an (2. card in .grid)
    var cards = document.querySelectorAll(".grid .card");
    if(!cards || cards.length < 2) return null;

    // zweite Card ist "RIGHT" (Chart/Journal/Extras)
    var right = cards[1];

    var existing = document.getElementById("entryPlannerCard");
    if(existing) return existing;

    var card = el("div", { class:"card", id:"entryPlannerCard", style:"margin-top:16px;" });

    card.innerHTML = `
      <h2>Entry Planner (10 Sekunden)</h2>
      <div class="note" style="margin-top:-4px">
        Schnell-Check: <b>Trend → Pullback → Trigger → SL/TP → Hebel</b>.  
        Du trägst nur 5 Werte ein – der Planner spuckt dir die Order-Box aus.
      </div>

      <div class="hr"></div>

      <div class="row">
        <div style="flex:1;min-width:150px">
          <label>Coin / Pair</label>
          <input id="ep_symbol" placeholder="z.B. DOGEUSDT" />
        </div>

        <div style="flex:1;min-width:150px">
          <label>Trend (5m)</label>
          <select id="ep_trend">
            <option value="down">Downtrend (Short bevorzugt)</option>
            <option value="up">Uptrend (Long bevorzugt)</option>
          </select>
        </div>

        <div style="flex:1;min-width:150px">
          <label>Entry Preis</label>
          <input id="ep_entry" type="number" step="0.0000001" placeholder="z.B. 0.0953" />
        </div>
      </div>

      <div class="row" style="margin-top:10px">
        <div style="flex:1;min-width:150px">
          <label>Stop-Loss %</label>
          <input id="ep_sl" type="number" step="0.1" placeholder="z.B. 6" />
          <div class="tiny">Aggro typ.: 6–8% • Safe typ.: 3–5%</div>
        </div>

        <div style="flex:1;min-width:150px">
          <label>Take-Profit %</label>
          <input id="ep_tp" type="number" step="0.1" placeholder="z.B. 15" />
          <div class="tiny">Aggro typ.: 15–22% • Safe typ.: 8–12%</div>
        </div>

        <div style="flex:1;min-width:150px">
          <label>Hebel</label>
          <input id="ep_lev" type="number" step="1" placeholder="z.B. 7" />
          <div class="tiny">Aggro max 10x • Safe max 5x</div>
        </div>

        <div style="min-width:160px">
          <button id="ep_calc">Plan berechnen</button>
        </div>
      </div>

      <div class="alert" id="ep_out" style="display:block;margin-top:12px"></div>

      <div class="hr"></div>

      <h2>Grafisch (so findest du’s in 10s)</h2>
      <div class="note">
        <b>1)</b> Trend (5m): Higher Highs = Up, Lower Lows = Down<br/>
        <b>2)</b> Pullback: Preis läuft zurück an die MAs / Struktur<br/>
        <b>3)</b> Trigger: kleiner Bruch → Entry<br/>
        <b>4)</b> SL hinter Struktur (z.B. letztes Swing High/Low)<br/>
        <b>5)</b> TP als nächstes Level / R:R ≥ 1.5
      </div>
    `;

    right.appendChild(card);
    return card;
  }

  function bind(){
    var btn = document.getElementById("ep_calc");
    if(!btn) return;

    btn.onclick = function(){
      var sym = (document.getElementById("ep_symbol").value || "").trim();
      var trend = document.getElementById("ep_trend").value;
      var entry = Number(document.getElementById("ep_entry").value);
      var slp = Number(document.getElementById("ep_sl").value);
      var tpp = Number(document.getElementById("ep_tp").value);
      var lev = Number(document.getElementById("ep_lev").value);

      var out = document.getElementById("ep_out");

      if(!sym || !isFinite(entry) || entry <= 0 || !isFinite(slp) || slp<=0 || !isFinite(tpp) || tpp<=0 || !isFinite(lev) || lev<=0){
        out.className = "alert show warn";
        out.innerHTML = "<b>⚠️ Bitte alle Felder korrekt ausfüllen.</b>";
        return;
      }

      // Long/Short Zielpreise
      var isShort = (trend === "down");
      var slPrice = isShort ? entry * (1 + slp/100) : entry * (1 - slp/100);
      var tpPrice = isShort ? entry * (1 - tpp/100) : entry * (1 + tpp/100);

      // grobe “Bewegung” die du brauchst (nur Erklärung)
      var needMove = (slp/lev);

      out.className = "alert show good";
      out.innerHTML = `
        <b>✅ Plan (${isShort ? "SHORT" : "LONG"})</b><br/>
        <div class="tiny">Pair:</div> <b>${sym}</b><br/>
        <div class="tiny">Entry:</div> <b>${entry}</b><br/>
        <div class="tiny">Stop-Loss (${slp}%):</div> <b>${slPrice}</b><br/>
        <div class="tiny">Take-Profit (${tpp}%):</div> <b>${tpPrice}</b><br/>
        <div class="tiny">Hebel:</div> <b>${lev}x</b><br/>
        <div class="hr"></div>
        <b>Mini-Erklärung:</b><br/>
        Bei ${lev}x entspricht ein SL von ${slp}% ungefähr ~<b>${needMove.toFixed(2)}%</b> Bewegung im Kurs gegen dich, bis Liquidation-Risiko näher kommt (je nach Börse/Margin).  
        Deshalb: SL strikt setzen, nicht “hoffen”.
      `;
    };
  }

  ready(function(){
    waitForCCC(function(){
      ensureCard();
      bind();
      // falls deine App render hooks hat:
      try{ window.CCC.requestRender(); }catch(e){}
      console.log("[entry-planner] ready");
    });
  });
})();
