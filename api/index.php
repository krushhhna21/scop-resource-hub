<?php
// Public API proxy entry point
// Normal mode loads full router; lite mode loads diagnostic router to isolate fatal errors.
header('Content-Type: application/json');
try {
	$lite = isset($_GET['lite']) ? ($_GET['lite'] === '1') : false;
		// Hosting layout (from resolve.php): /home/.../htdocs is root
		$path = dirname(__DIR__) . '/backend/api/' . ($lite ? 'routes_light.php' : 'routes.php');
	if (!file_exists($path)) {
		http_response_code(500);
		echo json_encode(['error'=>'router_not_found','path_attempted'=>$path]);
		exit;
	}
	require_once $path;
} catch (Throwable $e) {
	http_response_code(500);
	echo json_encode(['error'=>'bootstrap_failed','message'=>$e->getMessage(),'file'=>$e->getFile(),'line'=>$e->getLine()]);
}
