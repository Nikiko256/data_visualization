<?php
require_once __DIR__ . '/_db.php';

$in = read_json();
$s_id = trim($in['s_id'] ?? '');
$s_name = trim($in['s_name'] ?? '');

if ($s_id === '' || $s_name === '') fail(422, "Missing s_id or s_name");

$cnx = db();
$stmt = mysqli_prepare($cnx, "INSERT INTO stations (s_id, s_name) VALUES (?, ?)");
mysqli_stmt_bind_param($stmt, 'ss', $s_id, $s_name);
mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

ok();
