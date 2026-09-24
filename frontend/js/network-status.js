(() => {
  const banner = document.createElement("div");
  banner.className = "network-status";
  banner.setAttribute("role", "status");
  banner.setAttribute("aria-live", "polite");
  banner.textContent = "You are offline. Some Tinaab features may be unavailable.";
  document.body.appendChild(banner);

  const update = () => {
    const offline = !navigator.onLine;
    banner.classList.toggle("is-visible", offline);
    banner.classList.toggle("is-online", !offline);
    if (!offline) {
      banner.textContent = "Back online.";
      window.setTimeout(() => {
        if (navigator.onLine) banner.classList.remove("is-visible");
      }, 1800);
    } else {
      banner.textContent = "You are offline. Some Tinaab features may be unavailable.";
    }
  };

  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
})();
