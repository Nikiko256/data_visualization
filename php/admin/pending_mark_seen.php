<?php
require_once __DIR__ . '/_db.php';

$in = read_json();
$s_id = trim($in['s_id'] ?? '');
if ($s_id === '') fail(422, "Missing s_id");

$cnx = db();
$stmt = mysqli_prepare($cnx, "UPDATE pending_stations SET seen=1 WHERE s_id=?");
mysqli_stmt_bind_param($stmt, 's', $s_id);
mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

ok();
?>