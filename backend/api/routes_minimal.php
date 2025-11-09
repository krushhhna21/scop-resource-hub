<?php
// Minimal routes test - bypass all includes except db
header('Content-Type: application/json');
try {
  require_once __DIR__ . '/db.php';
  $action = $_GET['action'] ?? $_POST['action'] ?? null;
  
  if ($action === 'test_ping') {
    echo json_encode(['status' => 'ok', 'message' => 'routes working']);
  } else {
    echo json_encode(['status' => 'waiting', 'action' => $action]);
  }
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
}
