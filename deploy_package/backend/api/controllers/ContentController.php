<?php
class ContentController {
    private $db;
    private $uploadDir;

    public function __construct($db) {
        $this->db = $db;
        $this->uploadDir = dirname(__DIR__, 2) . '/uploads/content/';
        if (!file_exists($this->uploadDir)) {
            mkdir($this->uploadDir, 0777, true);
        }
    }

    // Journals Methods
    public function getJournals() {
        $stmt = $this->db->prepare("SELECT * FROM journals ORDER BY created_at DESC");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function addJournal($data, $file = null) {
        $filePath = null;
        if ($file && $file['error'] === UPLOAD_ERR_OK) {
            $filePath = $this->uploadFile($file, 'journals');
        }

        $stmt = $this->db->prepare("
            INSERT INTO journals (title, authors, publication_date, journal_name, abstract, file_path, external_link, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");

        return $stmt->execute([
            $data['title'],
            $data['authors'],
            $data['publication_date'],
            $data['journal_name'],
            $data['abstract'],
            $filePath,
            $data['external_link'] ?? null,
            $data['uploaded_by']
        ]);
    }

    // Publications Methods
    public function getPublications() {
        $stmt = $this->db->prepare("SELECT * FROM publications ORDER BY created_at DESC");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function addPublication($data, $file = null) {
        $filePath = null;
        if ($file && $file['error'] === UPLOAD_ERR_OK) {
            $filePath = $this->uploadFile($file, 'publications');
        }

        $stmt = $this->db->prepare("
            INSERT INTO publications (title, authors, publication_type, publication_date, publisher, abstract, file_path, external_link, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        return $stmt->execute([
            $data['title'],
            $data['authors'],
            $data['publication_type'],
            $data['publication_date'],
            $data['publisher'],
            $data['abstract'],
            $filePath,
            $data['external_link'] ?? null,
            $data['uploaded_by']
        ]);
    }

    // Career Methods
    public function getCareers() {
        $stmt = $this->db->prepare("SELECT * FROM careers WHERE is_active = TRUE ORDER BY created_at DESC");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function addCareer($data) {
        $stmt = $this->db->prepare("
            INSERT INTO careers (title, company_name, location, description, requirements, salary_range, application_link, posting_date, deadline_date, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        return $stmt->execute([
            $data['title'],
            $data['company_name'],
            $data['location'],
            $data['description'],
            $data['requirements'],
            $data['salary_range'] ?? null,
            $data['application_link'],
            $data['posting_date'],
            $data['deadline_date'],
            $data['uploaded_by']
        ]);
    }

    // Previous Questions Methods
    public function getPreviousQuestions($yearId = null, $subjectId = null) {
        $sql = "SELECT * FROM previous_questions";
        $params = [];

        if ($yearId && $subjectId) {
            $sql .= " WHERE year_id = ? AND subject_id = ?";
            $params = [$yearId, $subjectId];
        } elseif ($yearId) {
            $sql .= " WHERE year_id = ?";
            $params = [$yearId];
        }

        $sql .= " ORDER BY exam_year DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function addPreviousQuestion($data, $file) {
        $filePath = null;
        if ($file && $file['error'] === UPLOAD_ERR_OK) {
            $filePath = $this->uploadFile($file, 'questions');
        }

        $stmt = $this->db->prepare("
            INSERT INTO previous_questions (year_id, subject_id, exam_year, exam_type, title, file_path, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");

        return $stmt->execute([
            $data['year_id'],
            $data['subject_id'],
            $data['exam_year'],
            $data['exam_type'],
            $data['title'],
            $filePath,
            $data['uploaded_by']
        ]);
    }

    private function uploadFile($file, $subfolder) {
        $targetDir = $this->uploadDir . $subfolder . '/';
        if (!file_exists($targetDir)) {
            mkdir($targetDir, 0777, true);
        }

        $fileName = uniqid() . '_' . basename($file['name']);
        $targetPath = $targetDir . $fileName;
        
        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            return $subfolder . '/' . $fileName;
        }
        throw new Exception("Failed to upload file");
    }
}
?>