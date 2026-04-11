<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

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

$input = trim(file_get_contents('php://input'));
if (!$input) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "Missing JSON payload"
    ]);
    exit;
}

$data = json_decode($input, true);
if (
    json_last_error() !== JSON_ERROR_NONE ||
    empty($data['s_name']) ||
    !isset($data['hours'])
) {
    http_response_code(422);
    echo json_encode([
        "status" => "error",
        "message" => "Invalid JSON or missing 's_name' / 'hours'"
    ]);
    exit;
}

$s_name = trim($data['s_name']);
$hours = intval($data['hours']);

if ($hours <= 0) {
    http_response_code(422);
    echo json_encode([
        "status" => "error",
        "message" => "'hours' must be a positive integer"
    ]);
    exit;
}

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

    $sql = "
        SELECT
            bucket_time AS created_at,
            AVG(soilTemp)  AS soilTemp,
            AVG(soilMoist) AS soilMoist,
            AVG(airTemp)   AS airTemp,
            AVG(airHumid)  AS airHumid,
            AVG(airPress)  AS airPress,
            AVG(rainDepth) AS rainDepth,
            AVG(windSpeed) AS windSpeed
        FROM (
            SELECT
                FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(created_at) / 300) * 300) AS bucket_time,
                soilTemp,
                soilMoist,
                airTemp,
                airHumid,
                airPress,
                rainDepth,
                windSpeed
            FROM `{$table}`
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL {$hours} HOUR)
        ) t
        GROUP BY bucket_time
        ORDER BY bucket_time ASC
    ";

    $result = mysqli_query($dbcnx, $sql);

    $rows = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $bucketTime = $row['created_at'];

        $windSql = "
            SELECT windDirection
            FROM (
                SELECT
                    FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(created_at) / 300) * 300) AS bucket_time,
                    windDirection
                FROM `{$table}`
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL {$hours} HOUR)
            ) w
            WHERE w.bucket_time = ?
              AND w.windDirection IS NOT NULL
              AND w.windDirection <> ''
            GROUP BY windDirection
            ORDER BY COUNT(*) DESC, windDirection ASC
            LIMIT 1
        ";

        $windStmt = mysqli_prepare($dbcnx, $windSql);
        mysqli_stmt_bind_param($windStmt, 's', $bucketTime);
        mysqli_stmt_execute($windStmt);
        mysqli_stmt_bind_result($windStmt, $windDirection);

        $dominantWind = null;
        if (mysqli_stmt_fetch($windStmt)) {
            $dominantWind = $windDirection;
        }
        mysqli_stmt_close($windStmt);

        $rows[] = [
            "soilTemp" => $row['soilTemp'] !== null ? (float)$row['soilTemp'] : null,
            "soilMoist" => $row['soilMoist'] !== null ? (float)$row['soilMoist'] : null,
            "airTemp" => $row['airTemp'] !== null ? (float)$row['airTemp'] : null,
            "airHumid" => $row['airHumid'] !== null ? (float)$row['airHumid'] : null,
            "airPress" => $row['airPress'] !== null ? (float)$row['airPress'] : null,
            "rainDepth" => $row['rainDepth'] !== null ? (float)$row['rainDepth'] : null,
            "windSpeed" => $row['windSpeed'] !== null ? (float)$row['windSpeed'] : null,
            "windDirection" => $dominantWind,
            "created_at" => $bucketTime
        ];
    }

    echo json_encode([
        "status" => "success",
        "s_name" => $s_name,
        "s_id" => $s_id,
        "hours" => $hours,
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