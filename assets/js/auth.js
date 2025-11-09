(function(){
  const metaApi = document.querySelector('meta[name="api-base"]')?.content || 'backend/api/index.php';
  const clientMetas = Array.from(document.querySelectorAll('meta[name="google-client-id"]'));
  const clientId = (clientMetas.reverse().find(m => (m.getAttribute('content')||'').trim().length > 0)?.getAttribute('content') || '').trim();

  function setAuthBlocked(blocked, message){
    const body = document.body;
    if (blocked) body.classList.add('auth-block'); else body.classList.remove('auth-block');
    const panel = document.getElementById('authPanel');
    if (panel) panel.style.display = blocked ? 'block' : 'none';
    const msg = document.getElementById('authMessage');
    if (msg && message) msg.textContent = message; else if (msg) msg.textContent = '';
  }

  async function authStatus(){
    try{
      const res = await fetch(`${metaApi}?action=auth_status`,{credentials:'include'});
      const data = await res.json();
      // Toggle menu auth items if present
      try {
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) logoutLink.style.display = (data && data.authenticated) ? '' : 'none';
      } catch(_) {}
      const force = new URLSearchParams(location.search).has('signin') || new URLSearchParams(location.hash.slice(1)).has('signin');
      if (force) { setAuthBlocked(true, 'Sign in with your college Gmail to continue.'); return { authenticated:false, forced:true }; }
      if (!data.authenticated) { setAuthBlocked(true, 'Sign in with your college Gmail to continue.'); return { authenticated:false }; }
      if (!data.user?.approved){ setAuthBlocked(true, 'Your account is pending approval. Please check back later.'); return { authenticated:false, pending:true }; }
      setAuthBlocked(false);
      return { authenticated:true, user:data.user };
    }catch(e){ console.warn('auth_status failed', e); setAuthBlocked(true, 'Unable to check login.'); return { authenticated:false }; }
  }

  window.ensureApproved = authStatus;

  function loadGIS(){
    const msg = document.getElementById('authMessage');
    if (!clientId) { if (msg) msg.textContent = 'Google Client ID missing. Set meta[name="google-client-id"] and backend google_client_id.'; return; }
    const btn = document.getElementById('googleButton');
    if (!btn) return;
    /* global google */
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
      if (msg) msg.textContent = 'Google script did not load. Check network/ad-blockers and allowed origins in Google Cloud.';
      return;
    }
    google.accounts.id.initialize({
      client_id: clientId,
      callback: async (resp)=>{
        try{
          const r = await fetch(`${metaApi}?action=auth_login_google`,{
            method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
            body: JSON.stringify({ id_token: resp.credential })
          });
          const data = await r.json();
          if (data?.user?.approved){ setAuthBlocked(false); location.reload(); }
          else { setAuthBlocked(true, 'Signed in. Waiting for approval by admin.'); }
        }catch(e){ setAuthBlocked(true, 'Login failed. Try again.'); }
      }
    });
    google.accounts.id.renderButton(btn, { theme:'filled_blue', size:'large', shape:'pill', text:'continue_with' });
  }

  function injectGIS(){
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; s.defer = true; s.onload = loadGIS; 
    s.onerror = () => {
      const msg = document.getElementById('authMessage');
      if (msg) msg.textContent = 'Failed to load Google sign-in. Check your internet and CSP.';
    };
    document.head.appendChild(s);
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    ensureApproved();
    // Logout wiring (deploy)
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
      logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        try { await fetch(`${metaApi}?action=auth_logout`, { credentials: 'include' }); } catch(_) {}
        try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect?.(); } catch(_) {}
        location.href = 'index.html';
      });
    }
    injectGIS();
    console.log('[auth] api-base=', metaApi, 'clientId meta=', clientId ? clientId.slice(0,8)+'…' : '(none)');
  });
})();
