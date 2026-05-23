<?php
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/admin/_db.php';

$conn = db();
$conn->set_charset('utf8mb4');

$s_id = $_GET['s_id'] ?? '';
$n_name = $_GET['n_name'] ?? '';

if ($s_id === '') {
    http_response_code(400);
    exit('Missing station id');
}

if ($n_name === '') {
    http_response_code(400);
    exit('Missing node name');
}

// Create correct table name, same logic as get_data.php
$table = 'station_' . preg_replace('/[^a-zA-Z0-9_]/', '_', $s_id);

// Check if table exists
$check = $conn->query("SHOW TABLES LIKE '{$table}'");

if ($check->num_rows === 0) {
    http_response_code(404);
    exit("Data table does not exist");
}

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="station_data.csv"');

$output = fopen('php://output', 'w');

// Για σωστά ελληνικά στο Excel
fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

fputcsv($output, [
    'Ημερομηνία',
    'Σταθμός',
    'Κόμβος',
    'Θερμοκρασία χώματος',
    'Υγρασία χώματος',
    'Θερμοκρασία αέρα',
    'Υγρασία αέρα',
    'Πίεση αέρα',
    'Ύψος βροχής',
    'Ταχύτητα ανέμου',
    'Κατεύθυνση ανέμου'
]);

if ($n_name === 'average_nodes') {
    $sql = "
        SELECT 
            created_at,
            'average_nodes' AS n_name,
            AVG(soilTemp) AS soilTemp,
            AVG(soilMoist) AS soilMoist,
            AVG(airTemp) AS airTemp,
            AVG(airHumid) AS airHumid,
            AVG(airPress) AS airPress,
            AVG(rainDepth) AS rainDepth,
            AVG(windSpeed) AS windSpeed,
            '-' AS windDirection
        FROM `$table`
        GROUP BY created_at
        ORDER BY created_at DESC
    ";

    $stmt = $conn->prepare($sql);
}
else if ($n_name === 'all') {
    $sql = "
        SELECT 
            created_at,
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
        ORDER BY created_at DESC
    ";

    $stmt = $conn->prepare($sql);
}
else {
    $sql = "
        SELECT 
            created_at,
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
        WHERE n_name = ?
        ORDER BY created_at DESC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $n_name);
}

$stmt->execute();
$result = $stmt->get_result();

while ($row = $result->fetch_assoc()) {
    $date = '';
    if (!empty($row['created_at'])) {
        $date = date('d/m/Y H:i:s', strtotime($row['created_at']));
    }
    
    fputcsv($output, [
        $date,
        $s_id,
        $row['n_name'],
        $row['soilTemp'],
        $row['soilMoist'],
        $row['airTemp'],
        $row['airHumid'],
        $row['airPress'],
        $row['rainDepth'],
        $row['windSpeed'],
        $row['windDirection']
    ]);
}

$stmt->close();
$conn->close();
fclose($output);
exit;
?>