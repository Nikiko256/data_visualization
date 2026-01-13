<?php
require_once __DIR__ . '/_db.php';

$cnx = db();

/*
  Επιστρέφει stations + node_count (πόσα nodes metadata έχεις δηλώσει)
  Αν δεν θες node_count, μπορείς να αφαιρέσεις το LEFT JOIN.
*/
$sql = "
  SELECT
    s.s_id,
    s.s_name,
    COUNT(n.id) AS node_count
  FROM stations s
  LEFT JOIN station_nodes n
    ON n.s_id = s.s_id
  GROUP BY s.s_id, s.s_name
  ORDER BY s.s_name ASC
";

$res = mysqli_query($cnx, $sql);

$data = [];
while ($row = mysqli_fetch_assoc($res)) {
  // κάνε cast το node_count σε int για καθαρό JSON
  $row['node_count'] = intval($row['node_count']);
  $data[] = $row;
}

ok(["data" => $data]);
?>