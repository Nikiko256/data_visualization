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

if (empty($data['s_name']) || empty($data['n_name'])) {
    http_response_code(422);
    echo json_encode([
        "status" => "error",
        "message" => "Missing s_name or n_name"
    ]);
    exit;
}

$s_name = trim($data['s_name']);
$n_name = trim($data['n_name']);

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

    $query = "
        SELECT
            n_name,
            soilTemp,
            soilMoist,
            airTemp,
            airHumid,
            airPress,
            rainDepth,
            windSpeed,
            windDirection,
            created_at
        FROM `{$table}`
        WHERE n_name = ?
        ORDER BY created_at ASC
    ";

    $stmt = mysqli_prepare($dbcnx, $query);
    mysqli_stmt_bind_param($stmt, 's', $n_name);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    $rows = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $rows[] = [
            "n_name" => $row['n_name'],
            "soilTemp" => $row['soilTemp'] !== null ? (float)$row['soilTemp'] : null,
            "soilMoist" => $row['soilMoist'] !== null ? (float)$row['soilMoist'] : null,
            "airTemp" => $row['airTemp'] !== null ? (float)$row['airTemp'] : null,
            "airHumid" => $row['airHumid'] !== null ? (float)$row['airHumid'] : null,
            "airPress" => $row['airPress'] !== null ? (float)$row['airPress'] : null,
            "rainDepth" => $row['rainDepth'] !== null ? (float)$row['rainDepth'] : null,
            "windSpeed" => $row['windSpeed'] !== null ? (float)$row['windSpeed'] : null,
            "windDirection" => $row['windDirection'],
            "created_at" => $row['created_at']
        ];
    }
    mysqli_stmt_close($stmt);

    echo json_encode([
        "status" => "success",
        "s_name" => $s_name,
        "s_id" => $s_id,
        "table" => $table,
        "n_name" => $n_name,
        "data" => $rows
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