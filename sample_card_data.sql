-- Sample data for testing the new card layout
-- Insert some test resources with thumbnails and colors

-- First, let's insert a journal resource
INSERT INTO resources (subject_id, year_id, title, description, file_path, thumbnail_path, card_color, external_url, mime_type, file_size, resource_type, uploaded_by)
VALUES 
(1, 1, 'Introduction to Pharmacology', 'Comprehensive guide covering basic pharmacological principles and drug interactions', 'backend/uploads/2025/09/pharmacology_guide_abc123.pdf', NULL, '#ef4444', NULL, 'application/pdf', 2300000, 'journal', 1),

(2, 1, 'Drug Chemistry Fundamentals', 'Essential chemistry concepts for pharmaceutical sciences', NULL, NULL, '#10b981', 'https://example.com/chemistry-fundamentals', NULL, NULL, 'journal', 1),

(3, 2, 'Clinical Pharmacy Practice', 'Modern approaches to clinical pharmacy and patient care', 'backend/uploads/2025/09/clinical_practice_def456.pdf', NULL, '#8b5cf6', NULL, 'application/pdf', 1800000, 'publication', 1),

(1, 1, 'Notes for DBMS', 'Comprehensive database management system study notes covering all key concepts', 'backend/uploads/2025/09/dbms_notes_789xyz.pdf', NULL, '#0ea5e9', NULL, 'application/pdf', 2300000, 'book', 1);

-- Update config to include more file types in allowed_mime_types
-- This is just for reference, actual config is in PHP files
