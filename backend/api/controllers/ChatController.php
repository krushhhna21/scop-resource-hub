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

    if ($apiKey === '') {
      echo json_encode(['reply'=>"(local stub) I received your message: ".mb_substr($message,0,800),'note'=>'Set GEMINI_API_KEY/GEMINI_MODEL to enable real AI responses.']);
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
        if (isset($decoded['error'])) { $attempts[] = ['model'=>$m,'version'=>$ver,'status'=>$status,'apiError'=>$decoded['error']]; if (intval($decoded['error']['code'] ?? 0) === 404) { continue; } else { http_response_code(502); echo json_encode(['error'=>$decoded['error']]); return; } }
        $text = $decoded['candidates'][0]['content']['parts'][0]['text'] ?? ($decoded['candidates'][0]['output_text'] ?? ($decoded['text'] ?? null));
        if ($text !== null) { echo json_encode(['reply'=>$text]); return; }
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
        if (isset($dec['error'])) { $attempts[] = ['model'=>$short,'version'=>$ver,'status'=>$s,'apiError'=>$dec['error']]; if (intval($dec['error']['code'] ?? 0) === 404) { continue; } else { http_response_code(502); echo json_encode(['error'=>$dec['error']]); return; } }
        $text = $dec['candidates'][0]['content']['parts'][0]['text'] ?? ($dec['candidates'][0]['output_text'] ?? ($dec['text'] ?? null));
        if ($text !== null) { echo json_encode(['reply'=>$text]); return; }
        $attempts[] = ['model'=>$short,'version'=>$ver,'status'=>$s,'note'=>'no text extracted'];
      }
    }

    http_response_code(502); echo json_encode(['error'=>'Gemini call failed','attempts'=>$attempts]);
  }
}
