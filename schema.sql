-- Database schema for SCOP Pharm D Resource Hub
-- Engine: InnoDB; Charset: utf8mb4

-- Users table (extended for Google auth + roles)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NULL,
  username VARCHAR(64) NULL UNIQUE,
  display_name VARCHAR(255) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','faculty','student') DEFAULT 'student',
  is_active TINYINT(1) DEFAULT 1,
  is_approved TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS years (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year_number TINYINT NOT NULL UNIQUE, -- 1..6
  display_name VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year_id INT NOT NULL,
  name VARCHAR(128) NOT NULL,
  description TEXT NULL,
  UNIQUE KEY uniq_year_subject (year_id, name),
  CONSTRAINT fk_subject_year FOREIGN KEY (year_id) REFERENCES years(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  resource_type VARCHAR(50) NOT NULL DEFAULT 'resource', -- 'resource', 'book', 'question'
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  file_path VARCHAR(255) NULL,     -- stored file path under backend/uploads
  external_url VARCHAR(512) NULL,  -- optional external link instead of file
  mime_type VARCHAR(128) NULL,
  file_size BIGINT NULL,
  uploaded_by INT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_resource_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT fk_resource_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS resource_views (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  resource_id INT NOT NULL,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  viewer_ip VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  CONSTRAINT fk_view_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
  INDEX idx_resource_time (resource_id, viewed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Student profiles table (used by directory & approval UI)
CREATE TABLE IF NOT EXISTS student_profiles (
  user_id INT PRIMARY KEY,
  batch_year INT NULL,
  linkedin_url VARCHAR(512),
  instagram_url VARCHAR(512),
  twitter_url VARCHAR(512),
  bio TEXT,
  avatar_url VARCHAR(512),
  course VARCHAR(128),
  CONSTRAINT fk_student_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed years 1..6
INSERT IGNORE INTO years (year_number, display_name) VALUES
  (1, 'Pharm D - 1st Year'),
  (2, 'Pharm D - 2nd Year'),
  (3, 'Pharm D - 3rd Year'),
  (4, 'Pharm D - 4th Year'),
  (5, 'Pharm D - 5th Year'),
  (6, 'Pharm D - 6th Year');

-- Complete Pharm D subjects for all years
INSERT INTO subjects (year_id, name, description)
SELECT y.id, s.name, s.description
FROM years y
JOIN (
  -- Pharm D 1st Year
  SELECT 1 AS year_number, 'Human Anatomy and Physiology' AS name, 'Study of the human body\'s structure and functions' AS description
  UNION ALL SELECT 1, 'Medicinal Biochemistry', 'Exploration of biochemical processes and their relation to medicine'
  UNION ALL SELECT 1, 'Pharmaceutical Inorganic Chemistry', 'Study of inorganic compounds used in pharmaceuticals'
  UNION ALL SELECT 1, 'Pharmaceutics', 'Fundamentals of dosage forms and drug delivery systems'
  UNION ALL SELECT 1, 'Pharmaceutical Organic Chemistry', 'Study of organic compounds used in pharmaceuticals'
  UNION ALL SELECT 1, 'Remedial Mathematics/Biology', 'Review of mathematical and biological concepts essential for pharmacy'
  
  -- Pharm D 2nd Year
  UNION ALL SELECT 2, 'Pathophysiology', 'Study of diseases and their effects on the body'
  UNION ALL SELECT 2, 'Pharmaceutical Microbiology', 'Exploration of microorganisms and their role in pharmaceuticals'
  UNION ALL SELECT 2, 'Pharmacognosy & Phytopharmaceuticals', 'Study of medicinal plants and their pharmaceutical applications'
  UNION ALL SELECT 2, 'Pharmacology-I', 'Introduction to pharmacology and drug action'
  UNION ALL SELECT 2, 'Community Pharmacy', 'Principles and practices of community pharmacy'
  UNION ALL SELECT 2, 'Pharmacotherapeutics-I', 'Application of pharmacology to therapeutics'
  
  -- Pharm D 3rd Year
  UNION ALL SELECT 3, 'Pharmacology-II', 'In-depth study of pharmacology and drug action'
  UNION ALL SELECT 3, 'Pharmaceutical Analysis', 'Techniques and methods for analyzing pharmaceuticals'
  UNION ALL SELECT 3, 'Pharmacotherapeutics-II', 'Advanced application of pharmacology to therapeutics'
  UNION ALL SELECT 3, 'Pharmaceutical Jurisprudence', 'Study of laws and regulations governing pharmacy practice'
  UNION ALL SELECT 3, 'Medicinal Chemistry', 'Design, synthesis, and development of pharmaceuticals'
  UNION ALL SELECT 3, 'Pharmaceutical Formulations', 'Development and preparation of pharmaceutical dosage forms'
  
  -- Pharm D 4th Year
  UNION ALL SELECT 4, 'Pharmacotherapeutics-III', 'Advanced application of pharmacology to therapeutics'
  UNION ALL SELECT 4, 'Hospital Pharmacy', 'Principles and practices of hospital pharmacy'
  UNION ALL SELECT 4, 'Clinical Pharmacy', 'Application of pharmacy practice in clinical settings'
  UNION ALL SELECT 4, 'Biostatistics & Research Methodology', 'Statistical analysis and research design in pharmacy'
  UNION ALL SELECT 4, 'Biopharmaceutics & Pharmacokinetics', 'Study of drug absorption, distribution, metabolism, and excretion'
  UNION ALL SELECT 4, 'Clinical Toxicology', 'Study of toxic substances and their effects on the body'
  
  -- Pharm D 5th Year
  UNION ALL SELECT 5, 'Clinical Research', 'Principles and practices of clinical research'
  UNION ALL SELECT 5, 'Pharmacoepidemiology and Pharmacoeconomics', 'Study of drug use and economic analysis in healthcare'
  UNION ALL SELECT 5, 'Clinical Pharmacokinetics & Pharmacotherapeutic Drug Monitoring', 'Application of pharmacokinetics to optimize drug therapy'
  UNION ALL SELECT 5, 'Clerkship', 'Practical experience in clinical settings'
  UNION ALL SELECT 5, 'Project Work', 'Research project on a pharmaceutical topic'
  
  -- Pharm D 6th Year
  UNION ALL SELECT 6, 'Internship', 'Practical experience in hospital or clinical settings, including postings in specialty units like General Medicine, Surgery, Pediatrics, and Psychiatry'
) s ON s.year_number = y.year_number
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE year_id = y.id AND name = s.name);

-- Vacancies table (career openings / internships)
CREATE TABLE IF NOT EXISTS vacancies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NULL,
  location VARCHAR(255) NULL,
  category VARCHAR(64) NULL,
  description TEXT NULL,
  application_link VARCHAR(512) NULL,
  posted_by INT NULL,
  batch_filter INT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vacancy_user FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Referral requests table (students requesting referrals for vacancies)
CREATE TABLE IF NOT EXISTS referral_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vacancy_id INT NOT NULL,
  requester_id INT NOT NULL,
  message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_referral_vacancy FOREIGN KEY (vacancy_id) REFERENCES vacancies(id) ON DELETE CASCADE,
  CONSTRAINT fk_referral_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
