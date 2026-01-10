<?php
// /php/admin/_db.php
ini_set('display_errors', 1);
error_reporting(E_ALL);
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/../load_env.php';
loadEnv(__DIR__ . '/../../.env');

function db() {
  static $cnx = null;
  if ($cnx) return $cnx;

  $host = $_ENV['DB_HOST'] ?? '';
  $name = $_ENV['DB_NAME'] ?? '';
  $user = $_ENV['DB_USER'] ?? '';
  $pass = $_ENV['DB_PASS'] ?? '';

  $cnx = mysqli_connect($host, $user, $pass, $name);
  mysqli_set_charset($cnx, 'utf8mb4');
  return $cnx;
}

function read_json() {
  $raw = file_get_contents('php://input');
  $data = json_decode($raw ?: '{}', true);
  return is_array($data) ? $data : [];
}

function ok($arr = []) {
  header('Content-Type: application/json');
  echo json_encode(array_merge(["status" => "success"], $arr));
  exit;
}

function fail($code, $msg) {
  header('Content-Type: application/json');
  http_response_code($code);
  echo json_encode(["status" => "error", "message" => $msg]);
  exit;
}
