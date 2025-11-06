<?php
class AdminController {
  private $pdo;
  private $config;

  public function __construct(PDO $pdo, array $config) {
    $this->pdo = $pdo;
    $this->config = $config;
  }

  public function me() {
    if (!isset($_SESSION['admin_user'])) return ['authenticated' => false];
    return ['authenticated' => true, 'username' => $_SESSION['admin_user']['username']];
  }

  public function login($username, $password) {
    $stmt = $this->pdo->prepare("SELECT * FROM users WHERE username = ? LIMIT 1");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    if (!$user || !password_verify($password, $user['password_hash'])) {
      throw new Exception('Invalid username or password.');
    }
    $_SESSION['admin_user'] = ['id' => $user['id'], 'username' => $user['username']];
    return ['success' => true];
  }

  public function logout() {
    unset($_SESSION['admin_user']);
    return ['success' => true];
  }

  private function ensure_auth() {
    if (!isset($_SESSION['admin_user'])) {
      throw new Exception('Unauthorized.');
    }
  }

  public function listAllSubjects() {
    $q = $this->pdo->query("SELECT subjects.id, subjects.name, subjects.year_id, years.display_name AS year_name
                            FROM subjects JOIN years ON subjects.year_id = years.id
                            ORDER BY years.year_number, subjects.name");
    return $q->fetchAll();
  }

  public function listResources($qstr = null) {
    $this->ensure_auth();
    if ($qstr) {
      $stmt = $this->pdo->prepare("SELECT r.*, s.name AS subject_name, y.display_name AS year_name
                                   FROM resources r
                                   LEFT JOIN subjects s ON r.subject_id = s.id
                                   LEFT JOIN years y ON s.year_id = y.id
                                   WHERE r.title LIKE ? OR r.description LIKE ?
                                   ORDER BY r.uploaded_at DESC LIMIT 200");
      $like = '%' . $qstr . '%';
      $stmt->execute([$like, $like]);
    } else {
      $stmt = $this->pdo->query("SELECT r.*, s.name AS subject_name, y.display_name AS year_name
                                 FROM resources r
                                 LEFT JOIN subjects s ON r.subject_id = s.id
                                 LEFT JOIN years y ON s.year_id = y.id
                                 ORDER BY r.uploaded_at DESC LIMIT 200");
    }
    return $stmt->fetchAll();
  }

  public function createResource($subject_id, $title, $description, $external_url, $resource_type, $year_id = null, $card_color = '#0ea5e9') {
    $this->ensure_auth();
    $file_path = null; $mime = null; $size = null;
    $thumbnail_path = null;
    
    // Handle main file upload
    if (isset($_FILES['file']) && $_FILES['file']['error'] !== UPLOAD_ERR_NO_FILE) {
      require_once __DIR__ . '/../uploadModel.php';
      [$file_path, $mime, $size] = handle_upload($_FILES['file'], $this->config);
    }
    
    // Handle thumbnail upload
    if (isset($_FILES['thumbnail']) && $_FILES['thumbnail']['error'] !== UPLOAD_ERR_NO_FILE) {
      require_once __DIR__ . '/../uploadModel.php';
      // Create a modified config for thumbnails (only images)
      $thumbnail_config = $this->config;
      $thumbnail_config['allowed_mime_types'] = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp'
      ];
      [$thumbnail_path, $thumb_mime, $thumb_size] = handle_upload($_FILES['thumbnail'], $thumbnail_config, 'thumbnails');
    }
    
    $stmt = $this->pdo->prepare("INSERT INTO resources (subject_id, year_id, title, description, file_path, thumbnail_path, card_color, external_url, mime_type, file_size, resource_type, uploaded_by)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$subject_id, $year_id, $title, $description, $file_path, $thumbnail_path, $card_color, $external_url, $mime, $size, $resource_type, $_SESSION['admin_user']['id'] ?? null]);
    return ['success' => true, 'resource_id' => $this->pdo->lastInsertId()];
  }

  public function deleteResource($resource_id) {
    $this->ensure_auth();
    // remove file if local
    $stmt = $this->pdo->prepare("SELECT file_path FROM resources WHERE id=?");
    $stmt->execute([$resource_id]);
    $row = $stmt->fetch();
    if ($row && $row['file_path']) {
      $fullPath = dirname(__DIR__, 1) . '/../' . basename($row['file_path']); // not used; safer path below
      // Safer: construct absolute from project root if file exists
      $projectRoot = realpath(__DIR__ . '/../../');
      $target = $projectRoot . '/' . $row['file_path'];
      if (is_file($target)) @unlink($target);
    }
    $del = $this->pdo->prepare("DELETE FROM resources WHERE id=?");
    $del->execute([$resource_id]);
    return ['success' => true];
  }

  public function stats() {
    $this->ensure_auth();
    $summary = [];
    $summary['total_resources'] = (int)$this->pdo->query("SELECT COUNT(*) FROM resources")->fetchColumn();
    $summary['total_views_30d'] = (int)$this->pdo->query("SELECT COUNT(*) FROM resource_views WHERE viewed_at >= (NOW() - INTERVAL 30 DAY)")->fetchColumn();
    $top = $this->pdo->query("SELECT r.id, r.title, COUNT(v.id) AS views_30d
                              FROM resources r LEFT JOIN resource_views v ON r.id = v.resource_id AND v.viewed_at >= (NOW() - INTERVAL 30 DAY)
                              GROUP BY r.id, r.title
                              ORDER BY views_30d DESC
                              LIMIT 10")->fetchAll();
    $summary['top_resources'] = $top;
    return $summary;
  }

  // Upsert page content
  public function setPageContent($slug, $html) {
    $this->ensure_auth();
    // Create table if not exists (idempotent safety)
    $this->pdo->exec("CREATE TABLE IF NOT EXISTS pages (
      slug VARCHAR(64) PRIMARY KEY,
      html MEDIUMTEXT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Upsert
    $stmt = $this->pdo->prepare("INSERT INTO pages (slug, html) VALUES (?, ?) ON DUPLICATE KEY UPDATE html = VALUES(html), updated_at = CURRENT_TIMESTAMP");
    $stmt->execute([$slug, $html]);
    return ['success' => true];
  }
}
