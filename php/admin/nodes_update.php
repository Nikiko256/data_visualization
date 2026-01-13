<?php
require_once __DIR__ . '/_db.php';

$in = read_json();
$id = intval($in['id'] ?? 0);
$display = trim($in['display_name'] ?? '');

if ($id <= 0) fail(422, "Invalid id");

$cnx = db();
$stmt = mysqli_prepare($cnx, "UPDATE station_nodes SET display_name=? WHERE id=?");
mysqli_stmt_bind_param($stmt, 'si', $display, $id);
mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

ok();
