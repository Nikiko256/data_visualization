<?php
require_once __DIR__ . '/_db.php';
$cnx = db();

$res = mysqli_query($cnx, "SELECT s_id, first_seen, last_seen, seen FROM pending_stations ORDER BY last_seen DESC");
$data = [];
while ($row = mysqli_fetch_assoc($res)) $data[] = $row;

ok(["data"=>$data]);
?>