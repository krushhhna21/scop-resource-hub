<?php
header('Content-Type: application/json');
$here = __DIR__;
$candidate1 = __DIR__ . '/../../backend/api/routes_light.php';
$candidate2 = dirname(__DIR__) . '/backend/api/routes_light.php';
$out = [
  'here'=>$here,
  'candidate1'=>$candidate1,
  'candidate1_exists'=>file_exists($candidate1),
  'candidate2'=>$candidate2,
  'candidate2_exists'=>file_exists($candidate2),
];
echo json_encode($out);
