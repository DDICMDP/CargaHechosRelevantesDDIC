// Tabs mínimos
document.addEventListener("DOMContentLoaded", ()=>{
  document.querySelectorAll("[data-tabs]").forEach(root=>{
    const buttons = root.querySelectorAll(".tab");
    const panels  = root.querySelectorAll(".tab-panel");
    buttons.forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-tab");
        buttons.forEach(b=>b.classList.remove("is-active"));
        panels.forEach(p=>p.classList.remove("is-active"));
        btn.classList.add("is-active");
        root.querySelector("#"+id)?.classList.add("is-active");
      });
    });
  });
});
