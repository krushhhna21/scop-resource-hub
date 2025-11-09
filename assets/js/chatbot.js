(function(){
  try { console.log('[chatbot] bootstrap start'); } catch(_){ }
  // Prevent duplicate initialization if script loaded twice
  if (window.__SCOP_CHATBOT_INIT__) return; window.__SCOP_CHATBOT_INIT__ = true;
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

  function qs(sel, parent=document) { return parent.querySelector(sel); }

  // Create styles if not present
  const styleId = 'chatbot-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
    .chatbot-fab{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;background:#0ea5e9;color:#fff;border:none;box-shadow:0 8px 30px rgba(0,0,0,.25);z-index:9999;display:flex;align-items:center;justify-content:center;font-weight:700}
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
  fab.title = 'Assistant';
  fab.setAttribute('aria-label','Assistant');
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
  function inject() {
    if (!fab.isConnected) document.body.appendChild(fab);
    if (!panel.isConnected) document.body.appendChild(panel);
    try { console.log('[chatbot] injected'); } catch(_){ }
  }
  document.addEventListener('DOMContentLoaded', inject);
  const panel = document.createElement('div');
  panel.className = 'chatbot-panel';
  panel.style.display = 'none';
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-label','Assistant');
  panel.innerHTML = `
  <div class="chatbot-header">Assistant</div>
    <div class="chatbot-body" id="chatbotBody"></div>
    <div class="chatbot-input">
      <textarea id="chatbotInput" placeholder="Ask me anything..." ></textarea>
      <button id="chatbotSend">Send</button>
    </div>
  `;
  // Fallback insertion if DOMContentLoaded already fired
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    inject();
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

  let activeRequests = 0;
  async function sendMessage(text){
    activeRequests++;
    fab.classList.add('speaking');
    appendMessage('user', text);
    appendMessage('bot','...');
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
      } else if (data.error) {
        lastBot.textContent = 'Error: ' + data.error;
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

  fab.addEventListener('click', ()=>{
    const show = panel.style.display === 'none';
    panel.style.display = show ? 'flex' : 'none';
    if (show) {
      setTimeout(()=>{ const input = qs('#chatbotInput'); if (input) input.focus(); }, 80);
    }
    // Remove intro tips when user intentionally opens
    cleanupTips();
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
      panel.style.display = 'none';
    }
  });

  // Expose a small API for debugging
  window.SCOP_CHATBOT = {
    open(){ fab.click(); },
    send(text){ if (panel.style.display==='none') fab.click(); sendMessage(text); },
    apiBase: API_BASE,
    debug(){ return {fabExists: !!document.querySelector('.chatbot-fab'), panelVisible: panel.style.display !== 'none', apiPath}; }
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

})();
