/* SIDEBAR / BOTTOM NAV COMPONENT */
const NAV_ITEMS = {
  donor: [
    { page:'donor', icon:'home', label:'Home', href:'donor.html' },
    { page:'history', icon:'history', label:'History', href:'history.html' },
    { page:'leaderboard', icon:'trophy', label:'Ranks', href:'leaderboard.html' },
    { page:'rewards', icon:'trophy', label:'Rewards', href:'rewards.html' },
    { page:'profile', icon:'user', label:'Profile', href:'profile.html' }
  ],
  hospital: [
    { page:'hospital', icon:'hospital', label:'Dashboard', href:'hospital.html' },
    { page:'profile', icon:'user', label:'Profile', href:'profile.html' }
  ],
  admin: [
    { page:'admin', icon:'home', label:'Dashboard', href:'admin.html' }
  ]
};

function renderSidebar(targetId, role, activePage){
  const el = document.getElementById(targetId);
  if(!el) return;
  const items = NAV_ITEMS[role] || [];
  const user = getUser();
  const displayName = user?.name || user?.hospitalName || (role==='admin' ? 'Administrator' : 'Account');

  el.innerHTML = `
    <aside class="app-sidebar">
      <div class="app-sidebar-brand"><span class="brand-mark icon-only">${JMIcon('hospital',18)}</span><span>Jeevan Mitra</span></div>
      <nav class="app-sidebar-nav">
        ${items.map(i => `
          <a href="${i.href}" class="app-sidebar-link ${i.page===activePage?'active':''}">
            <span class="icon icon-only">${JMIcon(i.icon,18)}</span><span>${i.label}</span>
          </a>`).join('')}
      </nav>
      <div class="app-sidebar-footer">
        <div class="app-sidebar-user">
          <div class="avatar">${displayName.charAt(0).toUpperCase()}</div>
          <div class="name">${displayName}</div>
        </div>
        <button class="btn btn-ghost btn-sm btn-block" onclick="logout()">Log out</button>
      </div>
    </aside>
    <nav class="app-bottomnav">
      ${items.map(i => `
        <a href="${i.href}" class="app-bottomnav-link ${i.page===activePage?'active':''}">
          <span class="icon icon-only">${JMIcon(i.icon,18)}</span><span>${i.label}</span>
        </a>`).join('')}
    </nav>`;
}