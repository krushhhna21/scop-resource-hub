<?php
// apply_updates.php — Idempotently apply DB updates to fix API 500 errors due to missing columns
// Safe to run multiple times. Does NOT drop database or tables.

header('Content-Type: text/plain; charset=utf-8');

try {
  // Load config and connect
  $config = include __DIR__ . '/config.php';
  $dsn = "mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4";
  $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
  ]);
  echo "✅ Connected to DB '{$config['db_name']}' on {$config['db_host']}\n\n";

  // Helper to apply a .sql file splitting on semicolons
  $applySqlFile = function(string $path) use ($pdo) {
    if (!is_file($path)) {
      echo "⚠️  File not found: $path\n";
      return;
    }
    echo "▶ Applying: " . basename($path) . "\n";
    $sql = file_get_contents($path);
    // Normalize line endings and split on semicolons; keep it simple for typical DDL
    $statements = array_filter(array_map('trim', preg_split('/;\s*\n|;\r?\n|;$/m', $sql)));
    $applied = 0; $skipped = 0;
    foreach ($statements as $stmt) {
      if ($stmt === '' || stripos($stmt, '--') === 0) { $skipped++; continue; }
      try {
        $pdo->exec($stmt);
        $applied++;
      } catch (PDOException $e) {
        $msg = $e->getMessage();
        // Treat common idempotent cases as non-fatal
        $nonFatalPatterns = [
          'Duplicate column name',
          'already exists',
          'Can\'t DROP',
          'Duplicate key name',
          'Multiple primary key defined',
        ];
        $isNonFatal = false;
        foreach ($nonFatalPatterns as $p) {
          if (stripos($msg, $p) !== false) { $isNonFatal = true; break; }
        }
        if ($isNonFatal) {
          echo "  • Skipped (already applied): " . substr(str_replace(["\n","\r"],' ', $stmt), 0, 120) . "...\n";
          $skipped++;
        } else {
          echo "  ❌ Error: $msg\n  Stmt: " . substr(str_replace(["\n","\r"],' ', $stmt), 0, 200) . "...\n";
          // Continue applying others
        }
      }
    }
    echo "✅ Done: " . basename($path) . " (applied=$applied, skipped=$skipped)\n\n";
  };

  // Apply updates that add required columns and tables used by the app
  $root = realpath(__DIR__ . '/../../');
  $applySqlFile($root . '/updates.sql');            // adds year_id to resources, pages table, etc.
  $applySqlFile($root . '/card_layout_update.sql'); // adds thumbnail_path, card_color, indexes

  echo "🎉 Updates applied. You can now reload the site and re-test journals/publications/career.\n";
  echo "Try API test: /backend/api/index.php?action=list_resources_by_type&resource_type=journal\n";
} catch (Throwable $e) {
  http_response_code(500);
  echo "❌ Failed: " . $e->getMessage() . "\n";
}
