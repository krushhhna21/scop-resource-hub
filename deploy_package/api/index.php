<?php
// Public API proxy entry point
// This file allows calling the backend API from pages under /public
// without relying on parent-directory relative URLs which may break on hosting.

// Resolve and load the real routes file
require_once realpath(__DIR__ . '/../../backend/api/routes.php');
