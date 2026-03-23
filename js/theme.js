(function () {
  const key = "theme";

  function getInitialTheme() {
    const saved = localStorage.getItem(key);
    return saved === "light" ? "light" : "dark";;
  }

  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(key, theme);

    //if (window.rethemeAllCharts) window.rethemeAllCharts();
    // update button icon (sun when light, moon when dark)
    const btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = theme === "light" ? "☀️" : "🌙";

    // if you later add chart re-theming:
    if (window.rethemeAllCharts) window.rethemeAllCharts();
  }

  // Apply immediately (no flash)
  apply(getInitialTheme());

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("themeToggle");
    if (!btn) return;

    // ensure correct icon after DOM is ready
    btn.textContent = (document.documentElement.dataset.theme === "light") ? "☀️" : "🌙";

    btn.addEventListener("click", () => {
      const cur = document.documentElement.dataset.theme;
      apply(cur === "light" ? "dark" : "light");
    });
  });
})();
