<?php
// uploadModel.php - file upload helper
function handle_upload(array $file, array $config, $subfolder = '') {
  if ($file['error'] !== UPLOAD_ERR_OK) {
    throw new Exception('Upload failed with error code ' . $file['error']);
  }

  if ($file['size'] > $config['max_upload_bytes']) {
    throw new Exception('File too large.');
  }

  // Try to detect mime
  $finfo = new finfo(FILEINFO_MIME_TYPE);
  $mime = $finfo->file($file['tmp_name']);
  if (!in_array($mime, $config['allowed_mime_types'])) {
    throw new Exception('Unsupported file type: ' . $mime);
  }

  $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
  $safeBase = preg_replace('/[^A-Za-z0-9_\-]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
  
  // Create directory path with optional subfolder
  $dateFolder = date('Y/m');
  $dirPath = $subfolder ? "$dateFolder/$subfolder" : $dateFolder;
  $destDir = __DIR__ . '/../uploads/' . $dirPath;
  
  if (!is_dir($destDir)) {
    mkdir($destDir, 0775, true);
  }
  
  $destName = sprintf('%s_%s.%s', $safeBase, bin2hex(random_bytes(5)), $ext);
  $destPath = $destDir . '/' . $destName;

  if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    throw new Exception('Failed to move uploaded file.');
  }

  // Return path relative to backend
  $rel = 'backend/uploads/' . $dirPath . '/' . $destName;
  return [$rel, $mime, $file['size']];
}
