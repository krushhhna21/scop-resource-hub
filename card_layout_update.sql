-- Add thumbnail support to resources table
ALTER TABLE resources 
ADD COLUMN thumbnail_path VARCHAR(255) NULL AFTER file_path,
ADD COLUMN card_color VARCHAR(7) DEFAULT '#0ea5e9' AFTER thumbnail_path;

-- Update resource types to be more specific
UPDATE resources SET resource_type = 'journal' WHERE resource_type = 'resource' AND title LIKE '%journal%';
UPDATE resources SET resource_type = 'publication' WHERE resource_type = 'resource' AND title LIKE '%publication%';
UPDATE resources SET resource_type = 'book' WHERE resource_type = 'resource' AND title LIKE '%book%';

-- Add indexes for better performance
CREATE INDEX idx_resource_type ON resources(resource_type);
CREATE INDEX idx_resource_subject_type ON resources(subject_id, resource_type);
