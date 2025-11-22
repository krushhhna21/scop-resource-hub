<?php
class ChatController {
  private $config;
  public function __construct($config) { $this->config = $config; }

  public function chat() {
    $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $message = trim($payload['message'] ?? '');
    if ($message === '') { http_response_code(400); echo json_encode(['error'=>'message is required']); exit; }

  $apiKey = isset($this->config['gemini_api_key']) ? trim((string)$this->config['gemini_api_key']) : '';
  if ($apiKey === '') { $apiKey = getenv('GEMINI_API_KEY') ?: ''; }
  $model = isset($this->config['gemini_model']) ? trim((string)$this->config['gemini_model']) : '';
  if ($model === '') { $model = getenv('GEMINI_MODEL') ?: 'gemini-1.5-flash-latest'; }
  $apiVersion = isset($this->config['gemini_api_version']) ? trim((string)$this->config['gemini_api_version']) : '';
  if ($apiVersion === '') { $apiVersion = getenv('GEMINI_API_VERSION') ?: 'v1beta'; }
    // Helper to collect related resource links based on message keywords
    $collectSources = function($rawMessage) {
      $sources = [];
      try {
        $cfg = $this->config;
        foreach (['db_host','db_name','db_user','db_pass'] as $k) { if (empty($cfg[$k])) return $sources; }
        $dsn = "mysql:host={".$cfg['db_host']."};dbname={".$cfg['db_name']."};charset=utf8mb4";
        $pdo = new PDO($dsn, $cfg['db_user'], $cfg['db_pass'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
        $text = mb_strtolower($rawMessage);
        $parts = preg_split('/[^\p{L}\p{N}]+/u', $text, -1, PREG_SPLIT_NO_EMPTY);
        if (!$parts) return $sources;
        $stop = ['the','and','for','with','this','that','from','into','your','about','what','can','you','pharm','mates','study','help','need'];
        $terms = [];
        foreach ($parts as $p) { if (mb_strlen($p) >= 4 && !in_array($p,$stop,true)) { $terms[$p] = true; } }
        $terms = array_keys($terms);
        if (!$terms) return $sources;
        $terms = array_slice($terms, 0, 8);
        $conds = [];$params = [];
        foreach ($terms as $t) { $like = '%'.$t.'%'; $conds[]='(r.title LIKE ? OR r.description LIKE ?)'; $params[]=$like; $params[]=$like; }
        $sql = 'SELECT r.id,r.title,r.resource_type,r.external_url,r.file_path FROM resources r WHERE ' . implode(' OR ', $conds) . ' ORDER BY r.id DESC LIMIT 6';
        $stmt = $pdo->prepare($sql); $stmt->execute($params); $rows=$stmt->fetchAll();
        foreach ($rows as $row) {
          $link = null;
          if (!empty($row['external_url'])) { $link = $row['external_url']; }
          elseif (!empty($row['file_path'])) { $link = preg_match('/^https?:\/\//i',$row['file_path']) ? $row['file_path'] : ('/' . ltrim($row['file_path'],'/')); }
          $sources[] = [ 'id'=>(int)$row['id'], 'title'=>$row['title'], 'resource_type'=>$row['resource_type'], 'link'=>$link ];
        }
      } catch (Throwable $e) { /* silent */ }
      return $sources;
    };

    if ($apiKey === '') {
      $replyText = "(local stub) I received your message: ".mb_substr($message,0,800);
      $sources = $collectSources($message);
      echo json_encode(['reply'=>$replyText,'note'=>'Set GEMINI_API_KEY/GEMINI_MODEL to enable real AI responses.','sources'=>$sources]);
      exit;
    }

    $bodyArr = [
      'contents' => [[ 'role' => 'user', 'parts' => [[ 'text' => $message ]] ]],
      'generationConfig' => [ 'temperature'=>0.7, 'topP'=>0.95, 'maxOutputTokens'=>1024 ]
    ];

    $attempts = [];

    $normalizeModel = function($m) {
      $m = trim($m);
      if (stripos($m, 'models/') === 0) { $m = substr($m, 7); }
      return $m;
    };
    $tryModels = [$normalizeModel($model)];
    if (strpos($model, '-latest') === false) { $tryModels[] = $normalizeModel($model . '-latest'); }
    $tryVersions = [$apiVersion];
    if ($apiVersion !== 'v1') { $tryVersions[] = 'v1'; }

    $makeCall = function($ver, $m, $bodyArr) use ($apiKey) {
      $url = sprintf('https://generativelanguage.googleapis.com/%s/models/%s:generateContent?key=%s', urlencode($ver), urlencode($m), urlencode($apiKey));
      $body = json_encode($bodyArr);
      $ch = curl_init($url);
      curl_setopt($ch, CURLOPT_POST, true);
      curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
      curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
      curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
      curl_setopt($ch, CURLOPT_TIMEOUT, 30);
      $resp = curl_exec($ch); $err = curl_error($ch); $status = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
      return [$status, $err, $resp];
    };

    foreach ($tryModels as $m) {
      foreach ($tryVersions as $ver) {
        list($status, $err, $resp) = $makeCall($ver, $m, $bodyArr);
        if ($err) { $attempts[] = ['model'=>$m,'version'=>$ver,'error'=>$err]; continue; }
        $decoded = json_decode($resp, true);
        if (json_last_error() !== JSON_ERROR_NONE) { $attempts[] = ['model'=>$m,'version'=>$ver,'status'=>$status,'raw'=>substr($resp,0,200)]; continue; }
        if (isset($decoded['error'])) {
          $attempts[] = ['model'=>$m,'version'=>$ver,'status'=>$status,'apiError'=>$decoded['error']];
          $errMsg = strtolower($decoded['error']['message'] ?? '');
          // Graceful quota exceeded fallback: provide stub answer instead of raw error
          if (strpos($errMsg, 'quota exceeded') !== false || strpos($errMsg, 'rate limit') !== false) {
            $sources = $collectSources($message);
            $fallback = "(quota reached) I'm temporarily unable to fetch a live AI answer. Here's a brief echo of your question plus related resources you can explore.";
            $echo = mb_substr($message,0,400);
            http_response_code(200);
            echo json_encode([
              'reply' => $fallback."\n\nYour query (truncated): ".$echo,
              'note' => 'Gemini quota exceeded; using local fallback until quota resets.',
              'sources' => $sources,
              'quota_exceeded' => true
            ]);
            return;
          }
          if (intval($decoded['error']['code'] ?? 0) === 404) { continue; } else { http_response_code(502); echo json_encode(['error'=>$decoded['error']]); return; }
        }
        $text = $decoded['candidates'][0]['content']['parts'][0]['text'] ?? ($decoded['candidates'][0]['output_text'] ?? ($decoded['text'] ?? null));
        if ($text !== null) {
          $sources = $collectSources($message);
          echo json_encode(['reply'=>$text,'sources'=>$sources]);
          return;
        }
        $attempts[] = ['model'=>$m,'version'=>$ver,'status'=>$status,'note'=>'no text extracted'];
      }
    }

    $listTriedVers = array_unique(array_merge($tryVersions, ['v1']));
    foreach ($listTriedVers as $ver) {
      $listUrl = sprintf('https://generativelanguage.googleapis.com/%s/models?key=%s', urlencode($ver), urlencode($apiKey));
      $ch = curl_init($listUrl);
      curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
      curl_setopt($ch, CURLOPT_TIMEOUT, 15);
      $resp = curl_exec($ch); $err = curl_error($ch); $status = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
      if ($err) { $attempts[] = ['listModels'=>true,'version'=>$ver,'error'=>$err]; continue; }
      $list = json_decode($resp, true);
      if (json_last_error() !== JSON_ERROR_NONE || !isset($list['models'])) { $attempts[] = ['listModels'=>true,'version'=>$ver,'status'=>$status,'raw'=>substr($resp,0,200)]; continue; }
      $candidates = array_filter($list['models'], function($m){
        $name = $m['name'] ?? '';
        $methods = $m['supportedGenerationMethods'] ?? ($m['supported_generation_methods'] ?? []);
        return $name && is_array($methods) && in_array('generateContent', $methods);
      });
      usort($candidates, function($a,$b){
        $na = $a['name'] ?? ''; $nb = $b['name'] ?? '';
        $sa = (stripos($na,'flash')!==false?0:1) + (stripos($na,'1.5')!==false?0:1);
        $sb = (stripos($nb,'flash')!==false?0:1) + (stripos($nb,'1.5')!==false?0:1);
        return $sa <=> $sb;
      });
      foreach ($candidates as $cm) {
        $name = $cm['name'];
        $short = $normalizeModel($name);
        list($s,$e,$r) = $makeCall($ver, $short, $bodyArr);
        if ($e) { $attempts[] = ['model'=>$short,'version'=>$ver,'error'=>$e]; continue; }
        $dec = json_decode($r, true);
        if (json_last_error() !== JSON_ERROR_NONE) { $attempts[] = ['model'=>$short,'version'=>$ver,'status'=>$s,'raw'=>substr($r,0,200)]; continue; }
        if (isset($dec['error'])) {
          $attempts[] = ['model'=>$short,'version'=>$ver,'status'=>$s,'apiError'=>$dec['error']];
          $errMsg = strtolower($dec['error']['message'] ?? '');
          if (strpos($errMsg, 'quota exceeded') !== false || strpos($errMsg, 'rate limit') !== false) {
            $sources = $collectSources($message);
            $fallback = "(quota reached) Live AI response unavailable right now. Refer to related resources below or retry soon.";
            $echo = mb_substr($message,0,400);
            http_response_code(200);
            echo json_encode([
              'reply' => $fallback."\n\nYour query (truncated): ".$echo,
              'note' => 'Gemini quota exceeded; fallback answer served.',
              'sources' => $sources,
              'quota_exceeded' => true
            ]);
            return;
          }
          if (intval($dec['error']['code'] ?? 0) === 404) { continue; } else { http_response_code(502); echo json_encode(['error'=>$dec['error']]); return; }
        }
        $text = $dec['candidates'][0]['content']['parts'][0]['text'] ?? ($dec['candidates'][0]['output_text'] ?? ($dec['text'] ?? null));
        if ($text !== null) {
          $sources = $collectSources($message);
          echo json_encode(['reply'=>$text,'sources'=>$sources]);
          return;
        }
        $attempts[] = ['model'=>$short,'version'=>$ver,'status'=>$s,'note'=>'no text extracted'];
      }
    }

    http_response_code(502); echo json_encode(['error'=>'Gemini call failed','attempts'=>$attempts]);
  }
}
