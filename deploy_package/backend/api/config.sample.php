<?php
// Copy this file to config.php and fill in DB credentials.
return [
  'db_host' => '127.0.0.1',
  'db_name' => 'scop_resource_hub',
  'db_user' => 'root',
  'db_pass' => '',
  // Max upload size in bytes (e.g., ~25 MB)
  'max_upload_bytes' => 26214400,
  // Allowed mime types
  'allowed_mime_types' => [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'text/plain'
  ]
];
