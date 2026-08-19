/* ═══ SIDEBAR / BOTTOM NAV COMPONENT ═══
   renderSidebar(target, role, activePage)
   Desktop (≥900px): permanent left sidebar.
   Mobile: fixed bottom nav, same items.
*/
const NAV_ITEMS = {
  donor: [
    { page:'donor',       icon:'🏠', label:'Home',   href:'donor.html' },
    { page:'history',     icon:'📋', label:'History', href:'history.html' },
    { page:'leaderboard', icon:'🏆', label:'Ranks',  href:'leaderboard.html' },
    { page:'rewards',     icon:'🎁', label:'Rewards', href:'rewards.html' },
    { page:'profile',     icon:'👤', label:'Profile', href:'profile.html' }
  ],
  hospital: [
    { page:'hospital', icon:'🏥', label:'Dashboard', href:'hospital.html' },
    { page:'profile',  icon:'👤', label:'Profile',   href:'profile.html' }
  ],
  admin: [
    { page:'admin',   icon:'📊', label:'Dashboard', href:'admin.html' }
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
      <div class="app-sidebar-brand">🩸 <span>Jeevan Mitra</span></div>
      <nav class="app-sidebar-nav">
        ${items.map(i => `
          <a href="${i.href}" class="app-sidebar-link ${i.page===activePage?'active':''}">
            <span class="icon">${i.icon}</span><span>${i.label}</span>
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
          <span class="icon">${i.icon}</span><span>${i.label}</span>
        </a>`).join('')}
    </nav>`;
}
