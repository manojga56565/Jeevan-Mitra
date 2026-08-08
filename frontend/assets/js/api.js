/* ═══ API CLIENT ═══
   Single source of truth for talking to the backend. Update API_BASE for
   your deployment.
*/
const API_BASE = (window.API_BASE_URL && window.API_BASE_URL.trim()) || 'http://localhost:5000/api';

const AUTH_ENDPOINTS = [
  '/auth/donor/send-otp', '/auth/donor/verify-otp',
  '/auth/hospital/login', '/auth/admin/login',
  '/auth/forgot-password', '/auth/reset-password'
];

function getToken(){ return localStorage.getItem('jm_token') || sessionStorage.getItem('jm_token'); }
function getRole(){ return localStorage.getItem('jm_role') || sessionStorage.getItem('jm_role'); }
function getUser(){
  const raw = localStorage.getItem('jm_user') || sessionStorage.getItem('jm_user');
  try{ return raw ? JSON.parse(raw) : null; }catch(e){ return null; }
}

function setSession(token, role, user, remember=true){
  const store = remember ? localStorage : sessionStorage;
  store.setItem('jm_token', token);
  store.setItem('jm_role', role);
  store.setItem('jm_user', JSON.stringify(user));
}

function clearSession(){
  localStorage.removeItem('jm_token'); localStorage.removeItem('jm_role'); localStorage.removeItem('jm_user');
  sessionStorage.removeItem('jm_token'); sessionStorage.removeItem('jm_role'); sessionStorage.removeItem('jm_user');
}

function isTokenExpired(token){
  try{
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp && Date.now() >= payload.exp * 1000;
  }catch(e){ return false; }
}

/**
 * Core request function. On a 401 from a PROTECTED endpoint (not a login
 * attempt), clears the session and redirects to the landing page — but
 * never on a login/OTP call, where a 401 just means wrong credentials.
 */
async function api(endpoint, method='GET', body=null){
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if(token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if(body) opts.body = JSON.stringify(body);

  let res;
  try{
    res = await fetch(`${API_BASE}${endpoint}`, opts);
  }catch(networkErr){
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }

  if(res.status === 401){
    if(AUTH_ENDPOINTS.includes(endpoint)){
      const d = await res.json().catch(()=>({}));
      throw new Error(d.message || 'Invalid credentials');
    }
    clearSession();
    if(!window.__silentAuthCheck){
      showToast('Session expired — please log in again', 'warning');
      window.location.href = resolveRootPath('index.html');
    }
    throw new Error('Session expired');
  }

  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

function resolveRootPath(target){
  // pages/*.html need to go up one level to reach index.html at the root
  return window.location.pathname.includes('/pages/') ? `../${target}` : target;
}

/**
 * Call at the top of every protected page. Validates the token against the
 * server BEFORE rendering anything gated — avoids the old bug where a page
 * would flash real content, then yank the user back out a few seconds later.
 */
async function requireAuth(requiredRole){
  const token = getToken();
  const role = getRole();

  if(!token || !role || (requiredRole && role !== requiredRole)){
    window.location.href = resolveRootPath('index.html');
    return null;
  }
  if(isTokenExpired(token)){
    clearSession();
    window.location.href = resolveRootPath('index.html');
    return null;
  }

  window.__silentAuthCheck = true;
  try{
    const validateEp = { donor: '/donors/profile', hospital: '/hospitals/profile', admin: '/admin/stats' }[role];
    await api(validateEp);
    window.__silentAuthCheck = false;
    return getUser();
  }catch(e){
    window.__silentAuthCheck = false;
    clearSession();
    window.location.href = resolveRootPath('index.html');
    return null;
  }
}

function logout(){
  clearSession();
  window.location.href = resolveRootPath('index.html');
}
