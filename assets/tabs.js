// ===== Manejo de Tabs =====
document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab");
  const contents = document.querySelectorAll(".tab-content");

  function activateTab(index) {
    // Quitar clase activa de todos
    tabs.forEach(tab => tab.classList.remove("active"));
    contents.forEach(c => c.classList.remove("active"));

    // Activar el tab clickeado y su contenido
    tabs[index].classList.add("active");
    contents[index].classList.add("active");
  }

  // Asignar evento de click a cada tab
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => activateTab(i));
  });

  // Activar el primer tab al inicio
  if (tabs.length > 0) {
    activateTab(0);
  }
});

