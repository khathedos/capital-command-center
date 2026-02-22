// plugins/safearea.js
(() => {
  if (document.getElementById("ccc-safe-area-style")) return;

  const style = document.createElement("style");
  style.id = "ccc-safe-area-style";
  style.textContent = `
    body{ padding-top: env(safe-area-inset-top); }
    body::before{
      content:"";
      position: fixed;
      top: 0; left: 0; right: 0;
      height: env(safe-area-inset-top);
      background: rgba(10,16,28,.72);
      backdrop-filter: blur(10px);
      z-index: 99998;
      pointer-events: none;
      border-bottom: 1px solid rgba(255,255,255,.06);
    }
  `;
  document.head.appendChild(style);

  console.log("CCC Plugin safearea ✅");
})();
