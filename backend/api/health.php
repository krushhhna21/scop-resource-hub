<?php
header('Content-Type: application/json');
$resp = [ 'time' => date('c') ];
try {
  $host = $_SERVER['HTTP_HOST'] ?? '';
  $isLocal = !$host || $host === 'localhost' || $host === '127.0.0.1';
  $configPath = __DIR__ . '/config.php';
  if ($isLocal && file_exists(__DIR__ . '/config.local.php')) {
    $configPath = __DIR__ . '/config.local.php';
  } elseif ((!$isLocal || getenv('USE_HOSTING_CONFIG') === '1') && file_exists(__DIR__ . '/config.hosting.php')) {
    $configPath = __DIR__ . '/config.hosting.php';
  }
  $resp['config_file'] = basename($configPath);
  $cfg = require $configPath;
  $resp['db_host'] = $cfg['db_host'] ?? null;
  $resp['db_name'] = $cfg['db_name'] ?? null;
  // Expose google_client_id for OAuth debugging (public identifier)
  if (isset($cfg['google_client_id'])) {
    $resp['google_client_id'] = $cfg['google_client_id'];
  }
  // Environment capabilities
  $resp['curl_available'] = function_exists('curl_init');
  $resp['allow_url_fopen'] = (bool)ini_get('allow_url_fopen');
  $resp['openssl_loaded'] = extension_loaded('openssl');
  // Fingerprint db.php to verify the deployed version
  $dbPhp = __DIR__ . '/db.php';
  if (file_exists($dbPhp)) {
    $resp['db_php_md5'] = md5_file($dbPhp);
    $resp['db_php_mtime'] = filemtime($dbPhp);
  }
  $dsn = "mysql:host={$cfg['db_host']};dbname={$cfg['db_name']};charset=utf8mb4";
  $pdo = new PDO($dsn, $cfg['db_user'], $cfg['db_pass'], [ PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION ]);
  $resp['db_ok'] = true;
  $resp['server'] = $_SERVER['HTTP_HOST'] ?? null;
  // Simple test query
  try { $count = $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn(); $resp['users_count'] = (int)$count; } catch (Throwable $e) { $resp['users_count_error'] = $e->getMessage(); }
} catch (Throwable $e) {
  $resp['db_ok'] = false;
  $resp['error'] = $e->getMessage();
}
// HTTPS status
$resp['https'] = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
// Origin used by JS (helpful for Google mismatch)
$resp['origin_hint'] = (isset($_SERVER['HTTP_HOST']) ? ('https://' . $_SERVER['HTTP_HOST']) : null);
// Output
echo json_encode($resp);
