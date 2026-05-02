<?php
require_once __DIR__ . '/_db.php';
$cnx = db();

$sql = "
    SELECT s_id, s_name, status, created_at
    FROM stations
    ORDER BY 
      CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
      created_at DESC
";


$res = mysqli_query($cnx, $sql);

$data = [];
while ($row = mysqli_fetch_assoc($res)) {
  $data[] = $row;
}

ok(["data" => $data]);
?>