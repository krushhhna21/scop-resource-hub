<?php
// Temporary debug endpoint to help diagnose server-side errors when file access is limited.
// Usage: visit this file in browser and paste the output here. Remove after debugging.
header('Content-Type: text/plain; charset=utf-8');
echo "=== Debug: last error & log status ===\n\n";

$base = __DIR__;
$candidates = [
    $base . '/logs/error.log',
    $base . '/error.log',
    dirname($base) . '/error.log',
    sys_get_temp_dir() . '/scop_error.log'
];

foreach ($candidates as $path) {
    echo "Checking: $path\n";
    if (is_file($path)) {
        echo "Found: $path (last 200 lines):\n\n";
        $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        $tail = array_slice($lines, -200);
        echo implode("\n", $tail) . "\n";
        break;
    } else {
        echo "Not found: $path\n";
    }
}

$phpErrorLog = ini_get('error_log');
echo "\nPHP error_log path: " . ($phpErrorLog ?: '(none)') . "\n";
if ($phpErrorLog && strpos($phpErrorLog, '/dev/null') === false && strpos($phpErrorLog, 'nul') === false) {
    // Only attempt to read if path is not /dev/null (which is often disallowed by open_basedir)
    if (is_file($phpErrorLog)) {
        echo "Contents (last 200 lines):\n\n";
        $lines = @file($phpErrorLog, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        $tail = array_slice($lines, -200);
        echo implode("\n", $tail) . "\n";
    } else {
        echo "PHP error_log file does not exist or is not readable.\n";
    }
} else {
    echo "No readable PHP error_log configured (skipping).\n";
}

echo "\nLast PHP runtime error (error_get_last):\n";
$last = error_get_last();
if ($last) {
    echo print_r($last, true) . "\n";
} else {
    echo "(none)\n";
}

echo "\nServer host: " . ($_SERVER['HTTP_HOST'] ?? 'cli') . "\n";
echo "Request time: " . date('c') . "\n";

echo "\nNOTE: This endpoint is temporary for debugging. Remove it when done.\n";
?>
