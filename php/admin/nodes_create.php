<?php
require_once __DIR__ . '/_db.php';

$in = read_json();
$s_id = trim($in['s_id'] ?? '');
$n_name = trim($in['n_name'] ?? '');
$display = trim($in['display_name'] ?? '');

if ($s_id === '' || $n_name === '') fail(422, "Missing s_id or n_name");

$cnx = db();

// make sure station exists
$chk = mysqli_prepare($cnx, "SELECT 1 FROM stations WHERE s_id=?");
mysqli_stmt_bind_param($chk, 's', $s_id);
mysqli_stmt_execute($chk);
mysqli_stmt_store_result($chk);
if (mysqli_stmt_num_rows($chk) === 0) {
  mysqli_stmt_close($chk);
  fail(404, "Station not found");
}
mysqli_stmt_close($chk);

$stmt = mysqli_prepare($cnx, "INSERT INTO station_nodes (s_id, n_name, display_name) VALUES (?, ?, ?)");
mysqli_stmt_bind_param($stmt, 'sss', $s_id, $n_name, $display);
mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

ok();
