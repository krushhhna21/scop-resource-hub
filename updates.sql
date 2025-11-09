-- Add new tables for different content types

-- Books table
CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image VARCHAR(255),
    file_path VARCHAR(255),
    year_id INT,
    subject_id INT,
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (year_id) REFERENCES years(id) ON DELETE SET NULL,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Journals table
CREATE TABLE IF NOT EXISTS journals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    authors VARCHAR(255) NOT NULL,
    publication_date DATE,
    journal_name VARCHAR(255),
    abstract TEXT,
    file_path VARCHAR(255),
    external_link VARCHAR(512),
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Publications table
CREATE TABLE IF NOT EXISTS publications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    authors VARCHAR(255) NOT NULL,
    publication_type ENUM('article', 'research_paper', 'thesis', 'other'),
    publication_date DATE,
    publisher VARCHAR(255),
    abstract TEXT,
    file_path VARCHAR(255),
    external_link VARCHAR(512),
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Career opportunities table
CREATE TABLE IF NOT EXISTS careers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    location VARCHAR(255),
    description TEXT,
    requirements TEXT,
    salary_range VARCHAR(100),
    application_link VARCHAR(512),
    posting_date DATE,
    deadline_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Previous year questions table
CREATE TABLE IF NOT EXISTS previous_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year_id INT NOT NULL,
    subject_id INT NOT NULL,
    exam_year YEAR,
    exam_type ENUM('internal', 'external', 'other'),
    title VARCHAR(255) NOT NULL,
    file_path VARCHAR(255),
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (year_id) REFERENCES years(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pages table for simple HTML content per section (e.g., journals, career)
CREATE TABLE IF NOT EXISTS pages (
    slug VARCHAR(64) PRIMARY KEY,
    html MEDIUMTEXT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add year_id column to resources table for direct year association (useful for questions without subjects)
ALTER TABLE resources ADD COLUMN year_id INT NULL AFTER subject_id;
ALTER TABLE resources ADD CONSTRAINT fk_resource_year FOREIGN KEY (year_id) REFERENCES years(id) ON DELETE SET NULL;

-- Make subject_id nullable to allow questions without subjects
ALTER TABLE resources MODIFY COLUMN subject_id INT(11) NULL;-- Update to support card-based content for Journals, Publications, and Career sections
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