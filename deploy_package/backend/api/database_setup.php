<?php
// database_setup.php - Recreate the database and tables
$host = '127.0.0.1';
$user = 'root';
$pass = 'chalwad111';

try {
    // Connect without specifying database
    $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    echo "✅ Connected to MySQL successfully!\n";
    
    // Create database
    $pdo->exec("DROP DATABASE IF EXISTS scop_resource_hub");
    $pdo->exec("CREATE DATABASE scop_resource_hub");
    $pdo->exec("USE scop_resource_hub");
    
    echo "✅ Database 'scop_resource_hub' created!\n";
    
    // Read and execute schema
    $schema = file_get_contents(__DIR__ . '/../../schema.sql');
    $statements = explode(';', $schema);
    
    foreach ($statements as $statement) {
        $statement = trim($statement);
        if (!empty($statement)) {
            $pdo->exec($statement);
        }
    }
    
    echo "✅ Database schema created!\n";
    
    // Apply card layout updates
    $updates = file_get_contents(__DIR__ . '/../../card_layout_update.sql');
    $statements = explode(';', $updates);
    
    foreach ($statements as $statement) {
        $statement = trim($statement);
        if (!empty($statement)) {
            try {
                $pdo->exec($statement);
            } catch (PDOException $e) {
                // Ignore errors for ALTER TABLE on non-existent columns
                if (!strpos($e->getMessage(), 'Duplicate column name')) {
                    echo "Warning: " . $e->getMessage() . "\n";
                }
            }
        }
    }
    
    echo "✅ Card layout updates applied!\n";
    
    // Insert admin user
    $adminPassword = password_hash('admin123', PASSWORD_DEFAULT);
    $pdo->exec("INSERT INTO users (username, password_hash) VALUES ('admin', '$adminPassword')");
    
    echo "✅ Admin user created (username: admin, password: admin123)!\n";
    
    // Insert years
    $years = [
        [1, 'First Year'],
        [2, 'Second Year'],
        [3, 'Third Year'],
        [4, 'Fourth Year'],
        [5, 'Fifth Year'],
        [6, 'Sixth Year']
    ];
    
    foreach ($years as $year) {
        $pdo->exec("INSERT INTO years (year_number, display_name) VALUES ({$year[0]}, '{$year[1]}')");
    }
    
    echo "✅ Years data inserted!\n";
    
    // Insert some sample subjects
    $subjects = [
        [1, 'Human Anatomy and Physiology', 'Study of body structure and function'],
        [1, 'Pharmaceutical Chemistry', 'Basic chemistry for pharmacy'],
        [2, 'Pharmacology', 'Study of drug actions and effects'],
        [3, 'Clinical Pharmacy', 'Patient-centered pharmaceutical care']
    ];
    
    foreach ($subjects as $subject) {
        $stmt = $pdo->prepare("INSERT INTO subjects (year_id, name, description) VALUES (?, ?, ?)");
        $stmt->execute($subject);
    }
    
    echo "✅ Sample subjects inserted!\n";
    echo "\n🎉 Database setup complete!\n";
    echo "📝 You can now login to admin panel with:\n";
    echo "   Username: admin\n";
    echo "   Password: admin123\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>