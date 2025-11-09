-- Update to support card-based content for Journals, Publications, and Career sections
-- This will replace the simple page-based content with structured card entries

-- Create card_content table for journals, publications, and career items
CREATE TABLE IF NOT EXISTS card_content (
    id INT AUTO_INCREMENT PRIMARY KEY,
    section_type ENUM('journal', 'publication', 'career') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_path VARCHAR(255) NULL,
    file_path VARCHAR(255) NULL,
    external_url VARCHAR(512) NULL,
    file_size BIGINT NULL,
    mime_type VARCHAR(128) NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_card_content_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_section_active (section_type, is_active),
    INDEX idx_sort_order (section_type, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add metadata fields for different content types
ALTER TABLE card_content 
ADD COLUMN metadata JSON NULL COMMENT 'Additional metadata like author, publication date, company, etc.';

-- Update the pages table to keep existing simple page functionality as backup
-- (The pages table will remain for other potential uses)
