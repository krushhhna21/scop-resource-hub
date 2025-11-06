<?php
class StudentController {
  private $pdo;

  public function __construct(PDO $pdo) {
    $this->pdo = $pdo;
  }

  public function listYears() {
    $stmt = $this->pdo->query("SELECT id, year_number, display_name FROM years ORDER BY year_number");
    return $stmt->fetchAll();
  }

  public function listSubjects($year_id) {
    $stmt = $this->pdo->prepare("SELECT id, name, description FROM subjects WHERE year_id = ? ORDER BY name");
    $stmt->execute([$year_id]);
    return $stmt->fetchAll();
  }

  public function listResources($subject_id, $resource_type = 'resource') {
    $stmt = $this->pdo->prepare("SELECT id, title, description, file_path, thumbnail_path, card_color, external_url, mime_type, file_size, uploaded_at, resource_type
                                 FROM resources WHERE subject_id = ? AND resource_type = ? ORDER BY uploaded_at DESC");
    $stmt->execute([$subject_id, $resource_type]);
    return $stmt->fetchAll();
  }

  public function listResourcesByYear($year_id, $resource_type = 'resource') {
    // Join with subjects to get subject name, but allow null subject_id for questions
    $stmt = $this->pdo->prepare("
      SELECT r.id, r.title, r.description, r.file_path, r.thumbnail_path, r.card_color, r.external_url, r.mime_type, r.file_size, r.uploaded_at, r.resource_type,
             s.name as subject_name
      FROM resources r 
      LEFT JOIN subjects s ON r.subject_id = s.id 
      WHERE r.year_id = ? AND r.resource_type = ? 
      ORDER BY r.uploaded_at DESC
    ");
    $stmt->execute([$year_id, $resource_type]);
    return $stmt->fetchAll();
  }

  public function listResourcesByType($resource_type) {
    // Get all resources of a specific type (for general resources like journals, publications, career)
    $stmt = $this->pdo->prepare("
      SELECT r.id, r.title, r.description, r.file_path, r.thumbnail_path, r.card_color, r.external_url, r.mime_type, r.file_size, r.uploaded_at, r.resource_type,
             s.name as subject_name, y.display_name as year_name
      FROM resources r 
      LEFT JOIN subjects s ON r.subject_id = s.id 
      LEFT JOIN years y ON r.year_id = y.id
      WHERE r.resource_type = ? 
      ORDER BY r.uploaded_at DESC
    ");
    $stmt->execute([$resource_type]);
    return $stmt->fetchAll();
  }

  public function incrementView($resource_id) {
    $stmt = $this->pdo->prepare("INSERT INTO resource_views (resource_id, viewer_ip, user_agent) VALUES (?, ?, ?)");
    $ip = $_SERVER['REMOTE_ADDR'] ?? null;
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? null;
    $stmt->execute([$resource_id, $ip, $ua]);
    return ['success' => true];
  }

  // Flexible page content for simple static pages (e.g., journals, career)
  public function getPageContent($slug) {
    $stmt = $this->pdo->prepare("SELECT html, updated_at FROM pages WHERE slug = ? LIMIT 1");
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    if (!$row) return ['html' => '', 'updated_at' => null];
    return $row;
  }
}
