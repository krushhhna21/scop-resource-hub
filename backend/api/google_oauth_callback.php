<?php
// OAuth implicit flow callback to retrieve id_token via URL fragment and post to backend
// This page is opened in a popup. It will extract the id_token and send it to auth_login_google,
// then inform the opener and close itself.
header('Content-Type: text/html; charset=utf-8');
header('Cross-Origin-Opener-Policy: same-origin-allow-popups');
header('Cross-Origin-Embedder-Policy: unsafe-none');
?>
<!doctype html>
<html>
<head><meta charset="utf-8"><title>Signing in…</title></head>
<body>
<script>
// Simplified callback: just capture id_token and send it to opener; parent will complete login.
(function(){
  function parseFragment(){
    var hash = window.location.hash || '';
    if (hash.startsWith('#')) hash = hash.slice(1);
    var params = new URLSearchParams(hash);
    return { idToken: params.get('id_token'), error: params.get('error') };
  }
  var r = parseFragment();
  if (window.opener && window.opener.postMessage){
    if (r.error){
      window.opener.postMessage({ type:'oauth_result', ok:false, error:r.error }, '*');
    } else if (!r.idToken){
      window.opener.postMessage({ type:'oauth_result', ok:false, error:'missing_id_token' }, '*');
    } else {
      window.opener.postMessage({ type:'oauth_result', ok:true, id_token: r.idToken }, '*');
    }
  }
  try{ window.close(); }catch(_){ }
})();
</script>
Signing in…
</body>
</html>
