-- PYQ Links Management Table
-- Stores admin-managed links for Previous Year Questions per year or globally

CREATE TABLE IF NOT EXISTS pyq_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year_id INT NULL,  -- NULL means global link for all years
  link_url VARCHAR(512) NOT NULL,
  description VARCHAR(255) NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_year_link (year_id),  -- Only one link per year (NULL for global)
  CONSTRAINT fk_pyq_year FOREIGN KEY (year_id) REFERENCES years(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default global link (optional - remove if not needed)
-- INSERT INTO pyq_links (year_id, link_url, description) VALUES 
--   (NULL, 'https://example.com/pyq', 'Global PYQ link for all years');
