<?php
// db.php - PDO connection (environment-aware)
// Selection order:
//   1. If running on localhost and config.local.php exists -> use it.
//   2. Otherwise, if not local (or USE_HOSTING_CONFIG=1) and config.hosting.php exists -> use it.
//   3. Fallback to config.php.

$host = $_SERVER['HTTP_HOST'] ?? '';
$isLocal = !$host || $host === 'localhost' || $host === '127.0.0.1';
$useHosting = (getenv('USE_HOSTING_CONFIG') === '1');
$configPath = __DIR__ . '/config.php';
if ($isLocal && file_exists(__DIR__ . '/config.local.php')) {
  $configPath = __DIR__ . '/config.local.php';
} elseif ((!$isLocal || $useHosting) && file_exists(__DIR__ . '/config.hosting.php')) {
  $configPath = __DIR__ . '/config.hosting.php';
}

$config = require $configPath;
try {
  $dsn = "mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4";
  $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
} catch (Exception $e) {
  http_response_code(500);
  header('Content-Type: application/json');
  echo json_encode(['error' => 'DB connection failed', 'details' => $e->getMessage(), 'config_file' => basename($configPath)]);
  exit;
}
