<?php
return [
  'db_host' => '127.0.0.1',
  'db_name' => 'scop_resource_hub',
  'db_user' => 'root',
  'db_pass' => 'chalwad111',
  'max_upload_bytes' => 26214400,
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
  ,
  // Gemini AI settings
  'gemini_api_key' => '',
  'gemini_model' => 'gemini-1.5-flash',
  'google_client_id' => '614874768179-jeif5hfmlgs7f67mqct37t42soq7qhdg.apps.googleusercontent.com'
];