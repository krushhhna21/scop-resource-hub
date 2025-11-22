<?php
// Robust JSON error handling for all PHP errors/exceptions, even before try/catch
header('Content-Type: application/json');
// Help Google Identity in some hosting environments by setting COOP/COEP for API responses.
// Note: static HTML still needs server headers (via .htaccess) for full One Tap support.
header('Cross-Origin-Opener-Policy: same-origin-allow-popups');
header('Cross-Origin-Embedder-Policy: unsafe-none');
// Lightweight server-side error logger with writable-path fallbacks.
function _log_error_to_file($tag, $msg, $extra = null) {
  try {
    $line = '[' . date('c') . '] ' . $tag . ' ' . $msg;
    if ($extra) { $line .= ' ' . (is_string($extra) ? $extra : json_encode($extra)); }
    $line .= "\n";

    // Preferred locations (within allowed open_basedir paths):
    $candidates = [
      __DIR__ . '/error.log',         // backend/api/error.log
      dirname(__DIR__) . '/error.log',// backend/error.log
      sys_get_temp_dir() . '/scop_error.log'
    ];

    foreach ($candidates as $path) {
      // Try to append without creating directories (avoid mkdir on restricted hosts)
      $res = @file_put_contents($path, $line, FILE_APPEND | LOCK_EX);
      if ($res !== false) return true;
    }
  } catch (Throwable $e) { /* ignore logging errors */ }
  return false;
}
set_exception_handler(function($e){
  // Log and return minimal error to client
  _log_error_to_file('exception', $e->getMessage(), ['type' => get_class($e), 'file' => $e->getFile(), 'line' => $e->getLine(), 'trace' => $e->getTraceAsString()]);
  http_response_code(400);
  echo json_encode(['error'=>'exception','message'=>$e->getMessage(),'type'=>get_class($e)]);
  exit;
});
set_error_handler(function($severity, $message, $file, $line){
  throw new ErrorException($message, 0, $severity, $file, $line);
});
register_shutdown_function(function(){
  $e = error_get_last();
  if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
    // Log fatal shutdown info
    _log_error_to_file('shutdown_fatal', json_encode($e));
    http_response_code(500);
    echo json_encode(['error'=>'fatal','detail'=>'server_error']);
  }
});

session_start();

// Allow simple CORS for dev (adjust for prod)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: GET,POST,OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  exit;
}
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/db.php';
// Defer loading controllers until needed per action to avoid fatal errors blocking all routes

// Select config: use local only on localhost; else prefer hosting config if present
$host = $_SERVER['HTTP_HOST'] ?? '';
$isLocal = !$host || $host === 'localhost' || $host === '127.0.0.1';
$useHosting = (getenv('USE_HOSTING_CONFIG') === '1');
$configPath = __DIR__ . '/config.php';
if ($isLocal && file_exists(__DIR__ . '/config.local.php')) {
  $configPath = __DIR__ . '/config.local.php';
} elseif ((!$isLocal || $useHosting) && file_exists(__DIR__ . '/config.hosting.php')) {
  $configPath = __DIR__ . '/config.hosting.php';
}
$config = require $configPath;

// Lazy factories for controllers (loaded only when used)
function ctrl_admin() {
  static $o = null; global $pdo, $config; if ($o === null) { require_once __DIR__ . '/controllers/AdminController.php'; $o = new AdminController($pdo, $config); } return $o; }
function ctrl_student() {
  static $o = null; global $pdo; if ($o === null) { require_once __DIR__ . '/controllers/StudentController.php'; $o = new StudentController($pdo); } return $o; }
function ctrl_chat() {
  static $o = null; global $config; if ($o === null) { require_once __DIR__ . '/controllers/ChatController.php'; $o = new ChatController($config); } return $o; }
function ctrl_pub() {
  static $o = null; global $pdo; if ($o === null) { require_once __DIR__ . '/controllers/PublicationController.php'; $o = new PublicationController($pdo); } return $o; }
function ctrl_dir() {
  static $o = null; global $pdo; if ($o === null) { require_once __DIR__ . '/controllers/DirectoryController.php'; $o = new DirectoryController($pdo); } return $o; }
function ctrl_vac() {
  static $o = null; global $pdo; if ($o === null) { require_once __DIR__ . '/controllers/VacancyController.php'; $o = new VacancyController($pdo); } return $o; }
function ctrl_disc() {
  static $o = null; global $pdo; if ($o === null) { require_once __DIR__ . '/controllers/DiscussionController.php'; $o = new DiscussionController($pdo); } return $o; }
function ctrl_auth() {
  static $o = null; global $pdo, $config; if ($o === null) { require_once __DIR__ . '/controllers/AuthController.php'; $o = new AuthController($pdo, $config); } return $o; }
function ctrl_news() {
  static $o = null; global $pdo; if ($o === null) { require_once __DIR__ . '/controllers/NewsController.php'; $o = new NewsController($pdo); } return $o; }
function ctrl_contact() {
  static $o = null; global $pdo; if ($o === null) { require_once __DIR__ . '/controllers/ContactController.php'; $o = new ContactController($pdo); } return $o; }
function ctrl_courses() {
  static $o = null; global $pdo; if ($o === null) {
    $path = __DIR__ . '/controllers/CoursesController.php';
    if (!file_exists($path)) {
      // Provide clearer diagnostic than raw require_once warning
      throw new RuntimeException('CoursesController missing on server. Deploy file backend/api/controllers/CoursesController.php');
    }
    require_once $path; $o = new CoursesController($pdo); }
  return $o; }

$action = $_GET['action'] ?? $_POST['action'] ?? null;

// Helper: require approved student session for resource endpoints
function require_approved_student() {
  if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['error' => 'auth_required']);
    exit;
  }
  if (!($_SESSION['user']['approved'] ?? false)) {
    http_response_code(403);
    echo json_encode(['error' => 'approval_required']);
    exit;
  }
}

function json_ok($data) { echo json_encode($data); exit; }
function json_err($msg, $code=400, $extra=null) {
  http_response_code($code);
  $out = ['error' => $msg];
  if (is_array($extra) && !empty($extra)) { $out['detail'] = $extra; }
  echo json_encode($out);
  exit;
}

try {
  switch ($action) {
    // Simple ping for diagnostics
    case 'ping':
      json_ok(['ok'=>true,'time'=>date('c'),'mode'=>'full']);
      break;
    // Auth
    case 'auth_status':
      $auth = ctrl_auth();
      json_ok($auth->status());
      break;
    case 'auth_login_google':
      // Inline tracer: if trace=1 in query, emit diagnostic info and short-circuit before controller
      if (isset($_GET['trace']) && $_GET['trace'] === '1') {
        $raw = file_get_contents('php://input');
        $parsed = [];
        $ctype = $_SERVER['CONTENT_TYPE'] ?? ($_SERVER['HTTP_CONTENT_TYPE'] ?? '');
        if (stripos($ctype, 'application/json') !== false) {
          $parsed = json_decode($raw, true);
          if (!is_array($parsed)) { $parsed = ['json_decode_failed' => true]; }
        } else {
          $parsed = $_POST;
        }
        $keys = is_array($parsed) ? array_keys($parsed) : [];
        $idTokenPresent = is_array($parsed) && (isset($parsed['id_token']) || isset($parsed['credential']));
        json_ok([
          'trace' => true,
          'method' => $_SERVER['REQUEST_METHOD'] ?? null,
          'content_type' => $ctype,
          'raw_len' => strlen($raw),
          'raw_first_120' => substr($raw,0,120),
          'parsed_keys' => $keys,
          'id_token_present' => $idTokenPresent,
        ]);
      }
      $auth = ctrl_auth();
      _log_error_to_file('auth_login_google_start', 'action invoked', ['method'=>$_SERVER['REQUEST_METHOD']]);
      $res = $auth->loginWithGoogle();
      _log_error_to_file('auth_login_google_success', 'login completed', ['user_id'=>$res['user']['id'] ?? null]);
      json_ok($res);
      break;
    case 'auth_logout':
      $auth = ctrl_auth();
      json_ok($auth->logout());
      break;
    // Public routes (students)
    case 'get_page_content':
      $student = ctrl_student();
      $slug = $_GET['slug'] ?? null;
      if (!$slug) json_err('slug is required');
      json_ok($student->getPageContent($slug));
      break;
    case 'list_years':
      require_approved_student();
      $student = ctrl_student();
      json_ok($student->listYears());
      break;
    case 'list_subjects':
      require_approved_student();
      $student = ctrl_student();
      $year_id = intval($_GET['year_id'] ?? 0);
      if (!$year_id) json_err('year_id is required');
      json_ok($student->listSubjects($year_id));
      break;
    case 'list_resources':
      require_approved_student();
      $student = ctrl_student();
      $subject_id = intval($_GET['subject_id'] ?? 0);
      $resource_type = $_GET['resource_type'] ?? 'resource';
      if (!$subject_id) json_err('subject_id is required');
      json_ok($student->listResources($subject_id, $resource_type));
      break;
    case 'list_resources_by_year':
      require_approved_student();
      $student = ctrl_student();
      $year_id = intval($_GET['year_id'] ?? 0);
      $resource_type = $_GET['resource_type'] ?? 'resource';
      if (!$year_id) json_err('year_id is required');
      json_ok($student->listResourcesByYear($year_id, $resource_type));
      break;
    case 'list_resources_by_type':
      require_approved_student();
      $student = ctrl_student();
      $resource_type = $_GET['resource_type'] ?? 'resource';
      json_ok($student->listResourcesByType($resource_type));
      break;
    case 'increment_view':
      $student = ctrl_student();
      $resource_id = intval($_POST['resource_id'] ?? 0);
      if (!$resource_id) json_err('resource_id is required');
      json_ok($student->incrementView($resource_id));
      break;

    // Admin routes
    case 'admin_login':
      $admin = ctrl_admin();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $u = $payload['username'] ?? null;
      $p = $payload['password'] ?? null;
      if (!$u || !$p) json_err('Missing credentials');
      json_ok($admin->login($u, $p));
      break;
    case 'admin_logout':
      $admin = ctrl_admin();
      json_ok($admin->logout());
      break;
    case 'admin_me':
      $admin = ctrl_admin();
      json_ok($admin->me());
      break;
    case 'admin_stats':
      $admin = ctrl_admin();
      json_ok($admin->stats());
      break;
    case 'admin_list_resources':
      $admin = ctrl_admin();
      $q = $_GET['q'] ?? null;
      json_ok($admin->listResources($q));
      break;
    case 'admin_create_resource':
      $admin = ctrl_admin();
      // Expect multipart/form-data
      $subject_id = intval($_POST['subject_id'] ?? 0);
      $year_id = intval($_POST['year_id'] ?? 0);
      $title = trim($_POST['title'] ?? '');
      $description = trim($_POST['description'] ?? '');
      $external_url = trim($_POST['external_url'] ?? '');
      $resource_type = trim($_POST['resource_type'] ?? 'resource');
      $card_color = trim($_POST['card_color'] ?? '#0ea5e9');
      
      // Validation based on resource type
      $general_types = ['journal', 'publication', 'career'];
      
      if ($resource_type === 'question') {
        // For questions (PYQ), subject_id is optional but year_id is required
        if (!$title || !$year_id) json_err('title and year_id are required for questions');
        $subject_id = $subject_id > 0 ? $subject_id : null;
      } elseif ($resource_type === 'important-question') {
        // For important questions, both subject_id and year_id are required (like books)
        if (!$subject_id || !$title || !$year_id) json_err('subject_id, year_id and title are required for important questions');
      } elseif (in_array($resource_type, $general_types)) {
        // For general resources, only title is required
        if (!$title) json_err('title is required');
        $subject_id = $subject_id > 0 ? $subject_id : null;
        $year_id = $year_id > 0 ? $year_id : null;
      } else {
        // For specific resources (books, etc.), subject_id and title are required
        if (!$subject_id || !$title) json_err('subject_id and title are required');
      }
      
      json_ok($admin->createResource($subject_id, $title, $description, $external_url, $resource_type, $year_id, $card_color));
      break;
    case 'admin_delete_resource':
      $admin = ctrl_admin();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $rid = intval($payload['resource_id'] ?? 0);
      if (!$rid) json_err('resource_id required');
      json_ok($admin->deleteResource($rid));
      break;

    case 'admin_set_page_content':
      $admin = ctrl_admin();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $slug = trim($payload['slug'] ?? '');
      $html = $payload['html'] ?? '';
      if ($slug === '') json_err('slug is required');
      json_ok($admin->setPageContent($slug, $html));
      break;

    case 'admin_list_pending_users':
      $admin = ctrl_admin();
      json_ok($admin->listPendingUsers());
      break;
    case 'admin_approve_user':
      $admin = ctrl_admin();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $uid = intval($payload['id'] ?? 0);
      if (!$uid) json_err('id required');
      json_ok($admin->approveUser($uid));
      break;
    case 'admin_list_students':
      $admin = ctrl_admin();
      json_ok($admin->listStudents());
      break;
    case 'admin_set_user_approval':
      $admin = ctrl_admin();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $uid = intval($payload['id'] ?? 0);
      $approved = isset($payload['approved']) ? (intval($payload['approved']) === 1) : null;
      if (!$uid || $approved === null) json_err('id and approved required');
      json_ok($admin->setUserApproval($uid, $approved));
      break;
    case 'admin_delete_user':
      $admin = ctrl_admin();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $uid = intval($payload['id'] ?? 0);
      if (!$uid) json_err('id required');
      json_ok($admin->deleteUser($uid));
      break;

    // Helpers
    case 'list_all_subjects':
      $admin = ctrl_admin();
      json_ok($admin->listAllSubjects());
      break;

    case 'chat':
      $chat = ctrl_chat();
      $chat->chat();
      break;

    // News (public & admin)
    case 'list_news':
      $news = ctrl_news();
      $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 30;
      json_ok($news->listPublic($limit));
      break;
    case 'admin_list_news':
      $news = ctrl_news();
      json_ok($news->listAdmin());
      break;
    case 'admin_create_news':
      $news = ctrl_news();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $title = trim($payload['title'] ?? '');
      $body = $payload['body'] ?? '';
      $published = isset($payload['is_published']) ? (intval($payload['is_published']) === 1) : false;
      json_ok($news->create($title,$body,$published));
      break;
    case 'admin_update_news':
      $news = ctrl_news();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $id = intval($payload['id'] ?? 0);
      if(!$id) json_err('id required');
      $title = trim($payload['title'] ?? '');
      $body = $payload['body'] ?? '';
      $published = isset($payload['is_published']) ? (intval($payload['is_published']) === 1) : false;
      json_ok($news->update($id,$title,$body,$published));
      break;
    case 'admin_delete_news':
      $news = ctrl_news();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $id = intval($payload['id'] ?? 0);
      if(!$id) json_err('id required');
      json_ok($news->delete($id));
      break;

    // Contact messages
    case 'submit_contact':
      $contact = ctrl_contact();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $name = trim($payload['name'] ?? '');
      $email = trim($payload['email'] ?? '');
      $subject = trim($payload['subject'] ?? '');
      $message = trim($payload['message'] ?? '');
      json_ok($contact->submit($name,$email,$subject,$message));
      break;
    case 'admin_list_contacts':
      $contact = ctrl_contact();
      json_ok($contact->listAdmin());
      break;
    case 'admin_mark_contact_reviewed':
      $contact = ctrl_contact();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $id = intval($payload['id'] ?? 0); if(!$id) json_err('id required');
      $rev = isset($payload['is_reviewed']) ? (intval($payload['is_reviewed'])===1) : true;
      json_ok($contact->markReviewed($id,$rev));
      break;

    // Courses (public & admin)
    case 'list_courses':
      $courses = ctrl_courses();
      $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
      json_ok($courses->listPublic($limit));
      break;
    case 'admin_list_courses':
      $courses = ctrl_courses();
      json_ok($courses->listAdmin());
      break;
    case 'admin_create_course':
      $courses = ctrl_courses();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $title = trim($payload['title'] ?? '');
      $category = trim($payload['category'] ?? '');
      $summary = $payload['summary'] ?? '';
      $level = trim($payload['level'] ?? '');
      $duration = trim($payload['duration'] ?? '');
      $apply_link = trim($payload['apply_link'] ?? '');
      $is_active = isset($payload['is_active']) ? (intval($payload['is_active']) === 1) : 1;
      json_ok($courses->create($title,$category,$summary,$level,$duration,$apply_link,$is_active));
      break;
    case 'admin_update_course':
      $courses = ctrl_courses();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $id = intval($payload['id'] ?? 0); if(!$id) json_err('id required');
      $title = trim($payload['title'] ?? '');
      $category = trim($payload['category'] ?? '');
      $summary = $payload['summary'] ?? '';
      $level = trim($payload['level'] ?? '');
      $duration = trim($payload['duration'] ?? '');
      $apply_link = trim($payload['apply_link'] ?? '');
      $is_active = isset($payload['is_active']) ? (intval($payload['is_active']) === 1) : 1;
      json_ok($courses->update($id,$title,$category,$summary,$level,$duration,$apply_link,$is_active));
      break;
    case 'admin_delete_course':
      $courses = ctrl_courses();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $id = intval($payload['id'] ?? 0); if(!$id) json_err('id required');
      json_ok($courses->delete($id));
      break;

    // Publications
    case 'list_publications':
      $pub = ctrl_pub();
      $q = $_GET['q'] ?? null;
      $ar = $_GET['author_role'] ?? null;
      $app = isset($_GET['approved']) ? intval($_GET['approved']) : null;
      json_ok($pub->listPublications($q, $ar, $app));
      break;
    case 'create_publication':
      $pub = ctrl_pub();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $title = trim($payload['title'] ?? '');
      $url = $payload['url'] ?? null;
      $author = $payload['author_name'] ?? null;
      $role = $payload['author_role'] ?? 'student';
      if ($title === '') json_err('title required');
      json_ok($pub->createPublication($title, $url, $author, $role));
      break;
    case 'approve_publication':
      $pub = ctrl_pub();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $id = intval($payload['id'] ?? 0);
      if (!$id) json_err('id required');
      json_ok($pub->approvePublication($id));
      break;
    case 'delete_publication':
      $pub = ctrl_pub();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $id = intval($payload['id'] ?? 0);
      if (!$id) json_err('id required');
      json_ok($pub->deletePublication($id));
      break;

    // Directory (students)
    case 'list_students':
      $dir = ctrl_dir();
      $q = $_GET['q'] ?? null;
      $batch = isset($_GET['batch']) ? intval($_GET['batch']) : null;
      json_ok($dir->listStudents($q, $batch));
      break;
    case 'list_featured_students':
      // Public endpoint to get featured students for directory showcase
      $dir = ctrl_dir();
      json_ok($dir->listFeaturedStudents());
      break;
    case 'upsert_student_profile':
      $dir = ctrl_dir();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $userId = intval($payload['user_id'] ?? 0);
      if (!$userId) json_err('user_id required');
      $batchYear = isset($payload['batch_year']) ? intval($payload['batch_year']) : null;
      $linkedin = $payload['linkedin_url'] ?? null;
      $instagram = $payload['instagram_url'] ?? null;
      $twitter = $payload['twitter_url'] ?? null;
      $bio = $payload['bio'] ?? null;
      $avatar = $payload['avatar_url'] ?? null;
      json_ok($dir->upsertStudentProfile($userId, $batchYear, $linkedin, $instagram, $twitter, $bio, $avatar));
      break;

    // Vacancies & Referrals
    case 'list_vacancies':
      $vac = ctrl_vac();
      $q = $_GET['q'] ?? null;
      $category = $_GET['category'] ?? null;
      $batch = isset($_GET['batch']) ? intval($_GET['batch']) : null;
      json_ok($vac->listVacancies($q, $category, $batch));
      break;
    case 'create_vacancy':
      $vac = ctrl_vac();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $title = trim($payload['title'] ?? '');
      if ($title === '') json_err('title required');
      $company = $payload['company'] ?? null;
      $location = $payload['location'] ?? null;
      $category = $payload['category'] ?? null;
      $description = $payload['description'] ?? null;
      $applicationLink = $payload['application_link'] ?? null;
      $postedBy = isset($payload['posted_by']) ? intval($payload['posted_by']) : null;
      $batchFilter = isset($payload['batch_filter']) ? intval($payload['batch_filter']) : null;
      json_ok($vac->createVacancy($title, $company, $location, $category, $description, $applicationLink, $postedBy, $batchFilter));
      break;
    case 'request_referral':
      $vac = ctrl_vac();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $vacancyId = intval($payload['vacancy_id'] ?? 0);
      $requesterId = intval($payload['requester_id'] ?? 0);
      if (!$vacancyId || !$requesterId) json_err('vacancy_id and requester_id required');
      $message = $payload['message'] ?? null;
      json_ok($vac->requestReferral($vacancyId, $requesterId, $message));
      break;

    // Discussions
    case 'list_channels':
      $disc = ctrl_disc();
      json_ok($disc->listChannels());
      break;
    case 'create_channel':
      $disc = ctrl_disc();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $name = trim($payload['name'] ?? '');
      if ($name === '') json_err('name required');
      $description = $payload['description'] ?? null;
      $visibility = $payload['visibility'] ?? 'public';
      $createdBy = isset($payload['created_by']) ? intval($payload['created_by']) : null;
      json_ok($disc->createChannel($name, $description, $visibility, $createdBy));
      break;
    case 'list_posts':
      $disc = ctrl_disc();
      $channelId = intval($_GET['channel_id'] ?? 0);
      if (!$channelId) json_err('channel_id required');
      $afterId = isset($_GET['after_id']) ? intval($_GET['after_id']) : null;
      json_ok($disc->listPosts($channelId, $afterId));
      break;
    case 'create_post':
      $disc = ctrl_disc();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $channelId = intval($payload['channel_id'] ?? 0);
      if (!$channelId) json_err('channel_id required');
      $parentId = isset($payload['parent_id']) ? intval($payload['parent_id']) : null;
      $authorId = isset($payload['author_id']) ? intval($payload['author_id']) : null;
      $content = trim($payload['content'] ?? '');
      if ($content === '') json_err('content required');
      json_ok($disc->createPost($channelId, $parentId, $authorId, $content));
      break;

    // PYQ Links Management
    case 'list_pyq_links':
      $admin = ctrl_admin();
      json_ok($admin->listPyqLinks());
      break;
    case 'upsert_pyq_link':
      $admin = ctrl_admin();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $yearId = isset($payload['year_id']) ? intval($payload['year_id']) : null;
      $linkUrl = trim($payload['link_url'] ?? '');
      $description = trim($payload['description'] ?? '');
      if ($linkUrl === '') json_err('link_url required');
      json_ok($admin->upsertPyqLink($yearId, $linkUrl, $description));
      break;
    case 'delete_pyq_link':
      $admin = ctrl_admin();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $id = intval($payload['id'] ?? 0);
      if (!$id) json_err('id required');
      json_ok($admin->deletePyqLink($id));
      break;
    
    // Featured Students Management (Admin)
    case 'admin_list_featured_students':
      $admin = ctrl_admin();
      json_ok($admin->listFeaturedStudents());
      break;
    case 'admin_add_featured_student':
      $admin = ctrl_admin();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $userId = intval($payload['user_id'] ?? 0);
      if (!$userId) json_err('user_id required');
      $profilePhoto = $payload['profile_photo'] ?? null;
      $linkedin = $payload['linkedin_url'] ?? null;
      $instagram = $payload['instagram_url'] ?? null;
      $email = $payload['email'] ?? null;
      $bio = $payload['bio'] ?? null;
      $displayOrder = isset($payload['display_order']) ? intval($payload['display_order']) : 0;
      json_ok($admin->addFeaturedStudent($userId, $profilePhoto, $linkedin, $instagram, $email, $bio, $displayOrder));
      break;
    case 'admin_update_featured_student':
      $admin = ctrl_admin();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $id = intval($payload['id'] ?? 0);
      if (!$id) json_err('id required');
      $profilePhoto = $payload['profile_photo'] ?? null;
      $linkedin = $payload['linkedin_url'] ?? null;
      $instagram = $payload['instagram_url'] ?? null;
      $email = $payload['email'] ?? null;
      $bio = $payload['bio'] ?? null;
      $displayOrder = isset($payload['display_order']) ? intval($payload['display_order']) : null;
      json_ok($admin->updateFeaturedStudent($id, $profilePhoto, $linkedin, $instagram, $email, $bio, $displayOrder));
      break;
    case 'admin_delete_featured_student':
      $admin = ctrl_admin();
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $id = intval($payload['id'] ?? 0);
      if (!$id) json_err('id required');
      json_ok($admin->deleteFeaturedStudent($id));
      break;
    
    case 'get_pyq_link':
      // Public endpoint for fetching PYQ link by year (or global)
      $yearId = isset($_GET['year_id']) ? intval($_GET['year_id']) : null;
      $stmt = $pdo->prepare('SELECT link_url FROM pyq_links WHERE year_id = ? AND is_active = 1 LIMIT 1');
      $stmt->execute([$yearId]);
      $row = $stmt->fetch(PDO::FETCH_ASSOC);
      if (!$row) {
        // Fallback to global link (year_id NULL)
        $stmt = $pdo->prepare('SELECT link_url FROM pyq_links WHERE year_id IS NULL AND is_active = 1 LIMIT 1');
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
      }
      json_ok(['link_url' => $row ? $row['link_url'] : null]);
      break;

    // TEMPORARY: Debug tail endpoint (remove after troubleshooting)
    case 'debug_auth_log_tail':
      $logPath = __DIR__ . '/logs/auth.log';
      $result = ['path' => $logPath, 'exists' => file_exists($logPath), 'tail' => []];
      if (file_exists($logPath)) {
        $content = @file_get_contents($logPath);
        if ($content) {
          $lines = explode("\n", trim($content));
          $result['tail'] = array_slice($lines, -50);
          $result['total_lines'] = count($lines);
        }
      }
      json_ok($result);
      break;
    // TEMPORARY: Debug error.log tail endpoint
    case 'debug_error_log_tail':
      $candidates = [
        __DIR__ . '/error.log',
        dirname(__DIR__) . '/error.log',
        sys_get_temp_dir() . '/scop_error.log'
      ];
      $result = [];
      foreach ($candidates as $path) {
        if (@file_exists($path)) {
          $content = @file_get_contents($path);
          if ($content) {
            $lines = explode("\n", trim($content));
            $result[$path] = array_slice($lines, -30);
          }
        }
      }
      json_ok(['error_logs' => $result, 'candidates' => $candidates]);
      break;
    // TEMPORARY: Simple connectivity check
    case 'debug_health':
      $dbOk = false;
      $dbMsg = 'not tested';
      try {
        $result = $pdo->query('SELECT 1');
        $dbOk = $result !== false;
        $dbMsg = $dbOk ? 'ok' : 'query failed';
      } catch (Throwable $dbE) {
        $dbMsg = $dbE->getMessage();
      }
      json_ok([
        'status' => 'ok',
        'db' => ['ok' => $dbOk, 'message' => $dbMsg],
        'php_version' => phpversion(),
        'curl' => function_exists('curl_init'),
        'time' => date('c')
      ]);
      break;

    default:
      json_err('Unknown action', 404);
  }
} catch (Throwable $e) {
  // Catch all throwables to avoid 500 and surface message to client
  _log_error_to_file('catch', $e->getMessage(), ['action' => $action ?? null, 'type' => get_class($e), 'trace' => $e->getTraceAsString()]);
  $code = 400;
  $extra = ['type' => get_class($e)];
  if (defined('PHP_VERSION')) { $extra['php'] = PHP_VERSION; }
  json_err($e->getMessage(), $code, $extra);
}
