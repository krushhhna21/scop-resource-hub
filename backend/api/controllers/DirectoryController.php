<?php
class DirectoryController {
  private $pdo;
  public function __construct(PDO $pdo) { $this->pdo = $pdo; }

  public function listStudents(?string $q=null, ?int $batch=null) : array {
    try {
      $dbName = $this->pdo->query("SELECT DATABASE()")->fetchColumn();
      $hasIsActive = $this->hasColumn($dbName, 'users', 'is_active');
      $hasIsApproved = $this->hasColumn($dbName, 'users', 'is_approved');
      $hasRole = $this->hasColumn($dbName, 'users', 'role');

      $params = [];
      $baseWhere = [];
      if ($hasRole) { $baseWhere[] = "(u.role = 'student' OR u.role IS NULL OR u.role = '' OR u.role='user')"; }
      if ($hasIsActive) { $baseWhere[] = 'u.is_active = 1'; }
      if ($hasIsApproved) { $baseWhere[] = 'u.is_approved = 1'; }
      if ($q) { $baseWhere[] = '(u.display_name LIKE :q OR sp.linkedin_url LIKE :q)'; $params[':q'] = "%$q%"; }
      if ($batch) { $baseWhere[] = 'sp.batch_year = :b'; $params[':b'] = $batch; }
      if (empty($baseWhere)) { $baseWhere[] = '1=1'; }

      $sql = "SELECT u.id, u.display_name, sp.batch_year, sp.course, sp.linkedin_url, sp.instagram_url, sp.twitter_url, sp.avatar_url\n              FROM users u LEFT JOIN student_profiles sp ON sp.user_id = u.id\n              WHERE " . implode(' AND ', $baseWhere) . " ORDER BY sp.batch_year DESC, u.display_name ASC LIMIT 500";
      $st = $this->pdo->prepare($sql); $st->execute($params);
      return $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) { return []; }
  }

  private function hasColumn($db, $table, $col) : bool {
    try {
      $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?");
      $stmt->execute([$db, $table, $col]);
      return intval($stmt->fetchColumn()) > 0;
    } catch (Throwable $e) { return false; }
  }

  public function upsertStudentProfile(int $userId, ?int $batchYear, ?string $linkedin, ?string $instagram, ?string $twitter, ?string $bio, ?string $avatar) : array {
    $this->pdo->beginTransaction();
    try {
      // ensure user exists
      $this->pdo->prepare("INSERT IGNORE INTO users (id, role, is_active) VALUES (?, 'student', 1)")->execute([$userId]);
      // upsert profile
      $st = $this->pdo->prepare("INSERT INTO student_profiles (user_id, batch_year, linkedin_url, instagram_url, twitter_url, bio, avatar_url)\n        VALUES (?,?,?,?,?,?,?)\n        ON DUPLICATE KEY UPDATE batch_year=VALUES(batch_year), linkedin_url=VALUES(linkedin_url), instagram_url=VALUES(instagram_url), twitter_url=VALUES(twitter_url), bio=VALUES(bio), avatar_url=VALUES(avatar_url)");
      $st->execute([$userId, $batchYear, $linkedin, $instagram, $twitter, $bio, $avatar]);
      $this->pdo->commit();
      return ['ok' => true];
    } catch (Throwable $e) { $this->pdo->rollBack(); throw new Exception('failed to upsert: '.$e->getMessage()); }
  }

  // List featured students for public directory showcase
  public function listFeaturedStudents() : array {
    try {
      $sql = "SELECT fs.id, fs.user_id, fs.profile_photo, fs.linkedin_url, fs.instagram_url, fs.email, fs.bio, fs.display_order,
                     u.display_name, sp.batch_year, sp.course
              FROM featured_students fs
              JOIN users u ON fs.user_id = u.id
              LEFT JOIN student_profiles sp ON sp.user_id = fs.user_id
              WHERE fs.is_active = 1
              ORDER BY fs.display_order ASC, fs.id ASC";
      $stmt = $this->pdo->query($sql);
      return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) {
      // If table doesn't exist yet, return empty array
      return [];
    }
  }
}

