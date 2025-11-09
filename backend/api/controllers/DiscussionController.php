<?php
class DiscussionController {
  private $pdo;
  public function __construct(PDO $pdo) { $this->pdo = $pdo; }

  public function listChannels() : array {
    try {
      $st = $this->pdo->query("SELECT id, name, description, visibility, created_at FROM channels ORDER BY name ASC");
      return $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) { return []; }
  }

  public function createChannel(string $name, ?string $description, string $visibility='public', ?int $createdBy=null) : array {
    if (trim($name) === '') throw new Exception('name required');
    $st = $this->pdo->prepare("INSERT INTO channels (name, description, visibility, created_by) VALUES (?,?,?,?)");
    $st->execute([$name, $description, $visibility, $createdBy]);
    return ['id' => intval($this->pdo->lastInsertId()), 'ok' => true];
  }

  public function listPosts(int $channelId, ?int $afterId=null) : array {
    try {
      $sql = "SELECT p.id, p.parent_id, p.author_id, u.display_name as author_name, p.content, p.created_at\n              FROM posts p LEFT JOIN users u ON u.id = p.author_id\n              WHERE p.channel_id = :cid";
      $params = [':cid' => $channelId];
      if ($afterId) { $sql .= " AND p.id > :aid"; $params[':aid'] = $afterId; }
      $sql .= " ORDER BY p.created_at ASC LIMIT 200";
      $st = $this->pdo->prepare($sql); $st->execute($params);
      return $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) { return []; }
  }

  public function createPost(int $channelId, ?int $parentId, ?int $authorId, string $content) : array {
    if (trim($content) === '') throw new Exception('content required');
    $st = $this->pdo->prepare("INSERT INTO posts (channel_id, parent_id, author_id, content) VALUES (?,?,?,?)");
    $st->execute([$channelId, $parentId, $authorId, $content]);
    return ['id' => intval($this->pdo->lastInsertId()), 'ok' => true];
  }
}
