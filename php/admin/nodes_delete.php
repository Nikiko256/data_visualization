<?php
require_once __DIR__ . '/_db.php';

$in = read_json();
$id = intval($in['id'] ?? 0);
if ($id <= 0) fail(422, "Invalid id");

$cnx = db();
$stmt = mysqli_prepare($cnx, "DELETE FROM station_nodes WHERE id=?");
mysqli_stmt_bind_param($stmt, 'i', $id);
mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

ok();
