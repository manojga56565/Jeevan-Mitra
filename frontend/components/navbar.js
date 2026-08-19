/* ═══ NAVBAR COMPONENT ═══
   renderNavbar(target, { variant: 'public'|'app', title, user }) */
function renderNavbar(targetId, opts={}){
  const el = document.getElementById(targetId);
  if(!el) return;

  if(opts.variant === 'app'){
    el.innerHTML = `
      <div class="app-navbar">
        <button class="app-navbar-menu" onclick="document.body.classList.toggle('sidebar-open')" aria-label="Menu">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2 5h16M2 10h16M2 15h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
        <div class="app-navbar-title">${opts.title||''}</div>
        <div class="app-navbar-user">${(opts.user?.name||opts.user?.hospitalName||'?').charAt(0).toUpperCase()}</div>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="public-navbar">
        <a href="index.html" class="public-navbar-brand">🩸 Jeevan Mitra</a>
        <div class="public-navbar-links">
          <a href="index.html#how-it-works">How it works</a>
          <a href="index.html#faq">FAQ</a>
        </div>
      </div>`;
  }
}
