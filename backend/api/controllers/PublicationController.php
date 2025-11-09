<?php
class PublicationController {
  private $pdo;
  public function __construct(PDO $pdo) { $this->pdo = $pdo; }

  public function listPublications(?string $q=null, ?string $authorRole=null, ?int $approved=null) : array {
    try {
      $sql = "SELECT id, title, url, author_name, author_role, is_approved, created_at FROM publications WHERE 1";
      $params = [];
      if ($q) { $sql .= " AND (title LIKE :q OR author_name LIKE :q)"; $params[':q'] = "%$q%"; }
      if ($authorRole) { $sql .= " AND author_role = :ar"; $params[':ar'] = $authorRole; }
      if ($approved !== null) { $sql .= " AND is_approved = :app"; $params[':app'] = $approved ? 1 : 0; }
      $sql .= " ORDER BY created_at DESC LIMIT 200";
      $st = $this->pdo->prepare($sql); $st->execute($params);
      return $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) { return []; }
  }

  public function createPublication(string $title, ?string $url, ?string $authorName, ?string $authorRole='student') : array {
    if (trim($title) === '') throw new Exception('title required');
    try {
      $st = $this->pdo->prepare("INSERT INTO publications (title, url, author_name, author_role, is_approved) VALUES (?,?,?,?,0)");
      $st->execute([$title, $url, $authorName, $authorRole]);
      return ['id' => intval($this->pdo->lastInsertId()), 'ok' => true];
    } catch (Throwable $e) { throw new Exception('failed to create publication: '.$e->getMessage()); }
  }

  public function approvePublication(int $id) : array {
    $st = $this->pdo->prepare("UPDATE publications SET is_approved=1 WHERE id=?");
    $st->execute([$id]);
    return ['ok' => true];
  }

  public function deletePublication(int $id) : array {
    $st = $this->pdo->prepare("DELETE FROM publications WHERE id=?");
    $st->execute([$id]);
    return ['ok' => true];
  }
}
