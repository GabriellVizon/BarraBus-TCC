(function () {
  var STORAGE_KEY = 'busTheme';

  var LOGO_DARK = 'img/realista-point.png';
  var LOGO_LIGHT = 'img/realista-point.modoclaro.png';

  function getTheme() {
    try { return localStorage.getItem(STORAGE_KEY) || 'dark'; }
    catch (e) { return 'dark'; }
  }

  function applyLogo(theme) {
    var img = document.querySelector('.sidebar-logo-icon img');
    if (img) img.src = theme === 'light' ? LOGO_LIGHT : LOGO_DARK;
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
    var btn = document.getElementById('themeToggle');
    if (btn) {
      var icon = btn.querySelector('i');
      if (icon) {
        icon.className = theme === 'light' ? 'ti ti-moon' : 'ti ti-sun';
      }
      btn.setAttribute('aria-label', theme === 'light' ? 'Modo escuro' : 'Modo claro');
    }
    applyLogo(theme);
  }

  function toggle() {
    var current = getTheme();
    setTheme(current === 'light' ? 'dark' : 'light');
  }

  document.addEventListener('DOMContentLoaded', function () {
    setTheme(getTheme());
    var btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', toggle);
  });
})();
