<?php
header('Content-Type: application/json');
echo json_encode(['ok'=>true,'from'=>'/api/ping.php','dir'=>__DIR__,'time'=>date('c')]);
