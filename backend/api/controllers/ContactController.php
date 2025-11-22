<?php
class ContactController {
  private $pdo;
  public function __construct(PDO $pdo) { $this->pdo = $pdo; }

  private function ensure_auth() {
    $hasLegacy = isset($_SESSION['admin_user']);
    $hasGoogleAdmin = isset($_SESSION['user']) && ($_SESSION['user']['role'] ?? '') === 'admin';
    if (!($hasLegacy || $hasGoogleAdmin)) { throw new Exception('Unauthorized.'); }
  }

  private function ensureTable() {
    $this->pdo->exec("CREATE TABLE IF NOT EXISTS contact_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      email VARCHAR(255) NULL,
      subject VARCHAR(255) NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_reviewed TINYINT(1) DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  }

  public function submit($name, $email, $subject, $message) {
    $this->ensureTable();
    if ($name === '' || $message === '') throw new Exception('name and message required');
    $stmt = $this->pdo->prepare('INSERT INTO contact_messages (name,email,subject,message) VALUES (?,?,?,?)');
    $stmt->execute([$name,$email,$subject,$message]);
    return ['success'=>true];
  }

  public function listAdmin() {
    $this->ensure_auth();
    $this->ensureTable();
    $stmt = $this->pdo->query('SELECT id,name,email,subject,message,is_reviewed,created_at FROM contact_messages ORDER BY created_at DESC LIMIT 500');
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  public function markReviewed($id, $reviewed) {
    $this->ensure_auth();
    $this->ensureTable();
    $stmt = $this->pdo->prepare('UPDATE contact_messages SET is_reviewed=? WHERE id=?');
    $stmt->execute([$reviewed?1:0,$id]);
    return ['success'=>true];
  }
}
