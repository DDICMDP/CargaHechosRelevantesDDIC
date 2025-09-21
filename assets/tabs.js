document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab");
  const contents = document.querySelectorAll(".tab-content");

  function clearActive(){
    tabs.forEach(t => t.classList.remove("active"));
    contents.forEach(c => c.classList.remove("active"));
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.target;
      clearActive();
      tab.classList.add("active");
      document.getElementById(target)?.classList.add("active");
    });
  });

  // Primer tab activo
  if (tabs.length) tabs[0].classList.add("active");
  if (contents.length) contents[0].classList.add("active");
});
