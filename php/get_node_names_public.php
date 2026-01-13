<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

require_once __DIR__ . '/load_env.php';
loadEnv(__DIR__ . '/../.env');

header('Content-Type: application/json');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$input = trim(file_get_contents('php://input'));
$data = json_decode($input, true);
if (json_last_error() !== JSON_ERROR_NONE || empty($data['s_name'])) {
  http_response_code(422);
  echo json_encode(["status"=>"error","message"=>"Missing s_name"]);
  exit;
}
$s_name = trim($data['s_name']);

$host = $_ENV['DB_HOST']; $db=$_ENV['DB_NAME']; $user=$_ENV['DB_USER']; $pass=$_ENV['DB_PASS'];
$cnx = mysqli_connect($host,$user,$pass,$db);
mysqli_set_charset($cnx,'utf8mb4');

$stmt = mysqli_prepare($cnx, "SELECT s_id FROM stations WHERE s_name=?");
mysqli_stmt_bind_param($stmt,'s',$s_name);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt,$s_id);
if (!mysqli_stmt_fetch($stmt)) {
  http_response_code(404);
  echo json_encode(["status"=>"error","message"=>"Station not found"]);
  exit;
}
mysqli_stmt_close($stmt);

// nodes from metadata
$sql = "SELECT n_name, COALESCE(NULLIF(display_name,''), n_name) AS label
        FROM station_nodes
        WHERE s_id=? AND is_active=1
        ORDER BY label ASC";
$stmt = mysqli_prepare($cnx, $sql);
mysqli_stmt_bind_param($stmt,'s',$s_id);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);

$nodes = [];
while ($r = mysqli_fetch_assoc($res)) $nodes[] = $r;

echo json_encode(["status"=>"success","s_name"=>$s_name,"s_id"=>$s_id,"nodes"=>$nodes]);
