document.addEventListener("DOMContentLoaded", ()=>{
  document.querySelectorAll("[data-tabs]").forEach(root=>{
    const btns = root.querySelectorAll(".tabs-nav .tab");
    const show = id=>{
      root.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("is-active"));
      root.querySelectorAll(".tabs-nav .tab").forEach(b=>b.classList.remove("is-active"));
      root.querySelector(`#${id}`)?.classList.add("is-active");
      root.querySelector(`.tabs-nav .tab[data-tab="${id}"]`)?.classList.add("is-active");
    };
    btns.forEach(b=> b.addEventListener("click", ()=> show(b.dataset.tab)));
  });
});

