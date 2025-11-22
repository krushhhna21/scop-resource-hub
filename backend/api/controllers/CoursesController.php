<?php
class CoursesController {
    private $pdo;
    public function __construct($pdo) { $this->pdo = $pdo; }

    private function assertAdmin() {
        // Align with AdminController authentication semantics
        $hasLegacy = isset($_SESSION['admin_user']);
        $hasGoogleAdmin = isset($_SESSION['user']) && isset($_SESSION['user']['role']) && $_SESSION['user']['role'] === 'admin';
        if (!($hasLegacy || $hasGoogleAdmin)) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized.']);
            exit;
        }
    }

    public function listPublic($limit = 50) {
        $limit = max(1, min(200, intval($limit)));
        $stmt = $this->pdo->prepare('SELECT id,title,category,summary,level,duration,apply_link FROM courses WHERE is_active = 1 ORDER BY created_at DESC LIMIT ?');
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function listAdmin() {
        $this->assertAdmin();
        $stmt = $this->pdo->query('SELECT * FROM courses ORDER BY created_at DESC');
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function create($title, $category, $summary, $level, $duration, $apply_link, $is_active) {
        $this->assertAdmin();
        $title = trim($title);
        if ($title === '') { return ['error' => 'title_required']; }
        $is_active = $is_active ? 1 : 0;
        $stmt = $this->pdo->prepare('INSERT INTO courses (title,category,summary,level,duration,apply_link,is_active) VALUES (?,?,?,?,?,?,?)');
        $stmt->execute([$title,$category,$summary,$level,$duration,$apply_link,$is_active]);
        return ['success' => true, 'id' => $this->pdo->lastInsertId()];
    }

    public function update($id, $title, $category, $summary, $level, $duration, $apply_link, $is_active) {
        $this->assertAdmin();
        $id = intval($id);
        if ($id <= 0) { return ['error' => 'id_required']; }
        $title = trim($title);
        if ($title === '') { return ['error' => 'title_required']; }
        $is_active = $is_active ? 1 : 0;
        $stmt = $this->pdo->prepare('UPDATE courses SET title=?, category=?, summary=?, level=?, duration=?, apply_link=?, is_active=? WHERE id=?');
        $stmt->execute([$title,$category,$summary,$level,$duration,$apply_link,$is_active,$id]);
        return ['success' => true];
    }

    public function delete($id) {
        $this->assertAdmin();
        $id = intval($id);
        if ($id <= 0) { return ['error' => 'id_required']; }
        $stmt = $this->pdo->prepare('DELETE FROM courses WHERE id=?');
        $stmt->execute([$id]);
        return ['success' => true];
    }
}
