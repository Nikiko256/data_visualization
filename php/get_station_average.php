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
if (json_last_error() !== JSON_ERROR_NONE || empty($data['s_name'])) {
    http_response_code(422);
    echo json_encode([
        "status" => "error",
        "message" => "Invalid JSON or missing 's_name'"
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

    // Βρες s_id από το station name
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

    $s_id = (string)$s_id;
    $table = preg_replace('/[^a-zA-Z0-9_]/', '_', $s_id);

    if ($table === null || $table === '') {
        throw new Exception("Invalid station table name");
    }

    // Έλεγξε ότι υπάρχει το table
    $check = mysqli_query($dbcnx, "SHOW TABLES LIKE '{$table}'");
    if (mysqli_num_rows($check) === 0) {
        http_response_code(404);
        echo json_encode([
            "status" => "error",
            "message" => "Data table for station does not exist"
        ]);
        exit;
    }

    // Μέσοι όροι από το τελευταίο row κάθε node
    $avgSql = "
        SELECT 
            AVG(t.soilTemp)  AS avg_soilTemp,
            AVG(t.soilMoist) AS avg_soilMoist,
            AVG(t.airTemp)   AS avg_airTemp,
            AVG(t.airHumid)  AS avg_airHumid,
            AVG(t.airPress)  AS avg_airPress,
            AVG(t.rainDepth) AS avg_rainDepth,
            AVG(t.windSpeed) AS avg_windSpeed,
            COUNT(*)         AS node_count,
            MAX(t.created_at) AS latest_created_at
        FROM `{$table}` t
        INNER JOIN (
            SELECT n_name, MAX(created_at) AS latest_created_at
            FROM `{$table}`
            GROUP BY n_name
        ) latest
        ON t.n_name = latest.n_name
        AND t.created_at = latest.latest_created_at
    ";

    $avgResult = mysqli_query($dbcnx, $avgSql);
    $avgRow = mysqli_fetch_assoc($avgResult);

    // Πιο συχνό windDirection από το τελευταίο row κάθε node
    $windSql = "
        SELECT t.windDirection, COUNT(*) AS freq
        FROM `{$table}` t
        INNER JOIN (
            SELECT n_name, MAX(created_at) AS latest_created_at
            FROM `{$table}`
            GROUP BY n_name
        ) latest
        ON t.n_name = latest.n_name
        AND t.created_at = latest.latest_created_at
        WHERE t.windDirection IS NOT NULL
          AND t.windDirection <> ''
        GROUP BY t.windDirection
        ORDER BY freq DESC, t.windDirection ASC
        LIMIT 1
    ";

    $windResult = mysqli_query($dbcnx, $windSql);
    $windRow = mysqli_fetch_assoc($windResult);
    $dominantWindDirection = $windRow ? $windRow['windDirection'] : null;

    echo json_encode([
        "status" => "success",
        "s_name" => $s_name,
        "s_id" => $s_id,
        "node_count" => isset($avgRow['node_count']) ? (int)$avgRow['node_count'] : 0,
        "latest_created_at" => $avgRow['latest_created_at'] ?? null,
        "averages" => [
            "soilTemp" => $avgRow['avg_soilTemp'] !== null ? (float)$avgRow['avg_soilTemp'] : null,
            "soilMoist" => $avgRow['avg_soilMoist'] !== null ? (float)$avgRow['avg_soilMoist'] : null,
            "airTemp" => $avgRow['avg_airTemp'] !== null ? (float)$avgRow['avg_airTemp'] : null,
            "airHumid" => $avgRow['avg_airHumid'] !== null ? (float)$avgRow['avg_airHumid'] : null,
            "airPress" => $avgRow['avg_airPress'] !== null ? (float)$avgRow['avg_airPress'] : null,
            "rainDepth" => $avgRow['avg_rainDepth'] !== null ? (float)$avgRow['avg_rainDepth'] : null,
            "windSpeed" => $avgRow['avg_windSpeed'] !== null ? (float)$avgRow['avg_windSpeed'] : null,
            "windDirection" => $dominantWindDirection
        ]
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