<?php
require_once __DIR__ . '/_db.php';

$in = read_json();
$s_id = trim($in['s_id'] ?? '');

if ($s_id === '') {
  fail(422, "Missing s_id");
}

$cnx = db();

$stmt = mysqli_prepare($cnx, "SELECT s_id FROM stations WHERE s_id = ?");
mysqli_stmt_bind_param($stmt, 's', $s_id);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);
$station = mysqli_fetch_assoc($res);
mysqli_stmt_close($stmt);

if (!$station) {
  fail(404, "Station not found");
}

$table = preg_replace('/[^a-zA-Z0-9_]/', '', $s_id);

$check = mysqli_query($cnx, "SHOW TABLES LIKE '" . mysqli_real_escape_string($cnx, $table) . "'");
if (mysqli_num_rows($check) === 0) {
  ok(["data" => []]);
}

$sql = "
  SELECT 
    n_name,
    COUNT(*) AS records,
    MAX(created_at) AS last_seen
  FROM `$table`
  WHERE n_name IS NOT NULL AND n_name <> ''
  GROUP BY n_name
  ORDER BY n_name ASC
";

$res = mysqli_query($cnx, $sql);

$data = [];
while ($row = mysqli_fetch_assoc($res)) {
  $data[] = $row;
}

ok(["data" => $data]);