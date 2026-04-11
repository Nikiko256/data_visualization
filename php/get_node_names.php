<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/load_env.php';
loadEnv(__DIR__ . '/../.env');

header('Content-Type: application/json; charset=utf-8');

function resolveStationTable($dbcnx, $s_id) {
    $sid = preg_replace('/[^a-zA-Z0-9_]/', '_', (string)$s_id);

    $candidates = [
        'station_' . $sid,
        $sid
    ];

    foreach ($candidates as $table) {
        if (!$table) continue;
        $check = mysqli_query($dbcnx, "SHOW TABLES LIKE '{$table}'");
        if ($check && mysqli_num_rows($check) > 0) {
            return $table;
        }
    }

    return null;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) {
    $data = $_POST;
}

if (empty($data['s_name'])) {
    http_response_code(422);
    echo json_encode([
        "status" => "error",
        "message" => "Missing s_name"
    ]);
    exit;
}

$s_name = trim($data['s_name']);

try {
    $dbcnx = mysqli_connect(
        $_ENV['DB_HOST'],
        $_ENV['DB_USER'],
        $_ENV['DB_PASS'],
        $_ENV['DB_NAME']
    );

    mysqli_set_charset($dbcnx, 'utf8mb4');

    $stmt = mysqli_prepare($dbcnx, "SELECT s_id FROM stations WHERE s_name = ?");
    mysqli_stmt_bind_param($stmt, 's', $s_name);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_bind_result($stmt, $s_id);

    if (!mysqli_stmt_fetch($stmt)) {
        mysqli_stmt_close($stmt);
        http_response_code(404);
        echo json_encode([
            "status" => "error",
            "message" => "Station not found"
        ]);
        exit;
    }
    mysqli_stmt_close($stmt);

    $table = resolveStationTable($dbcnx, $s_id);

    if ($table === null) {
        http_response_code(404);
        echo json_encode([
            "status" => "error",
            "message" => "Data table for station '{$s_name}' does not exist"
        ]);
        exit;
    }

    $result = mysqli_query($dbcnx, "
        SELECT DISTINCT n_name
        FROM `{$table}`
        ORDER BY n_name ASC
    ");

    $nodes = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $nodes[] = $row['n_name'];
    }

    echo json_encode([
        "status" => "success",
        "s_name" => $s_name,
        "s_id" => $s_id,
        "table" => $table,
        "node_names" => $nodes
    ]);

    mysqli_close($dbcnx);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
?>