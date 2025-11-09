<?php
class DirectoryController {
  private $pdo;
  public function __construct(PDO $pdo) { $this->pdo = $pdo; }

  public function listStudents(?string $q=null, ?int $batch=null) : array {
    try {
      $sql = "SELECT u.id, u.display_name, sp.batch_year, sp.linkedin_url, sp.instagram_url, sp.twitter_url, sp.avatar_url\n              FROM users u LEFT JOIN student_profiles sp ON sp.user_id = u.id\n              WHERE u.role = 'student' AND u.is_active = 1";
      $params = [];
      if ($q) { $sql .= " AND (u.display_name LIKE :q OR sp.linkedin_url LIKE :q)"; $params[':q'] = "%$q%"; }
      if ($batch) { $sql .= " AND sp.batch_year = :b"; $params[':b'] = $batch; }
      $sql .= " ORDER BY sp.batch_year DESC, u.display_name ASC LIMIT 500";
      $st = $this->pdo->prepare($sql); $st->execute($params);
      return $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) { return []; }
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
}
