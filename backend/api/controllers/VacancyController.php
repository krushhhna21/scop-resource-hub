<?php
class VacancyController {
  private $pdo;
  public function __construct(PDO $pdo) { $this->pdo = $pdo; }

  public function listVacancies(?string $q=null, ?string $category=null, ?int $batch=null) : array {
    try {
      // Detect optional columns to avoid empty results on older schemas
      $dbName = $this->pdo->query("SELECT DATABASE()")->fetchColumn();
      $hasIsActive = false;
      $hasBatchFilter = false;
      try {
        $stmtCols = $this->pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'vacancies' AND COLUMN_NAME = 'is_active'");
        $stmtCols->execute([$dbName]);
        $hasIsActive = intval($stmtCols->fetchColumn()) > 0;
        $stmtCols = $this->pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'vacancies' AND COLUMN_NAME = 'batch_filter'");
        $stmtCols->execute([$dbName]);
        $hasBatchFilter = intval($stmtCols->fetchColumn()) > 0;
      } catch (Throwable $e) {
        // If INFORMATION_SCHEMA not available, be permissive
        $hasIsActive = false; $hasBatchFilter = true;
      }

      $sql = "SELECT v.id, v.title, v.company, v.location, v.category, v.description, v.application_link, v.batch_filter, v.created_at, u.display_name as posted_by_name\n              FROM vacancies v LEFT JOIN users u ON u.id = v.posted_by\n              WHERE " . ($hasIsActive ? "v.is_active = 1" : "1=1");
      $params = [];
      if ($q) { $sql .= " AND (v.title LIKE :q OR v.company LIKE :q OR v.location LIKE :q)"; $params[':q'] = "%$q%"; }
      if ($category) { $sql .= " AND v.category = :c"; $params[':c'] = $category; }
      if ($batch && $hasBatchFilter) { $sql .= " AND (v.batch_filter IS NULL OR v.batch_filter = :b)"; $params[':b'] = $batch; }
      $sql .= " ORDER BY v.created_at DESC LIMIT 200";
      $st = $this->pdo->prepare($sql); $st->execute($params);
      return $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) { return []; }
  }

  public function createVacancy(string $title, ?string $company, ?string $location, ?string $category, ?string $description, ?string $applicationLink, ?int $postedBy, ?int $batchFilter) : array {
    if (trim($title) === '') throw new Exception('title required');
    $st = $this->pdo->prepare("INSERT INTO vacancies (title, company, location, category, description, application_link, posted_by, batch_filter) VALUES (?,?,?,?,?,?,?,?)");
    $st->execute([$title, $company, $location, $category, $description, $applicationLink, $postedBy, $batchFilter]);
    return ['id' => intval($this->pdo->lastInsertId()), 'ok' => true];
  }

  public function requestReferral(int $vacancyId, int $requesterId, ?string $message) : array {
    $st = $this->pdo->prepare("INSERT INTO referral_requests (vacancy_id, requester_id, message) VALUES (?,?,?)");
    $st->execute([$vacancyId, $requesterId, $message]);
    return ['id' => intval($this->pdo->lastInsertId()), 'ok' => true];
  }
}
