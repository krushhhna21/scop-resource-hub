<?php
// Quick admin user setup
$config = include 'config.local.php';
$dsn = "mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4";
$pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

// Check if users table exists, if not create it
try {
    $pdo->query("SELECT 1 FROM users LIMIT 1");
    echo "✅ Users table exists\n";
} catch (PDOException $e) {
    // Create users table
    $pdo->exec("
        CREATE TABLE users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(64) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    echo "✅ Users table created\n";
}

// Insert admin user
try {
    $adminPassword = password_hash('admin123', PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (username, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)");
    $stmt->execute(['admin', $adminPassword]);
    echo "✅ Admin user created/updated\n";
} catch (PDOException $e) {
    echo "❌ Error creating admin: " . $e->getMessage() . "\n";
}

echo "🎉 Setup complete! Login with: admin / admin123\n";
?>