<?php
class NewsController {
  private $pdo;
  public function __construct(PDO $pdo) { $this->pdo = $pdo; }

  private function ensure_auth() {
    $hasLegacy = isset($_SESSION['admin_user']);
    $hasGoogleAdmin = isset($_SESSION['user']) && ($_SESSION['user']['role'] ?? '') === 'admin';
    if (!($hasLegacy || $hasGoogleAdmin)) { throw new Exception('Unauthorized.'); }
  }

  private function ensureTable() {
    $this->pdo->exec("CREATE TABLE IF NOT EXISTS news_updates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      body TEXT NULL,
      is_published TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      published_at TIMESTAMP NULL DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  }

  public function listPublic($limit = 30) {
    $this->ensureTable();
    $stmt = $this->pdo->prepare('SELECT id,title,body,is_published,created_at,updated_at,published_at FROM news_updates WHERE is_published=1 ORDER BY COALESCE(published_at,created_at) DESC LIMIT ?');
    $stmt->bindValue(1, (int)$limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  public function listAdmin() {
    $this->ensure_auth();
    $this->ensureTable();
    $stmt = $this->pdo->query('SELECT id,title,is_published,created_at,updated_at FROM news_updates ORDER BY updated_at DESC LIMIT 200');
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  public function create($title, $body, $published) {
    $this->ensure_auth();
    $this->ensureTable();
    if ($title === '') throw new Exception('title required');
    $pubTs = $published ? date('Y-m-d H:i:s') : null;
    $stmt = $this->pdo->prepare('INSERT INTO news_updates (title,body,is_published,published_at) VALUES (?,?,?,?)');
    $stmt->execute([$title,$body,$published?1:0,$pubTs]);
    return ['success'=>true,'id'=>$this->pdo->lastInsertId()];
  }

  public function update($id, $title, $body, $published) {
    $this->ensure_auth();
    $this->ensureTable();
    $stmt = $this->pdo->prepare('UPDATE news_updates SET title=?, body=?, is_published=?, published_at=CASE WHEN ?=1 AND published_at IS NULL THEN CURRENT_TIMESTAMP ELSE published_at END WHERE id=?');
    $stmt->execute([$title,$body,$published?1:0,$published?1:0,$id]);
    return ['success'=>true];
  }

  public function delete($id) {
    $this->ensure_auth();
    $this->ensureTable();
    $stmt = $this->pdo->prepare('DELETE FROM news_updates WHERE id=?');
    $stmt->execute([$id]);
    return ['success'=>true];
  }
}
