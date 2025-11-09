<?php
// routes_light.php - minimal diagnostic router to avoid loading heavy controllers
header('Content-Type: application/json');

// Basic error safety
set_error_handler(function($s,$m,$f,$l){ http_response_code(500); echo json_encode(['error'=>'php_error','message'=>$m,'file'=>$f,'line'=>$l]); exit; });
set_exception_handler(function($e){ http_response_code(500); echo json_encode(['error'=>'exception','message'=>$e->getMessage(),'file'=>$e->getFile(),'line'=>$e->getLine()]); exit; });

$action = $_GET['action'] ?? $_POST['action'] ?? null;

function ok($d){ echo json_encode($d); exit; }
function err($m,$c=500){ http_response_code($c); echo json_encode(['error'=>$m]); exit; }

switch ($action) {
  case 'ping':
    ok(['ok'=>true,'time'=>date('c'),'mode'=>'light']);
    break;
  case 'debug_health':
    // Load DB lazily to avoid failures breaking other actions
    require_once __DIR__ . '/db.php';
    $dbOk = false; $dbMsg = 'not tested';
    try { $r = @$pdo->query('SELECT 1'); $dbOk = $r !== false; $dbMsg = $dbOk ? 'ok' : 'query failed'; } catch (Throwable $e) { $dbMsg = $e->getMessage(); }
    ok(['status'=>'ok','db'=>['ok'=>$dbOk,'message'=>$dbMsg],'php'=>PHP_VERSION,'time'=>date('c')]);
    break;
  case 'debug_auth_log_tail':
    // Try multiple locations
    $candidates = [__DIR__.'/auth.log', dirname(__DIR__).'/backend/api/auth.log', sys_get_temp_dir().'/scop_auth.log'];
    $result = [];
    foreach ($candidates as $p) {
      $entry = ['path'=>$p,'exists'=>file_exists($p)];
      if ($entry['exists']) {
        $c = @file_get_contents($p);
        if ($c !== false) { $lines = explode("\n",trim($c)); $entry['tail'] = array_slice($lines,-80); $entry['total'] = count($lines); }
      }
      $result[] = $entry;
    }
    ok(['logs'=>$result]);
    break;
  default:
    ok(['status'=>'light_router','action'=>$action]);
}
