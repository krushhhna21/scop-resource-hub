<?php
header('Content-Type: application/json');
// Direct include of light router without any path logic
require_once dirname(__DIR__) . '/backend/api/routes_light.php';
