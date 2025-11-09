<?php
class AuthController {
  private $pdo;
  private $config;

  public function __construct(PDO $pdo, array $config) {
    $this->pdo = $pdo;
    $this->config = $config;
  }

  private function verifyIdToken(string $idToken): array {
    $log = function(string $msg, array $ctx = []) {
      static $chosen = null;
      $candidates = [
        __DIR__ . '/../auth.log',                  // backend/api/auth.log
        dirname(__DIR__) . '/auth.log',            // backend/auth.log
        sys_get_temp_dir() . '/scop_auth.log'      // /tmp fallback
      ];
      if ($chosen === null) {
        foreach ($candidates as $p) {
          // Attempt lazy create
          $test = @file_put_contents($p, '');
            if ($test !== false) { $chosen = $p; break; }
        }
        if ($chosen === null) { $chosen = $candidates[0]; }
      }
      try {
        $line = '[' . date('c') . '] ' . $msg;
        if (!empty($ctx)) { $line .= ' ' . json_encode($ctx); }
        $line .= "\n";
        @file_put_contents($chosen, $line, FILE_APPEND);
      } catch (Throwable $e) { /* ignore logging errors */ }
    };

    $decodeJwt = function(string $jwt) use ($log): ?array {
      $parts = explode('.', $jwt);
      if (count($parts) < 2) return null;
      $b64 = strtr($parts[1], '-_', '+/');
      // Add padding for base64url if missing
      $pad = strlen($b64) % 4;
      if ($pad) { $b64 .= str_repeat('=', 4 - $pad); }
      $payloadJson = base64_decode($b64);
      if ($payloadJson === false) { $log('jwt_base64_decode_failed', ['len'=>strlen($b64)]); return null; }
      $data = json_decode($payloadJson, true);
      if (!is_array($data)) { $log('jwt_json_decode_failed'); return null; }
      return $data;
    };
    // Verify via Google tokeninfo endpoint (simple, server-side)
    $fetchTokenInfo = function(string $url) {
      // Use cURL when available, otherwise fallback to file_get_contents
      if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        $resp = curl_exec($ch);
        $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        return [$http ?: 0, $resp, $err];
      }
      // Fallback without cURL
      $ctx = stream_context_create([
        'http' => [ 'method' => 'GET', 'timeout' => 10, 'ignore_errors' => true ],
        'ssl'  => [ 'verify_peer' => true, 'verify_peer_name' => true ]
      ]);
      $resp = @file_get_contents($url, false, $ctx);
      // Parse HTTP response code from $http_response_header
      $http = 0; $err = '';
      if (isset($http_response_header) && is_array($http_response_header)) {
        foreach ($http_response_header as $hdr) {
          if (preg_match('#^HTTP/\S+\s+(\d{3})#', $hdr, $m)) { $http = intval($m[1]); break; }
        }
      }
      if ($resp === false) { $err = 'network_error_or_blocked_outbound'; }
      return [$http, $resp, $err];
    };

    [$http, $resp, $err] = $fetchTokenInfo('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken));
    if ($http !== 200 || !$resp) {
      // Fallback older endpoint
      [$http2, $resp2, $err2] = $fetchTokenInfo('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=' . urlencode($idToken));
      if ($http2 === 200 && $resp2) { $resp = $resp2; $http = $http2; $err = $err2; }
    }
    $payload = $resp ? json_decode($resp, true) : null;

    $clientId = $this->config['google_client_id'] ?? null;
    if (!$clientId) throw new Exception('Server missing google_client_id config');

    if (!$payload || !isset($payload['aud'])) {
      // For localhost: allow unverified decode when enabled (dev)
      $allowDev = ($this->config['dev_allow_unverified_id_token'] ?? true) && isset($_SERVER['HTTP_HOST']) && (stripos($_SERVER['HTTP_HOST'], 'localhost') !== false || $_SERVER['HTTP_HOST'] === '127.0.0.1');
      if ($allowDev) { $payload = $decodeJwt($idToken) ?: $payload; }

      // On hosting: optionally trust JWT claims when Google is unreachable
      $allowHosting = (bool)($this->config['allow_unverified_hosting_token'] ?? false);
      // Broader hosting fallback: any non-200 with empty/invalid payload when flag enabled
      if (!$payload && $allowHosting && ($http !== 200 || $err === 'network_error_or_blocked_outbound')) {
        $payload = $decodeJwt($idToken) ?: null;
        if ($payload) {
          $log('hosting_unverified_jwt_used', ['aud' => $payload['aud'] ?? null, 'iss' => $payload['iss'] ?? null]);
        } else {
          $log('hosting_unverified_jwt_failed_decode');
        }
      }
      if (!$payload || !isset($payload['aud'])) {
        $detail = $http ? (string)$http : 'no-http';
        // Provide clearer error to surface typical hosting issues like missing cURL or blocked outbound
        $hint = function_exists('curl_init') ? '' : ' (curl_missing_fallback_used)';
        $log('token_verify_failed', ['http' => $detail, 'err' => $err]);
        throw new Exception('Failed to verify token with Google (' . $detail . ') ' . $err . $hint);
      }
    }

    if (($payload['aud'] ?? null) !== $clientId) throw new Exception('Token audience mismatch');

    // Basic checks
    if (isset($payload['exp']) && time() > intval($payload['exp'])) throw new Exception('Token expired');
    if (isset($payload['email_verified']) && !$payload['email_verified']) throw new Exception('Email not verified');
    // Optional issuer check
    if (isset($payload['iss'])) {
      $iss = $payload['iss'];
      if (!in_array($iss, ['https://accounts.google.com', 'accounts.google.com'], true)) {
        throw new Exception('Invalid token issuer');
      }
    }

    return $payload;
  }

  private function upsertUser(string $email, ?string $name): array {
    // Ensure users table exists (safe)
    $this->pdo->exec("CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(64),
      password_hash VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Self-heal legacy schema: add columns required for Google auth when missing
    try {
      $colCheck = $this->pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email'");
      $colCheck->execute();
      $hasEmail = intval($colCheck->fetchColumn()) === 1;
      if (!$hasEmail) {
        $this->pdo->exec("ALTER TABLE users
          ADD COLUMN email VARCHAR(255) UNIQUE NULL AFTER id,
          ADD COLUMN display_name VARCHAR(255) NULL AFTER email,
          ADD COLUMN role ENUM('admin','faculty','student') DEFAULT 'student' AFTER password_hash,
          ADD COLUMN is_active TINYINT(1) DEFAULT 1 AFTER role,
          ADD COLUMN is_approved TINYINT(1) DEFAULT 0 AFTER is_active,
          ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at");
        // Make username nullable to support Google-only accounts
        $this->pdo->exec("ALTER TABLE users MODIFY COLUMN username VARCHAR(64) NULL");
      }
    } catch (Throwable $e) {
      // Ignore migration errors; subsequent queries may still work if columns exist
    }

    $stmt = $this->pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($user) {
      // Update display_name if changed
      $dn = $user['display_name'] ?: '';
      if ($name && $name !== $dn) {
        $u = $this->pdo->prepare('UPDATE users SET display_name = ? WHERE id = ?');
        $u->execute([$name, $user['id']]);
        $user['display_name'] = $name;
      }
      return $user;
    }
    $ins = $this->pdo->prepare('INSERT INTO users (email, display_name, role, is_active, is_approved) VALUES (?, ?, "student", 1, 0)');
    $ins->execute([$email, $name]);
    $id = intval($this->pdo->lastInsertId());
    return [
      'id' => $id,
      'email' => $email,
      'display_name' => $name,
      'role' => 'student',
      'is_active' => 1,
      'is_approved' => 0,
    ];
  }

  public function loginWithGoogle() {
    $trace = bin2hex(random_bytes(8));
    $log = function($msg, $ctx=[]) use ($trace) {
      static $chosen = null;
      $candidates = [
        __DIR__ . '/../auth.log',
        dirname(__DIR__) . '/auth.log',
        sys_get_temp_dir() . '/scop_auth.log'
      ];
      if ($chosen === null) {
        foreach ($candidates as $p) {
          $test = @file_put_contents($p, '');
          if ($test !== false) { $chosen = $p; break; }
        }
        if ($chosen === null) { $chosen = $candidates[0]; }
      }
      try {
        $line = '['.date('c').'] trace='.$trace.' '.$msg;
        if($ctx) { $line .= ' '.json_encode($ctx); }
        $line .= "\n";
        @file_put_contents($chosen,$line,FILE_APPEND);
      } catch(Throwable $e){}
    };
    $start = microtime(true);
    $rawBody = file_get_contents('php://input');
    $log('raw_body_received', ['len' => strlen($rawBody), 'first_50' => substr($rawBody, 0, 50)]);
    $payloadRaw = json_decode($rawBody, true) ?: $_POST;
    $log('payload_parsed', ['keys' => array_keys($payloadRaw ?? [])]);
    // Support Google redirect POST (credential field) in addition to JSON id_token
    $idToken = $payloadRaw['id_token'] ?? ($payloadRaw['credential'] ?? null);
    if (!$idToken) {
      $log('id_token_missing', ['payload_keys' => array_keys($payloadRaw ?? [])]);
      throw new Exception('id_token required');
    }
    $log('id_token_received', ['token_len' => strlen($idToken)]);
    $log('verify_token_start');
    $google = $this->verifyIdToken($idToken);
    $log('verify_token_success', ['aud' => $google['aud'] ?? null, 'email' => $google['email'] ?? null]);
    $email = $google['email'] ?? null;
    if (!$email) throw new Exception('No email in token');
    $name = $payloadRaw['display_name'] ?? ($google['name'] ?? ($google['given_name'] ?? null));
    $course = $payloadRaw['course'] ?? null;
    $batchYear = isset($payloadRaw['year']) ? intval($payloadRaw['year']) : (isset($payloadRaw['batch_year']) ? intval($payloadRaw['batch_year']) : null);

    $log('upsert_user_start', ['email' => $email, 'name' => $name]);
    $user = $this->upsertUser($email, $name);
    $log('upsert_user_success', ['user_id' => $user['id']]);

    // Upsert student profile details (course, batch_year)
    try {
      $this->pdo->exec("CREATE TABLE IF NOT EXISTS student_profiles (
        user_id INT PRIMARY KEY,
        batch_year INT,
        linkedin_url VARCHAR(512),
        instagram_url VARCHAR(512),
        twitter_url VARCHAR(512),
        bio TEXT,
        avatar_url VARCHAR(512),
        course VARCHAR(128),
        CONSTRAINT fk_student_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
      if ($course !== null || $batchYear !== null) {
        $st = $this->pdo->prepare("INSERT INTO student_profiles (user_id, batch_year, course) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE batch_year = VALUES(batch_year), course = VALUES(course)");
        $st->execute([$user['id'], $batchYear, $course]);
      }
    } catch (Throwable $e) {
      // Non-fatal for login
    }

    // Auto-approve/admin bootstrap: if email in config admin_emails, promote and approve
    $adminEmails = $this->config['admin_emails'] ?? [];
    if (is_string($adminEmails)) { $adminEmails = array_filter(array_map('trim', explode(',', $adminEmails))); }
    if (in_array($email, $adminEmails, true)) {
      $this->pdo->prepare("UPDATE users SET is_approved = 1, role = 'admin' WHERE email = ?")->execute([$email]);
      // refresh user snapshot
      $stmt = $this->pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
      $stmt->execute([$email]);
      $user = $stmt->fetch(PDO::FETCH_ASSOC) ?: $user;
    } else {
      // If no admin exists at all, auto-promote the first Google login to admin (safe bootstrap)
      $cnt = intval($this->pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn());
      if ($cnt === 0) {
        $this->pdo->prepare("UPDATE users SET is_approved = 1, role = 'admin' WHERE email = ?")->execute([$email]);
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC) ?: $user;
      }
    }
    $_SESSION['user'] = [
      'id' => intval($user['id']),
      'email' => $user['email'],
      'name' => $user['display_name'] ?? $name ?? 'Student',
      'role' => $user['role'] ?? 'student',
      'approved' => intval($user['is_approved'] ?? 0) === 1,
    ];
    $durationMs = intval((microtime(true) - $start)*1000);
    $log('login_success', ['email'=>$email,'role'=>$_SESSION['user']['role'],'approved'=>$_SESSION['user']['approved'],'ms'=>$durationMs]);
    return [ 'ok' => true, 'user' => $_SESSION['user'], 'trace' => $trace, 'ms' => $durationMs ];
  }

  public function status() {
    if (isset($_SESSION['user'])) {
      return ['authenticated' => true, 'user' => $_SESSION['user']];
    }
    return ['authenticated' => false];
  }

  // Diagnostic method to force logging and show chosen log path
  public function diag() {
    $testToken = bin2hex(random_bytes(4));
    // Reuse verifyIdToken logger indirectly: just write a marker via login path's logger style
    $this->pdo->query('SELECT 1'); // minimal DB touch
    return ['diag' => true, 'ts' => date('c'), 'rand' => $testToken];
  }

  public function logout() {
    unset($_SESSION['user']);
    return ['ok' => true];
  }
}
