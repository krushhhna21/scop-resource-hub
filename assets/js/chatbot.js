(function(){
  const scriptStart = Date.now();
  try { console.log('[chatbot] bootstrap start v20251109c'); } catch(_){ }
  // Prevent duplicate initialization if script loaded twice
  if (window.__SCOP_CHATBOT_INIT__) { try { console.log('[chatbot] abort: already initialized'); } catch(_){ } return; }
  window.__SCOP_CHATBOT_INIT__ = true;
  // Simple floating chatbot UI
  // Determine API base similar to app.js for deploy package
  const metaApiEl = document.querySelector('meta[name="api-base"]');
  const metaApi = metaApiEl ? metaApiEl.getAttribute('content') : null;
  const API_BASE = metaApi || (function () {
    const path = window.location.pathname || '/';
    const m = path.match(/\/(public|frontend|deploy_package)\//);
    if (m) {
      const idx = path.indexOf(`/${m[1]}/`);
      const prefix = path.slice(0, idx);
      return prefix + '/backend/api/index.php';
    }
    const lastSlash = path.lastIndexOf('/');
    const dir = lastSlash >= 0 ? path.slice(0, lastSlash + 1) : '/';
    return dir + 'backend/api/index.php';
  })();
  if (!API_BASE.includes('api/index.php')) {
    console.warn('[chatbot] Resolved API_BASE looks unusual:', API_BASE);
  }
  const apiPath = `${API_BASE}?action=chat`;

  // Early stub to prevent fallback injector from creating a duplicate edge button
  // Upgrade early stub (if any) but keep reference so fallback sees object
  window.SCOP_CHATBOT = window.SCOP_CHATBOT || {}; // preserve existing stub
  window.SCOP_CHATBOT.apiBase = API_BASE;
  window.SCOP_CHATBOT.debug = function(){ return { initStub: true, apiPath }; };

  function qs(sel, parent=document) { return parent.querySelector(sel); }

  // Create styles if not present
  const styleId = 'chatbot-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
    .chatbot-fab{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;background:#0ea5e9;color:#fff;border:none;box-shadow:0 8px 30px rgba(0,0,0,.25);z-index:9999;display:flex;align-items:center;justify-content:center;font-weight:700}
    .chatbot-fab.speaking{animation:pulse 1s infinite}
  .chatbot-fab.welcome-center{left:50% !important;right:auto !important;bottom:28px;transform:translateX(-50%);width:180px;height:54px;border-radius:30px;padding:0 18px;gap:8px;font-weight:600;background:linear-gradient(135deg,#0ea5e9,#6366f1);box-shadow:0 10px 32px -4px rgba(0,0,0,.35);transition:all .5s cubic-bezier(.22,.61,.36,1)}
    .chatbot-fab.welcome-center .chatbot-bot{display:none}
    .chatbot-fab .pill-icon{width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;position:relative}
    .chatbot-fab .pill-icon span{display:block;width:10px;height:10px;background:#fff;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}
    .chatbot-fab .pill-icon span:nth-child(2){left:70%;top:35%;width:8px;height:8px}
    @keyframes pulse{0%,100%{box-shadow:0 8px 30px rgba(14,165,233,.35)}50%{box-shadow:0 8px 30px rgba(99,102,241,.55)}}
    @keyframes runToEdge{0%{left:50%;right:auto;transform:translateX(-50%) scale(1);width:180px;height:54px;border-radius:30px}60%{left:65%;transform:translateX(-50%) scale(.85)}80%{left:80%;transform:translateX(-50%) scale(.75)}100%{left:auto;right:20px;transform:translateX(0) scale(1);width:56px;height:56px;border-radius:50%}}
    .chatbot-fab.run-edge{animation:runToEdge 1.6s cubic-bezier(.65,.05,.36,1) forwards}
    .chatbot-fab.run-edge .pill-icon, .chatbot-fab.run-edge .pill-label{opacity:0;transition:opacity .4s ease .3s}
    .chatbot-panel{position:fixed;right:20px;bottom:86px;width:320px;max-height:60vh;background:rgba(255,255,255,0.98);box-shadow:0 12px 40px rgba(0,0,0,0.2);border-radius:12px;overflow:hidden;z-index:9999;display:flex;flex-direction:column}
    .chatbot-header{padding:10px 12px;background:#05668d;color:#fff;font-weight:600}
    .chatbot-body{padding:10px;flex:1;overflow:auto;font-size:14px}
    .chatbot-input{display:flex;border-top:1px solid #eee}
    .chatbot-input textarea{flex:1;border:0;padding:8px;resize:none;height:44px}
    .chatbot-input button{width:64px;border:0;background:#0ea5e9;color:#fff}
    .chatbot-msg{margin-bottom:8px}
    .chatbot-msg.user{text-align:right}
    .chatbot-msg .bubble{display:inline-block;padding:8px 10px;border-radius:10px;max-width:85%}
    .chatbot-msg.user .bubble{background:#0ea5e9;color:#fff}
    .chatbot-msg.bot .bubble{background:#f1f5f9;color:#000}
    `;
    document.head.appendChild(style);
  }

  // Build UI
  const fab = document.createElement('button');
  fab.className = 'chatbot-fab';
  fab.title = 'Pharm D mates AI';
  fab.setAttribute('aria-label','Pharm D mates AI');
  fab.id = 'chatbotFab';
  fab.style.display = 'flex';
  fab.style.visibility = 'visible';
  fab.style.opacity = '1';
  fab.innerHTML = `
    <svg viewBox="0 0 64 64" class="chatbot-bot" aria-hidden="true" focusable="false">
      <g class="bot">
        <rect x="12" y="20" width="40" height="28" rx="8" fill="currentColor"/>
        <circle cx="26" cy="34" r="5" class="eye eye-left" fill="#0a2540"/>
        <circle cx="38" cy="34" r="5" class="eye eye-right" fill="#0a2540"/>
        <rect x="24" y="38" width="16" height="4" rx="2" class="mouth" fill="#ffffff"/>
        <rect x="30" y="10" width="4" height="10" rx="2" fill="currentColor"/>
        <circle cx="32" cy="8" r="4" class="antenna" fill="currentColor"/>
      </g>
    </svg>`;
  // Welcome staging: detect query param or localStorage flag
  // Daily welcome / signup detection
  const signupFlag = /(?:just_signed_up|welcome|new_user)=1/i.test(location.search);
  const forceAnim = /(?:force_anim|anim=always)=1/i.test(location.search);
  const lastAnimDate = localStorage.getItem('chatbot_anim_last');
  const todayStr = new Date().toISOString().slice(0,10); // YYYY-MM-DD
  const dailyDue = lastAnimDate !== todayStr; // show once per day
  const pendingFlag = !!localStorage.getItem('welcome_bot_pending');
  const shouldShowWelcome = forceAnim || signupFlag || dailyDue || pendingFlag;
  try { console.log('[chatbot] welcome eval', {forceAnim, signupFlag, dailyDue, pendingFlag, lastAnimDate, todayStr, shouldShowWelcome}); } catch(_){ }
  if (shouldShowWelcome) {
    localStorage.setItem('welcome_bot_pending','1');
    fab.classList.add('welcome-center');
    // Start with slight fade-in
    fab.style.opacity = '0';
    fab.style.transition = 'opacity .5s ease';
    fab.innerHTML = `<div class="pill-icon"><span></span><span></span></div><span class="pill-label">Chat With Us</span>`;
    setTimeout(()=>{ fab.style.opacity='1'; }, 60);
  }
  // Append immediately if body is ready to avoid initial delay
  if (document.body && !fab.isConnected) {
    try { document.body.appendChild(fab); console.log('[chatbot] fab appended early in', Date.now()-scriptStart,'ms'); } catch(err){ console.warn('[chatbot] early append failed', err); }
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (!fab.isConnected) { try { document.body.appendChild(fab); console.log('[chatbot] fab appended on DOMContentLoaded'); } catch(_){ } }
    });
  }
  function inject() {
    if (!fab.isConnected) document.body.appendChild(fab);
    if (!overlay.isConnected) document.body.appendChild(overlay);
    if (!panel.isConnected) document.body.appendChild(panel);
    try { console.log('[chatbot] injected'); } catch(_){ }
  }
  document.addEventListener('DOMContentLoaded', inject);
  // Safety: final ensure after 2s
  setTimeout(()=>{ if(!fab.isConnected){ inject(); console.log('[chatbot] late inject after 2s safeguard'); } }, 2000);
  // Presence watchdog: ensure the FAB remains available (handles DOM replacements)
  let watchdogCount = 0; const watchdog = setInterval(()=>{
    watchdogCount++;
    const exists = !!document.querySelector('#chatbotFab');
    if (!exists) {
      try { if (!fab.isConnected) document.body.appendChild(fab); console.warn('[chatbot] watchdog re-appended FAB'); } catch(_){ }
    }
    if (watchdogCount > 15) clearInterval(watchdog); // stop after ~15s
  }, 1000);
  
  // Fullscreen overlay for centered modal mode
  const overlay = document.createElement('div');
  overlay.className = 'chatbot-overlay';
  // Inline full-screen styling so early clicks (before CSS injection) still show modal
  overlay.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);z-index:100000;';

  const panel = document.createElement('div');
  panel.className = 'chatbot-panel';
  panel.style.display = 'none';
  panel.classList.add('chatbot-panel-edge');
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-label','Pharm D mates AI');
  panel.innerHTML = `
    <div class="chatbot-header" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <span>Pharm D mates AI</span>
      <button type="button" id="chatbotClose" aria-label="Close assistant" style="background:transparent;border:0;color:#fff;font-size:18px;cursor:pointer;line-height:1;">×</button>
    </div>
    <div class="chatbot-body" id="chatbotBody"></div>
    <div class="chatbot-input">
      <textarea id="chatbotInput" placeholder="Ask me anything..." ></textarea>
      <button id="chatbotSend">Send</button>
    </div>
  `;
  // Helpers for centered/edge placement
  function ensureOverlay(){ if(!overlay.isConnected) document.body.appendChild(overlay); }
  function ensurePanelInOverlay(){ ensureOverlay(); if(panel.parentElement!==overlay) overlay.appendChild(panel); }
  function ensurePanelAtBody(){ if(panel.parentElement!==document.body) document.body.appendChild(panel); }
  // Fallback insertion if DOMContentLoaded already fired
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    inject();
  }
  // If an early centered-open was requested before this script loaded, honor it now
  if (window.__CHATBOT_CENTER_OPEN_PENDING) {
    try { console.log('[chatbot] honoring queued centered open'); } catch(_){ }
    openAssistantCentered();
    if (window.__CHATBOT_QUEUED_MESSAGE) {
      sendMessage(window.__CHATBOT_QUEUED_MESSAGE);
      window.__CHATBOT_QUEUED_MESSAGE = null;
    }
    window.__CHATBOT_CENTER_OPEN_PENDING = false;
  }
  // Retry safety: ensure button exists after load (handles extension interference)
  setTimeout(()=>{ if(!document.querySelector('.chatbot-fab')) { try { console.log('[chatbot] retry inject'); } catch(_){ } inject(); } }, 1500);
  setTimeout(()=>{ if(!document.querySelector('.chatbot-fab')) { try { console.log('[chatbot] second retry inject'); } catch(_){ } inject(); } }, 4000);

  function appendMessage(who, text){
    const body = qs('#chatbotBody');
    const wrap = document.createElement('div');
    wrap.className = 'chatbot-msg ' + (who==='user'?'user':'bot');
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;
    wrap.appendChild(bubble);
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
  }

  // Show a one-time welcome message when the assistant opens
  let __welcomeShown = false;
  function showWelcomeIfNeeded(){
    try { /* do nothing */ } catch(_){}
    if (__welcomeShown) return;
    appendMessage('bot', 'Welcome to Pharm D Mates AI');
    __welcomeShown = true;
  }

  let activeRequests = 0;
  async function sendMessage(text){
    activeRequests++;
    fab.classList.add('speaking');
    appendMessage('user', text);
    appendMessage('bot','✍️ Searching and generating answer...');
    const bodyEl = qs('#chatbotBody');
    const lastBot = bodyEl.querySelector('.chatbot-msg.bot:last-child .bubble');
    try{
      const resp = await fetch(apiPath, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({message: text})
      });
      const ctype = resp.headers.get('Content-Type') || '';
      if (!resp.ok) {
        const txt = await resp.text().catch(()=> '');
        lastBot.textContent = `HTTP ${resp.status}: ${txt.slice(0,200)}`;
        return;
      }
      const data = ctype.includes('application/json') ? await resp.json() : { reply: await resp.text() };
      if (data.reply) {
        lastBot.textContent = data.reply;
        if (Array.isArray(data.sources) && data.sources.length) {
          // Append a second bot message with clickable source links
          const srcLines = data.sources.map(s => {
            const t = s.title || 'Untitled';
            const link = s.link ? s.link : '';
            return link ? `• ${t} → ${link}` : `• ${t}`;
          }).join('\n');
          appendMessage('bot', 'Related Resources:\n' + srcLines);
        }
      } else if (data.error) {
        const err = data.error;
        if (typeof err === 'object' && err) {
          const msg = err.message || err.status || err.code || JSON.stringify(err);
          lastBot.textContent = 'Error: ' + msg;
        } else {
          lastBot.textContent = 'Error: ' + err;
        }
      } else {
        lastBot.textContent = JSON.stringify(data);
      }
    }catch(err){
      lastBot.textContent = 'Network error: ' + err.message;
    }
    activeRequests = Math.max(0, activeRequests - 1);
    if (activeRequests === 0) {
      fab.classList.remove('speaking');
    }
  }

  function openAssistantCentered(){
    // Switch to centered configuration
    try { console.log('[chatbot] openAssistantCentered called'); } catch(_){ }
  ensurePanelInOverlay();
  overlay.style.display = 'flex';
  panel.classList.remove('chatbot-panel-edge');
  panel.classList.add('centered');
  panel.style.display = 'flex';
  // Welcome message (once per page load)
  showWelcomeIfNeeded();
    // Inline fallback styles (in case stylesheet not yet injected)
    if(!document.getElementById('chatbot-centered-styles')){
      panel.style.right='auto';
      panel.style.bottom='auto';
      panel.style.position='relative';
      panel.style.width='640px';
      panel.style.maxWidth='96vw';
      panel.style.maxHeight='80vh';
      panel.style.background='#0f0f10';
      panel.style.color='#e5e7eb';
      panel.style.borderRadius='20px';
      panel.style.boxShadow='0 24px 64px -12px rgba(0,0,0,.55)';
      panel.style.padding='0';
      panel.style.overflow='hidden';
    }
    setTimeout(()=>{ const input = qs('#chatbotInput'); if (input) input.focus(); }, 80);
    // Emergency fallback: if for any reason overlay/panel didn’t become visible, force a centered fixed panel
    setTimeout(()=>{
      const overlayVisible = overlay && overlay.style && overlay.style.display !== 'none';
      const panelVisible = panel && panel.style && panel.style.display !== 'none';
      if (!overlayVisible && !panelVisible) {
        try { console.warn('[chatbot] emergency center fallback'); } catch(_){ }
        document.body.appendChild(panel);
        panel.style.display = 'flex';
        panel.style.position = 'fixed';
        panel.style.left = '50%';
        panel.style.top = '50%';
        panel.style.transform = 'translate(-50%, -50%)';
        panel.style.zIndex = '100001';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.classList.remove('chatbot-panel-edge');
        panel.classList.add('centered');
      }
    }, 150);
    cleanupTips();
  }
  function openAssistantEdge(){
  overlay.style.display = 'none';
  ensurePanelAtBody();
  panel.classList.remove('centered');
  panel.classList.add('chatbot-panel-edge');
  panel.style.display = 'flex';
    // Welcome message (once per page load)
    showWelcomeIfNeeded();
    setTimeout(()=>{ const input = qs('#chatbotInput'); if (input) input.focus(); }, 80);
    cleanupTips();
  }
  fab.addEventListener('click', ()=>{
    if (panel.style.display === 'none') {
      openAssistantEdge();
    } else {
      panel.style.display = 'none';
    }
    if (fab.classList.contains('welcome-center')) triggerRunToEdge();
  });

  document.addEventListener('click', (e)=>{
    if (e.target && e.target.id === 'chatbotSend'){
      const input = qs('#chatbotInput');
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      sendMessage(text);
    }
  });

  // Enter to send
  document.addEventListener('keydown', (e)=>{
    const input = qs('#chatbotInput');
    if (!input) return;
    if ((e.key === 'Enter' || e.keyCode === 13) && (e.ctrlKey || e.metaKey || e.shiftKey) === false) {
      if (document.activeElement === input) {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        sendMessage(text);
      }
    }
    if (e.key === 'Escape' && panel.style.display !== 'none') {
      if (overlay.style.display !== 'none') { overlay.style.display = 'none'; }
      else if (panel.style.display !== 'none') { panel.style.display = 'none'; }
    }
  });

  // Expose a small API for debugging
  window.SCOP_CHATBOT = {
    open(){ try { console.log('[chatbot] SCOP_CHATBOT.open()'); } catch(_){ } openAssistantCentered(); },
    send(text){ if (panel.style.display==='none') openAssistantCentered(); sendMessage(text); },
    edge(){ openAssistantEdge(); },
    close(){ panel.style.display='none'; },
    apiBase: API_BASE,
    debug(){ return {fabExists: !!document.querySelector('.chatbot-fab'), panelVisible: panel.style.display !== 'none', centered: panel.classList.contains('centered'), overlayVisible: overlay.style.display !== 'none', apiPath}; }
  };
  try { console.log('[chatbot] apiPath', apiPath); } catch(_){ }

  // Intro staged messages (tooltips) sequence
  const tipMessages = [
    'Hey! Your assistant is here.',
    'Need help finding resources?',
    'Tap to ask anything.'
  ];
  let tipIndex = 0; let tips = [];
  function showNextTip(){
    if (tipIndex >= tipMessages.length) return;
    const t = document.createElement('div');
    t.className = 'chatbot-tip';
    t.textContent = tipMessages[tipIndex++];
    document.body.appendChild(t);
    tips.push(t);
    setTimeout(()=>{
      if (t.parentNode) {
        t.style.transition = 'opacity .35s ease, transform .35s ease';
        t.style.opacity = '0';
        t.style.transform = 'translateY(-4px) scale(.95)';
        setTimeout(()=>{ if(t.parentNode) t.parentNode.removeChild(t); }, 400);
      }
      showNextTip();
    }, 2600);
  }
  function cleanupTips(){ tips.forEach(el=>{ try { el.remove(); } catch(_){} }); tips=[]; }
  // Start sequence slightly after load so layout settles
  setTimeout(()=>{ if(!panel.isConnected) inject(); showNextTip(); }, 800);
  // Cancel tooltips on scroll or interaction
  window.addEventListener('scroll', cleanupTips, { once: true });
  fab.addEventListener('mouseenter', cleanupTips, { once: true });
  document.addEventListener('keydown', cleanupTips, { once: true });

  // Run animation logic
  let runStarted = false;
  function triggerRunToEdge(){
    if (runStarted || !fab.classList.contains('welcome-center')) return;
    runStarted = true;
    try { console.log('[chatbot] run animation start'); } catch(_){ }
    fab.classList.add('run-edge');
    fab.addEventListener('animationend', ()=>{
      fab.classList.remove('run-edge','welcome-center');
      fab.innerHTML = `
        <svg viewBox="0 0 64 64" class="chatbot-bot" aria-hidden="true" focusable="false">
          <g class="bot">
            <rect x="12" y="20" width="40" height="28" rx="8" fill="currentColor"/>
            <circle cx="26" cy="34" r="5" class="eye eye-left" fill="#0a2540"/>
            <circle cx="38" cy="34" r="5" class="eye eye-right" fill="#0a2540"/>
            <rect x="24" y="38" width="16" height="4" rx="2" class="mouth" fill="#ffffff"/>
            <rect x="30" y="10" width="4" height="10" rx="2" fill="currentColor"/>
            <circle cx="32" cy="8" r="4" class="antenna" fill="currentColor"/>
          </g>
        </svg>`;
      localStorage.removeItem('welcome_bot_pending');
      localStorage.setItem('chatbot_anim_last', todayStr);
      try { console.log('[chatbot] run animation end; stored date', todayStr); } catch(_){ }
    }, { once: true });
  }
  if (shouldShowWelcome) {
    ['scroll','click','keydown','mousemove','touchstart'].forEach(ev => {
      window.addEventListener(ev, (e)=>{
        if (ev === 'click' && (e.target === fab || fab.contains(e.target))) return; // ignore fab clicks
        triggerRunToEdge();
      }, { once: true, passive: true });
    });
    // Earlier fallback: ensure animation even if user idle
    setTimeout(()=>{ if(!runStarted) { try { console.log('[chatbot] fallback auto-run (early)'); } catch(_){ } triggerRunToEdge(); } }, 2500);
    // Secondary backup after 8s just in case first was blocked
    setTimeout(()=>{ if(!runStarted) { try { console.log('[chatbot] fallback auto-run (late)'); } catch(_){ } triggerRunToEdge(); } }, 8000);
  }

  // Close button listener
  document.addEventListener('click', (e)=>{
    if (e.target && e.target.id === 'chatbotClose') {
      if (overlay.style.display !== 'none') overlay.style.display = 'none';
      else panel.style.display='none';
    }
  });

  // Click outside to close in centered mode
  overlay.addEventListener('click', (e)=>{ if(e.target === overlay){ overlay.style.display='none'; } });

  // Ensure the hero button reliably opens the centered assistant even if inline handlers are blocked
  const heroBtn = document.getElementById('assistantChatButton');
  if (heroBtn && !heroBtn.__wired) {
    heroBtn.addEventListener('click', function(ev){
      try { ev.preventDefault(); } catch(_){ }
      try { console.log('[chatbot] hero Chat With Us clicked'); } catch(_){ }
      if (window.SCOP_CHATBOT && typeof window.SCOP_CHATBOT.open === 'function') {
        window.SCOP_CHATBOT.open();
      } else {
        // fallback: try FAB
        const fabEl = document.querySelector('.chatbot-fab');
        if (fabEl) fabEl.click();
      }
    }, { passive: true });
    heroBtn.__wired = true;
  }

  // Delegated listener to catch dynamically re-rendered hero button
  document.addEventListener('click', function(ev){
    const target = ev.target && (ev.target.id === 'assistantChatButton' ? ev.target : ev.target.closest && ev.target.closest('#assistantChatButton'));
    if (target) {
      try { console.log('[chatbot] delegated handler: Chat With Us'); } catch(_){ }
      if (window.SCOP_CHATBOT && typeof window.SCOP_CHATBOT.open === 'function') {
        window.SCOP_CHATBOT.open();
      } else {
        const fabEl = document.querySelector('.chatbot-fab');
        if (fabEl) fabEl.click();
      }
    }
  }, { passive: true });

  // Style injection extension for centered panel
  // Style injection extension for centered panel
  const extraStyleId = 'chatbot-centered-styles';
  if(!document.getElementById(extraStyleId)){
    const s = document.createElement('style');
    s.id = extraStyleId;
    s.textContent = `
      .chatbot-overlay{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:100000;}
      .chatbot-panel.centered{position:relative;right:auto;bottom:auto;width:640px;max-width:96vw;max-height:80vh;background:#0f0f10;color:#e5e7eb;border-radius:20px;box-shadow:0 24px 64px -12px rgba(0,0,0,.55);padding:0;overflow:hidden;}
      .chatbot-panel.centered .chatbot-header{background:linear-gradient(90deg,#0b0b0c,#18181b);color:#fff;font-weight:600;padding:12px 16px;border-top-left-radius:20px;border-top-right-radius:20px;}
      .chatbot-panel.centered .chatbot-body{padding:14px 16px;font-size:14px;color:#e5e7eb;background:transparent;}
      .chatbot-panel.centered .chatbot-input{border-top:1px solid #262626;background:#0b0b0c;}
      .chatbot-panel.centered #chatbotInput{background:#0b0b0c;color:#e5e7eb;border-radius:0;}
      .chatbot-panel.centered #chatbotInput::placeholder{color:#9ca3af;opacity:.8;}
      .chatbot-panel.centered #chatbotSend{background:#0ea5e9;font-weight:600;color:#fff;}
      .chatbot-panel.centered .chatbot-msg.bot .bubble{background:#1f2937;color:#e5e7eb;}
      @media (max-width:640px){
        .chatbot-panel.centered{width:96vw;max-height:82vh;}
      }
    `;
    document.head.appendChild(s);
  }

})();
