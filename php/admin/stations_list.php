<?php
require_once __DIR__ . '/_db.php';
$cnx = db();

$sql = "SELECT s_id, s_name FROM stations ORDER BY s_name ASC";
$res = mysqli_query($cnx, $sql);

$data = [];
while ($row = mysqli_fetch_assoc($res)) {
  $data[] = $row;
}

ok(["data" => $data]);
?>