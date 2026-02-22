// plugins/trades-journal.js
(() => {
  const PREFIX = "ccc_trades_v1";

  function key(ctx){
    return ctx.storage.keyFor(PREFIX, ctx.account);
  }

  function load(ctx){
    const acc = ctx.account;
    if(acc==="total") return [];
    return ctx.storage.getJSON(key(ctx), []);
  }

  function save(ctx, arr){
    const acc = ctx.account;
    if(acc==="total") return;
    ctx.storage.setJSON(key(ctx), arr);
  }

  function render(root, ctx){
    const acc = ctx.account;
    const isTotal = acc==="total";

    const wrap = document.createElement("div");
    wrap.className = "card";
    wrap.style.boxShadow = "none";
    wrap.style.padding = "12px";

    const trades = isTotal ? [] : load(ctx);

    wrap.innerHTML = `
      <h2 style="margin:0 0 8px 0;">Trade Journal PRO</h2>
      <div class="mini">Trades getrennt pro Account. Gesamt = nur Anzeige.</div>

      <div class="hr"></div>

      <div class="row">
        <div style="flex:1;min-width:140px">
          <label>Symbol</label>
          <input id="tjSym" placeholder="DOGEUSDT" ${isTotal?"disabled":""}/>
        </div>
        <div style="flex:1;min-width:140px">
          <label>Direction</label>
          <select id="tjDir" ${isTotal?"disabled":""}>
            <option value="LONG">LONG</option>
            <option value="SHORT">SHORT</option>
          </select>
        </div>
        <div style="flex:1;min-width:140px">
          <label>Leverage</label>
          <input id="tjLev" type="number" step="1" value="${acc==="aggro"?10:5}" ${isTotal?"disabled":""}/>
        </div>
      </div>

      <div class="row" style="margin-top:10px">
        <div style="flex:1;min-width:140px">
          <label>Size ($ Notional)</label>
          <input id="tjSize" type="number" step="0.01" placeholder="z.B. 80" ${isTotal?"disabled":""}/>
        </div>
        <div style="flex:1;min-width:140px">
          <label>Entry (optional)</label>
          <input id="tjEntry" type="number" step="0.0001" placeholder="0.0841" ${isTotal?"disabled":""}/>
        </div>
        <div style="flex:1;min-width:140px">
          <label>SL% / TP%</label>
          <input id="tjSltp" placeholder="SL6 TP15" ${isTotal?"disabled":""}/>
        </div>
      </div>

      <div class="row" style="margin-top:10px">
        <div style="flex:1;min-width:140px">
          <label>Setup Tag</label>
          <select id="tjSetup" ${isTotal?"disabled":""}>
            <option value="Trend">Trend</option>
            <option value="Breakout">Breakout</option>
            <option value="Reversal">Reversal</option>
            <option value="Range">Range</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div style="flex:2;min-width:220px">
          <label>Notiz</label>
          <input id="tjNote" placeholder="Pullback + Rejection" ${isTotal?"disabled":""}/>
        </div>
        <div style="min-width:160px">
          <button id="tjAdd" ${isTotal?"disabled":""}>Trade hinzufügen</button>
        </div>
      </div>

      <div class="hr"></div>

      <div class="miniRow">
        <span class="pill">Trades: <b id="tjCount">${trades.length}</b></span>
        <span class="pill">Open: <b id="tjOpen">${trades.filter(t=>t.status==="OPEN").length}</b></span>
        <span class="pill">Closed: <b id="tjClosed">${trades.filter(t=>t.status==="CLOSED").length}</b></span>
      </div>

      <div style="max-height:240px; overflow:auto; margin-top:10px">
        <table>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Symbol</th>
              <th>Dir</th>
              <th class="right">Size</th>
              <th>Status</th>
              <th class="right">PnL$</th>
              <th class="right">R</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody id="tjBody"></tbody>
        </table>
      </div>
    `;
    root.appendChild(wrap);

    function rowHtml(t, idx){
      const pnl = Number(t.pnlUsd||0);
      const r = Number(t.r||0);
      const badge = t.status==="OPEN" ? "warn" : (pnl>=0 ? "good" : "bad");
      return `
        <tr>
          <td>${ctx.esc(t.ts)}</td>
          <td><b>${ctx.esc(t.symbol)}</b><div class="tiny">${ctx.esc(t.setup||"")}</div></td>
          <td>${ctx.esc(t.dir)}</td>
          <td class="right">${ctx.fmt(Number(t.sizeUsd||0))}<div class="tiny">${ctx.esc(String(t.lev||""))}x</div></td>
          <td><span class="tag ${badge}">${t.status}</span></td>
          <td class="right">${t.status==="OPEN" ? "—" : ctx.fmt(pnl)}</td>
          <td class="right">${t.status==="OPEN" ? "—" : r.toFixed(2)}</td>
          <td>
            ${t.status==="OPEN"
              ? `<button class="secondary" data-close="${idx}" style="padding:6px 10px">Close</button>
                 <button class="danger" data-del="${idx}" style="padding:6px 10px;margin-left:6px">Del</button>`
              : `<button class="danger" data-del="${idx}" style="padding:6px 10px">Del</button>`
            }
          </td>
        </tr>
      `;
    }

    function draw(){
      const body = wrap.querySelector("#tjBody");
      body.innerHTML = "";
      const cur = load(ctx);
      wrap.querySelector("#tjCount").textContent = cur.length;
      wrap.querySelector("#tjOpen").textContent = cur.filter(t=>t.status==="OPEN").length;
      wrap.querySelector("#tjClosed").textContent = cur.filter(t=>t.status==="CLOSED").length;

      cur.slice().reverse().forEach((t, revIdx)=>{
        const idx = cur.length - 1 - revIdx;
        const tr = document.createElement("tr");
        tr.innerHTML = rowHtml(t, idx);
        body.appendChild(tr);
      });

      body.querySelectorAll("button[data-del]").forEach(b=>{
        b.addEventListener("click", ()=>{
          const i = Number(b.getAttribute("data-del"));
          const arr = load(ctx);
          arr.splice(i,1);
          save(ctx, arr);
          draw();
          window.CCC?.requestRender?.();
        });
      });

      body.querySelectorAll("button[data-close]").forEach(b=>{
        b.addEventListener("click", ()=>{
          const i = Number(b.getAttribute("data-close"));
          const arr = load(ctx);
          const t = arr[i];
          if(!t) return;
          const pnlStr = prompt("PnL in $ (z.B. 4.25 oder -3.10):", "0");
          if(pnlStr===null) return;
          const pnl = Number(pnlStr);
          if(!isFinite(pnl)) return alert("Ungültige Zahl.");

          // R = pnl / riskUsd; if riskUsd unknown, approximate from size and sl% if provided (optional)
          let riskUsd = Number(t.riskUsd||0);
          if(!riskUsd || riskUsd<=0){
            // fallback: assume 2% risk on account capital at time of close (rough)
            riskUsd = Math.max(0.01, ctx.capital * 0.02);
          }
          t.status = "CLOSED";
          t.pnlUsd = pnl;
          t.r = pnl / riskUsd;
          t.closedTs = window.CCC?.nowStamp?.() || t.ts;

          arr[i] = t;
          save(ctx, arr);
          draw();
          window.CCC?.requestRender?.();
        });
      });
    }

    if(!isTotal){
      wrap.querySelector("#tjAdd").addEventListener("click", ()=>{
        const symbol = (wrap.querySelector("#tjSym").value || "").trim().toUpperCase();
        const dir = wrap.querySelector("#tjDir").value;
        const lev = Number(wrap.querySelector("#tjLev").value || 0);
        const sizeUsd = Number(wrap.querySelector("#tjSize").value || 0);
        const entry = Number(wrap.querySelector("#tjEntry").value || 0);
        const sltp = (wrap.querySelector("#tjSltp").value || "").trim();
        const setup = wrap.querySelector("#tjSetup").value;
        const note = (wrap.querySelector("#tjNote").value || "").trim();

        if(!symbol) return alert("Symbol fehlt.");
        if(!isFinite(sizeUsd) || sizeUsd<=0) return alert("Size ($) fehlt/ungültig.");
        if(!isFinite(lev) || lev<=0) return alert("Leverage ungültig.");

        const arr = load(ctx);
        arr.push({
          ts: window.CCC?.nowStamp?.() || new Date().toISOString(),
          symbol, dir, lev,
          sizeUsd,
          entry: isFinite(entry) && entry>0 ? entry : null,
          sltp, setup, note,
          status:"OPEN",
          pnlUsd: null,
          r: null
        });
        save(ctx, arr);

        // clear
        wrap.querySelector("#tjSym").value = "";
        wrap.querySelector("#tjSize").value = "";
        wrap.querySelector("#tjEntry").value = "";
        wrap.querySelector("#tjSltp").value = "";
        wrap.querySelector("#tjNote").value = "";

        draw();
        window.CCC?.requestRender?.();
      });
    }

    draw();
  }

  window.CCC?.registerPanel({ id:"trades", title:"Trades", render });
  console.log("CCC trades-journal ✅");
})();
