<?php
// Test database connection
try {
    $config = include 'config.local.php';
    $dsn = "mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4";
    $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    echo "✅ Database connection successful!\n";
    
    // Test a simple query
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll();
    
    echo "📋 Tables found:\n";
    foreach ($tables as $table) {
        echo "  - " . $table[array_keys($table)[0]] . "\n";
    }
    
    // Test user authentication
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
    $userCount = $stmt->fetch()['count'];
    echo "👥 Users in database: $userCount\n";
    
} catch (Exception $e) {
    echo "❌ Database connection failed: " . $e->getMessage() . "\n";
    echo "🔍 Error details:\n";
    echo "  - Host: " . ($config['db_host'] ?? 'not set') . "\n";
    echo "  - Database: " . ($config['db_name'] ?? 'not set') . "\n";
    echo "  - User: " . ($config['db_user'] ?? 'not set') . "\n";
}
?>