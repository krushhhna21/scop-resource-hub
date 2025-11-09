(function(){
  let metaApi = document.querySelector('meta[name="api-base"]')?.content || 'api/index.php';
  let traceMode = false;
  try {
    const qp = new URLSearchParams(window.location.search);
    if (qp.get('lite') === '1') {
      metaApi += (metaApi.includes('?') ? '&' : '?') + 'lite=1';
    }
    if (qp.get('trace') === '1') {
      metaApi += (metaApi.includes('?') ? '&' : '?') + 'trace=1';
      traceMode = true;
    }
  } catch(_) {}
  const clientId = (document.querySelector('meta[name="google-client-id"]')?.content || '').trim();
  const msg = document.getElementById('loginMessage');
  const card = document.querySelector('.login-card');
  const nameInput = document.getElementById('nameInput');
  const courseInput = document.getElementById('courseInput');
  const yearInput = document.getElementById('yearInput');
  const emailDisplay = document.getElementById('emailDisplay');
  const continueBtn = document.getElementById('continueBtn');

  let lastCredential = null;
  let lastEmail = null;
  let lastName = null;
  let popupInProgress = false;

  // Popup fallback: if GSI credential not delivered we open an OAuth implicit flow
  function openOAuthPopup(){
    if (popupInProgress) return;
    popupInProgress = true;
    setMessage('Opening Google sign-in popup…');
    const redirectUri = window.location.origin + '/backend/api/google_oauth_callback.php';
    // Scope minimal: openid email profile
    const url = 'https://accounts.google.com/o/oauth2/v2/auth?'+ new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'id_token',
      scope: 'openid email profile',
      prompt: 'select_account',
      nonce: Math.random().toString(36).slice(2)
    }).toString();
    const w = window.open(url, 'gsi_oauth_popup', 'width=500,height=600');
    if (!w) {
      setMessage('Popup blocked. Please allow popups for this site.');
      popupInProgress = false;
    }
  }

  window.addEventListener('message', (ev)=>{
    if (!ev.data || ev.data.type !== 'oauth_result') return;
    popupInProgress = false;
    if (!ev.data.ok){
      setMessage('Popup sign-in failed: ' + (ev.data.error || 'unknown error'));
      return;
    }
    if (ev.data.id_token){
      lastCredential = ev.data.id_token;
      try {
        const p = lastCredential.split('.')[1];
        const payload = JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/')));
        lastEmail = payload.email || null;
        lastName = payload.name || payload.given_name || null;
        if (emailDisplay) emailDisplay.value = lastEmail || '';
        if (lastName && nameInput && !nameInput.value) nameInput.value = lastName;
        setMessage('Google verified via popup. Complete your details and press Continue.');
      } catch(_){
        setMessage('Popup sign-in succeeded. Press Continue to finish.');
      }
      enableContinue();
    } else {
      setMessage('Popup sign-in: missing token.');
    }
  });

  function setMessage(t){ if(msg) msg.textContent = t; }

  function enableContinue(){
    const ok = !!(lastCredential && (nameInput?.value?.trim()||'').length && (courseInput?.value||'').length && (yearInput?.value||'').length);
    if (continueBtn) {
      continueBtn.disabled = !ok;
    }
  }

  function onGoogleReady(){
    if (!clientId) { setMessage('Missing Google Client ID'); return; }
    /* global google */
    if (!google || !google.accounts || !google.accounts.id){ setMessage('Failed to load Google sign-in'); return; }
    google.accounts.id.initialize({
      client_id: clientId,
      callback: async (resp)=>{
        if (!resp || !resp.credential) {
          // Trigger popup fallback if credential missing
            openOAuthPopup();
            return;
        }
        lastCredential = resp.credential;
        try {
          const p = resp.credential.split('.')[1];
          const payload = JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/')));
          lastEmail = payload.email || null;
          lastName = payload.name || payload.given_name || null;
          if (emailDisplay) emailDisplay.value = lastEmail || '';
          if (lastName && nameInput && !nameInput.value) nameInput.value = lastName;
          setMessage('Google verified. Review your details and press Continue.');
          try { card?.classList.add('signed'); setTimeout(()=>card?.classList.remove('signed'), 1200); } catch(_){ }
          enableContinue();
        } catch(_) {
          setMessage('Signed in. Press Continue to finish.');
          enableContinue();
        }
      }
    });
    const btn = document.getElementById('googleButton');
    if (btn) {
      google.accounts.id.renderButton(btn, { theme:'filled_blue', size:'large', shape:'pill', text:'continue_with' });
      requestAnimationFrame(()=> btn.classList.add('ready'));
    }
  }

  function injectGIS(){
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; s.defer = true; s.onload = onGoogleReady;
    document.head.appendChild(s);
  }

  async function submit(){
    try {
      if (!lastCredential) {
        setMessage('No credential yet; opening popup…');
        openOAuthPopup();
        return; 
      }
      const payload = {
        id_token: lastCredential,
        display_name: (nameInput?.value||'').trim(),
        course: (courseInput?.value||'').trim() || null,
        year: yearInput?.value ? parseInt(yearInput.value,10) : null
      };
      const r = await fetch(`${metaApi}?action=auth_login_google`,{
        method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
        body: JSON.stringify(payload)
      });
      const text = await r.text();
      let data = null; try { data = JSON.parse(text); } catch(_) {}
      if (!r.ok) { setMessage(`Login failed (${r.status}). ${text}`); return; }
      if (traceMode) {
        console.info('Tracer result:', data || text);
        setMessage('Tracer mode: see console for details.');
        return;
      }
      if (data?.user?.approved) {
        setMessage('Welcome! Redirecting…');
        window.location.href = 'index.html';
      } else {
        setMessage('Signed in. Your account is pending approval by admin.');
      }
    } catch(e) {
      console.error(e); setMessage('Login failed. Check console for details.');
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    injectGIS();
    if (continueBtn) continueBtn.addEventListener('click', submit);
    if (nameInput) nameInput.addEventListener('input', enableContinue);
    if (courseInput) courseInput.addEventListener('change', enableContinue);
    if (yearInput) yearInput.addEventListener('change', enableContinue);
    try {
      const els = document.querySelectorAll('.reveal');
      els.forEach(el => { void el.offsetWidth; el.style.animationPlayState = 'running'; });
    } catch(_) {}
  });
})();
