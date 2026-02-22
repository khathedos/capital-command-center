(function(){

/* ===============================
   ACCOUNT DEFINITIONS
=================================*/

const ACCOUNTS = [
  {
    id: "aggro",
    name: "Aggro",
    hint: "High risk / high reward",
    strategy: `
      <b>Aggro-Profil:</b><br>
      • Max 1 Position gleichzeitig<br>
      • Hebel ≤ 10x<br>
      • SL 6–8% | TP 18–22%<br>
      • Max 2 Verlustzyklen<br>
      • Kill-Switch strikt beachten
    `
  },
  {
    id: "safe",
    name: "Safe-Build",
    hint: "Stabil aufbauen",
    strategy: `
      <b>Safe-Profil:</b><br>
      • Max 1 Position gleichzeitig<br>
      • Hebel ≤ 5x<br>
      • SL 3–5% | TP 8–12%<br>
      • Max 3 Trades pro Tag<br>
      • Fokus Kapitalerhalt
    `
  }
];


/* ===============================
   STORAGE
=================================*/

function getCurrentAccount(){
  return localStorage.getItem("ccc_active_account") || "aggro";
}

function setCurrentAccount(id){
  localStorage.setItem("ccc_active_account", id);
}

function getCapital(account){
  return Number(localStorage.getItem("ccc_capital_"+account) || 0);
}

function setCapital(account, value){
  localStorage.setItem("ccc_capital_"+account, value);
}


/* ===============================
   UI BUILD
=================================*/

function mountTopUI(){

  if(document.getElementById("ccc-account-wrapper")) return;

  const header = document.querySelector("header");
  if(!header) return;

  const wrapper = document.createElement("div");
  wrapper.id = "ccc-account-wrapper";
  wrapper.style.marginTop = "10px";
  wrapper.style.padding = "10px";
  wrapper.style.borderRadius = "14px";
  wrapper.style.background = "rgba(17,27,46,.55)";
  wrapper.style.border = "1px solid rgba(255,255,255,.08)";
  wrapper.style.backdropFilter = "blur(10px)";

  wrapper.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
      
      <div style="display:flex;gap:8px;align-items:center;">
        <span style="font-size:12px;font-weight:900;">Account:</span>
        <select id="cccAccountSelect" style="
          border-radius:999px;
          padding:6px 12px;
          font-weight:900;
          border:1px solid rgba(255,255,255,.15);
          background:rgba(13,21,36,.7);
          color:#fff;">
          ${ACCOUNTS.map(a=>`<option value="${a.id}">${a.name}</option>`).join("")}
        </select>
      </div>

      <button id="cccToggleStrategy" style="
        font-size:12px;
        padding:6px 12px;
        border-radius:999px;
        border:1px solid rgba(255,255,255,.15);
        background:rgba(13,21,36,.6);
        color:#9fb3ff;
        cursor:pointer;">
        Strategie anzeigen
      </button>

    </div>

    <div id="cccStrategyBox" style="
      margin-top:10px;
      font-size:13px;
      line-height:1.5;
      color:#dbe6ff;
      display:none;">
    </div>
  `;

  header.appendChild(wrapper);

  initEvents();
  updateUI();
}


/* ===============================
   EVENTS
=================================*/

function initEvents(){

  const select = document.getElementById("cccAccountSelect");
  const toggle = document.getElementById("cccToggleStrategy");

  if(!select) return;

  select.value = getCurrentAccount();

  select.addEventListener("change", function(){
    setCurrentAccount(this.value);
    updateUI();
  });

  toggle.addEventListener("click", function(){
    const box = document.getElementById("cccStrategyBox");
    if(box.style.display === "none"){
      box.style.display = "block";
      this.innerText = "Strategie minimieren";
    } else {
      box.style.display = "none";
      this.innerText = "Strategie anzeigen";
    }
  });
}


/* ===============================
   UPDATE
=================================*/

function updateUI(){

  const current = getCurrentAccount();
  const acc = ACCOUNTS.find(a=>a.id===current);
  if(!acc) return;

  const strategyBox = document.getElementById("cccStrategyBox");
  if(strategyBox){
    strategyBox.innerHTML = acc.strategy;
  }

  // Optional: Kapital automatisch laden
  const capitalInput = document.querySelector("input[type='number']");
  if(capitalInput){
    capitalInput.value = getCapital(current);
  }

}


/* ===============================
   AUTO SAVE HOOK
=================================*/

function hookSave(){

  const btn = document.querySelector("button");
  if(!btn) return;

  btn.addEventListener("click", function(){

    const current = getCurrentAccount();
    const capitalInput = document.querySelector("input[type='number']");
    if(!capitalInput) return;

    setCapital(current, capitalInput.value);
  });
}


/* ===============================
   BOOT
=================================*/

setTimeout(()=>{
  mountTopUI();
  hookSave();
}, 500);

})();
