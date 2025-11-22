-- Featured Students Table
-- Admins can select students to showcase in the Directory section
-- with profile photo and social links

CREATE TABLE IF NOT EXISTS featured_students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  profile_photo VARCHAR(512) NULL,  -- URL or path to profile photo
  linkedin_url VARCHAR(512) NULL,
  instagram_url VARCHAR(512) NULL,
  email VARCHAR(255) NULL,
  bio TEXT NULL,  -- Short bio or description
  display_order INT DEFAULT 0,  -- Order in which to display (lower = first)
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_featured_student_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_display_order (display_order, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional: Add sample featured students (replace with actual user IDs after seeding users)
-- INSERT INTO featured_students (user_id, profile_photo, linkedin_url, instagram_url, email, bio, display_order) VALUES
--   (2, 'https://example.com/photo1.jpg', 'https://linkedin.com/in/student1', 'https://instagram.com/student1', 'student1@example.com', 'Outstanding performer in clinical pharmacy', 1),
--   (3, 'https://example.com/photo2.jpg', 'https://linkedin.com/in/student2', 'https://instagram.com/student2', 'student2@example.com', 'Research excellence award winner', 2);
