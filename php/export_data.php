<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/admin/_db.php';

$db = db();

$s_id = $_GET['s_id'] ?? '';
$n_name = $_GET['n_name'] ?? '';
$range = $_GET['range'] ?? 'all';

if ($s_id === '') {
    http_response_code(400);
    echo "Missing station id";
    exit;
}

$table = 'station_' . $s_id;

if (!preg_match('/^[a-zA-Z0-9_]+$/', $table)) {
    http_response_code(400);
    echo "Invalid table name";
    exit;
}


$displayName = 'station_data';

$nameStmt = $db->prepare("SELECT s_name FROM stations WHERE s_id = ?");
$nameStmt->bind_param("s", $s_id);
$nameStmt->execute();

$nameResult = $nameStmt->get_result();

if ($nameRow = $nameResult->fetch_assoc()) {
    $displayName = $nameRow['s_name'];
}

$displayName = preg_replace('/[^a-zA-Z0-9_-]+/', '_', $displayName);

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $displayName . '_data.csv"');

$output = fopen('php://output', 'w');

fputcsv($output, [
    'Ημερομηνία',
    'Σταθμός',
    'Κόμβος',
    'Θερμοκρασία χώματος',
    'Υγρασία χώματος',
    'Θερμοκρασία αέρα',
    'Υγρασία αέρα',
    'Πίεση αέρα',
    'Βάθος βροχής',
    'Ταχύτητα ανέμου',
    'Κατεύθυνση ανέμου'
]);

$sql = "
    SELECT
        created_at,
        ? AS station_id,
        n_name,
        soilTemp,
        soilMoist,
        airTemp,
        airHumid,
        airPress,
        rainDepth,
        windSpeed,
        windDirection
    FROM `$table`
    WHERE 1 = 1
";

$params = [$s_id];
$types = "s";

if ($n_name !== '' && $n_name !== 'average_nodes') {
    $sql .= " AND n_name = ?";
    $params[] = $n_name;
    $types .= "s";
}

if ($range !== 'all') {
    $sql .= " AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)";
    $params[] = intval($range);
    $types .= "i";
}

$sql .= " ORDER BY created_at DESC";

$stmt = $db->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();

$result = $stmt->get_result();

while ($row = $result->fetch_assoc()) {
    fputcsv($output, $row);
}

fclose($output);
exit;