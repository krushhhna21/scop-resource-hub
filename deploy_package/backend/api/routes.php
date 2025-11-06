<?php
session_start();
header('Content-Type: application/json');

// Allow simple CORS for dev (adjust for prod)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: GET,POST,OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  exit;
}
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/controllers/AdminController.php';
require_once __DIR__ . '/controllers/StudentController.php';

$config = require __DIR__ . '/config.php';
$admin = new AdminController($pdo, $config);
$student = new StudentController($pdo);

$action = $_GET['action'] ?? $_POST['action'] ?? null;

function json_ok($data) { echo json_encode($data); exit; }
function json_err($msg, $code=400) { http_response_code($code); echo json_encode(['error' => $msg]); exit; }

try {
  switch ($action) {
    // Public routes (students)
    case 'get_page_content':
      $slug = $_GET['slug'] ?? null;
      if (!$slug) json_err('slug is required');
      json_ok($student->getPageContent($slug));
      break;
    case 'list_years':
      json_ok($student->listYears());
      break;
    case 'list_subjects':
      $year_id = intval($_GET['year_id'] ?? 0);
      if (!$year_id) json_err('year_id is required');
      json_ok($student->listSubjects($year_id));
      break;
    case 'list_resources':
      $subject_id = intval($_GET['subject_id'] ?? 0);
      $resource_type = $_GET['resource_type'] ?? 'resource';
      if (!$subject_id) json_err('subject_id is required');
      json_ok($student->listResources($subject_id, $resource_type));
      break;
    case 'list_resources_by_year':
      $year_id = intval($_GET['year_id'] ?? 0);
      $resource_type = $_GET['resource_type'] ?? 'resource';
      if (!$year_id) json_err('year_id is required');
      json_ok($student->listResourcesByYear($year_id, $resource_type));
      break;
    case 'list_resources_by_type':
      $resource_type = $_GET['resource_type'] ?? 'resource';
      json_ok($student->listResourcesByType($resource_type));
      break;
    case 'increment_view':
      $resource_id = intval($_POST['resource_id'] ?? 0);
      if (!$resource_id) json_err('resource_id is required');
      json_ok($student->incrementView($resource_id));
      break;

    // Admin routes
    case 'admin_login':
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $u = $payload['username'] ?? null;
      $p = $payload['password'] ?? null;
      if (!$u || !$p) json_err('Missing credentials');
      json_ok($admin->login($u, $p));
      break;
    case 'admin_logout':
      json_ok($admin->logout());
      break;
    case 'admin_me':
      json_ok($admin->me());
      break;
    case 'admin_stats':
      json_ok($admin->stats());
      break;
    case 'admin_list_resources':
      $q = $_GET['q'] ?? null;
      json_ok($admin->listResources($q));
      break;
    case 'admin_create_resource':
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
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $rid = intval($payload['resource_id'] ?? 0);
      if (!$rid) json_err('resource_id required');
      json_ok($admin->deleteResource($rid));
      break;

    case 'admin_set_page_content':
      $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $slug = trim($payload['slug'] ?? '');
      $html = $payload['html'] ?? '';
      if ($slug === '') json_err('slug is required');
      json_ok($admin->setPageContent($slug, $html));
      break;

    // Helpers
    case 'list_all_subjects':
      json_ok($admin->listAllSubjects());
      break;

    default:
      json_err('Unknown action', 404);
  }
} catch (Exception $e) {
  json_err($e->getMessage(), 400);
}
