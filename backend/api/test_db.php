<?php
// test_db.php - environment-aware DB connectivity tester for deploy package.
// Uses the same selection logic as db.php by including it, then runs diagnostic queries.
header('Content-Type: text/plain; charset=utf-8');
echo "=== DB Connectivity Test (deploy_package) ===\n";

try {
    require __DIR__ . '/db.php'; // provides $pdo, $config and local $configPath variable from included scope
    $configFile = isset($configPath) ? basename($configPath) : 'unknown';
    echo "Config file: $configFile\n";
    echo "Host: {$config['db_host']}\n";
    echo "Database: {$config['db_name']}\n";
    echo "User: {$config['db_user']}\n";

    // Basic connection check (already succeeded if we're here)
    echo "Status: ✅ Connected\n";

    // Show tables (may fail if permissions limited)
    try {
        $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_NUM);
        echo "Tables (" . count($tables) . "):\n";
        foreach ($tables as $t) echo "  - {$t[0]}\n";
    } catch (Throwable $e) {
        echo "SHOW TABLES error: " . $e->getMessage() . "\n";
    }

    // Users count (optional)
    try {
        $count = $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
        echo "Users table count: $count\n";
    } catch (Throwable $e) {
        echo "Users count query error: " . $e->getMessage() . "\n";
    }
} catch (Throwable $e) {
    echo "Status: ❌ Connection failed\n";
    echo "Error: " . $e->getMessage() . "\n";
}

echo "Server: " . ($_SERVER['HTTP_HOST'] ?? 'cli') . "\n";
echo "HTTPS: " . ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'yes' : 'no') . "\n";
?>
