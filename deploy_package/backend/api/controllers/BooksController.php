<?php
class BooksController {
    private $db;
    private $uploadDir;

    public function __construct($db) {
        $this->db = $db;
        $this->uploadDir = dirname(__DIR__, 2) . '/uploads/books/';
        if (!file_exists($this->uploadDir)) {
            mkdir($this->uploadDir, 0777, true);
        }
    }

    public function getBooks() {
        $stmt = $this->db->prepare("SELECT * FROM books ORDER BY created_at DESC");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getBooksByYear($yearId) {
        $stmt = $this->db->prepare("SELECT * FROM books WHERE year_id = ? ORDER BY created_at DESC");
        $stmt->execute([$yearId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function addBook($data, $file = null) {
        $filePath = null;
        if ($file && $file['error'] === UPLOAD_ERR_OK) {
            $filePath = $this->uploadFile($file);
        }

        $stmt = $this->db->prepare("
            INSERT INTO books (title, author, description, cover_image, file_path, year_id, subject_id, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");

        return $stmt->execute([
            $data['title'],
            $data['author'],
            $data['description'],
            $data['cover_image'] ?? null,
            $filePath,
            $data['year_id'] ?? null,
            $data['subject_id'] ?? null,
            $data['uploaded_by']
        ]);
    }

    private function uploadFile($file) {
        $fileName = uniqid() . '_' . basename($file['name']);
        $targetPath = $this->uploadDir . $fileName;
        
        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            return 'books/' . $fileName;
        }
        throw new Exception("Failed to upload file");
    }

    public function deleteBook($id) {
        $stmt = $this->db->prepare("DELETE FROM books WHERE id = ?");
        return $stmt->execute([$id]);
    }
}
?>