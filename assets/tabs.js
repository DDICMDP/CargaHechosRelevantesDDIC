(function(){
  document.addEventListener("DOMContentLoaded", ()=>{
    document.querySelectorAll("[data-tabs]").forEach(root=>{
      const nav = root.querySelector(".tabs-nav");
      const panels = root.querySelectorAll(".tab-panel");
      const setActive = (id)=>{
        root.querySelectorAll(".tab").forEach(b=> b.classList.toggle("is-active", b.dataset.tab===id));
        panels.forEach(p=> p.classList.toggle("is-active", p.id===id));
      };
      nav.querySelectorAll(".tab").forEach(btn=>{
        btn.addEventListener("click", ()=> setActive(btn.dataset.tab));
      });
      const first = nav.querySelector(".tab")?.dataset.tab;
      if(first) setActive(first);
    });
  });
})();

