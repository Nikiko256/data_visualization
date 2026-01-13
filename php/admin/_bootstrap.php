<?php
header('Content-Type: application/json');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/../load_env.php';
loadEnv(__DIR__ . '/../../.env');

function db() {
  static $cnx = null;
  if ($cnx) return $cnx;

  $host = $_ENV['DB_HOST'];
  $db   = $_ENV['DB_NAME'];
  $user = $_ENV['DB_USER'];
  $pass = $_ENV['DB_PASS'];

  $cnx = mysqli_connect($host, $user, $pass, $db);
  mysqli_set_charset($cnx, 'utf8mb4');
  return $cnx;
}

function readJson() {
  $raw = trim(file_get_contents('php://input'));
  if ($raw === '') return [];
  $j = json_decode($raw, true);
  if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(422);
    echo json_encode(["status"=>"error","message"=>"Invalid JSON"]);
    exit;
  }
  return $j ?: [];
}

function ok($data = []) {
  echo json_encode(array_merge(["status"=>"success"], $data));
  exit;
}

function fail($code, $msg) {
  http_response_code($code);
  echo json_encode(["status"=>"error","message"=>$msg]);
  exit;
}
