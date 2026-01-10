<?php
require_once __DIR__ . '/_db.php';

$in = read_json();
$id = intval($in['id'] ?? 0);
$is_active = intval($in['is_active'] ?? -1);

if ($id <= 0) fail(422, "Invalid id");
if ($is_active !== 0 && $is_active !== 1) fail(422, "is_active must be 0 or 1");

$cnx = db();
$stmt = mysqli_prepare($cnx, "UPDATE station_nodes SET is_active=? WHERE id=?");
mysqli_stmt_bind_param($stmt, 'ii', $is_active, $id);
mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

ok();
