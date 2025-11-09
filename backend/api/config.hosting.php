<?php
return [
  // InfinityFree database credentials (update password to your vPanel password)
  'db_host' => 'sql113.infinityfree.com',
  'db_name' => 'if0_40042826_scop_db',
  'db_user' => 'if0_40042826',
  'db_pass' => 'AlExu1jElp',
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
  ],
  // Google Sign-In Client ID required by AuthController
  'google_client_id' => '614874768179-jeif5hfmlgs7f67mqct37t42soq7qhdg.apps.googleusercontent.com',
  // Optional: comma separated admin emails to auto-promote/approve
  'admin_emails' => 'krishnachalwad21@gmail.com',
  // When outbound requests to Google tokeninfo are blocked by hosting, allow
  // unverified JWT payload usage (still checks aud matches client ID and issuer)
  'allow_unverified_hosting_token' => true,
  
  // Gemini (Google AI Studio) configuration for ChatController.
  // Paste your free API key BELOW (keep it secret; do NOT commit real key to public repo).
  // Example placeholder: 'gemini_api_key' => 'YOUR_GEMINI_KEY_HERE'
  // Supported model examples: 'gemini-1.5-flash-latest', 'gemini-1.5-pro-latest'
  'gemini_api_key' => getenv('GEMINI_API_KEY') ?: 'AIzaSyB20kFF1Gk0QaJ2Fp2Cbol3mxJDTAVH3wg',
  'gemini_model'   => 'gemini-1.5-flash-latest',
  'gemini_api_version' => 'v1beta'
];