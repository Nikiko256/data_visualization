<?php
require_once __DIR__ . '/_db.php';

$cnx = db();
$res = mysqli_query($cnx, "SELECT id, s_id, n_name, display_name, is_active FROM station_nodes ORDER BY s_id ASC, n_name ASC");

$data = [];
while ($row = mysqli_fetch_assoc($res)) $data[] = $row;

ok(["data" => $data]);
