<?php
header('Content-Type: application/json');
try {
  require_once __DIR__ . '/db.php';
  require_once __DIR__ . '/controllers/AuthController.php';
  echo json_encode(['status' => 'ok', 'auth_loaded' => true]);
} catch (Throwable $e) {
  echo json_encode(['status' => 'error', 'message' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
}
