<?php
require_once __DIR__ . '/_db.php';

$in = read_json();
$s_id = trim($in['s_id'] ?? '');
if ($s_id === '') fail(422, "Missing s_id");

$cnx = db();

mysqli_begin_transaction($cnx);

try{
    $stmt1 = mysqli_prepare($cnx, "DELETE FROM station_nodes WHERE s_id=?");
    mysqli_stmt_bind_param($stmt1, 's', $s_id);
    mysqli_stmt_execute($stmt1);
    mysqli_stmt_close($stmt1);   

    $stmt2 = mysqli_prepare($cnx, "DELETE FROM stations WHERE s_id=?");
    mysqli_stmt_bind_param($stmt2, 's', $s_id);
    mysqli_stmt_execute($stmt2);
    mysqli_stmt_close($stmt2);

    mysqli_commit($cnx);
    ok();
} catch (Throwable $e) {
  mysqli_rollback($cnx);
  fail(500, $e->getMessage());
}
