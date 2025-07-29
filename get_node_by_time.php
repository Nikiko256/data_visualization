<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/load_env.php';
loadEnv(__DIR__ . '/.env');

header('Content-Type: application/json');

// Step 1: Read and validate input JSON
$input = trim(file_get_contents('php://input'));
if (!$input) {
    http_response_code(400);
    echo json_encode([
        "status"  => "error",
        "message" => "Missing JSON payload"
    ]);
    exit;
}

$data = json_decode($input, true);
if (
    json_last_error() !== JSON_ERROR_NONE ||
    empty($data['s_name']) ||
    empty($data['n_name']) ||
    !isset($data['hours'])
) {
    http_response_code(422);
    echo json_encode([
        "status"  => "error",
        "message" => "Invalid JSON or missing 's_name', 'n_name', or 'hours'"
    ]);
    exit;
}

$s_name = trim($data['s_name']);
$n_name = trim($data['n_name']);
$hours  = intval($data['hours']);
if ($hours <= 0) {
    http_response_code(422);
    echo json_encode([
        "status"  => "error",
        "message" => "'hours' must be a positive integer"
    ]);
    exit;
}

try {
    // Step 2: Connect to the database
    $host = $_ENV['DB_HOST'];
    $db   = $_ENV['DB_NAME'];
    $user = $_ENV['DB_USER'];
    $pass = $_ENV['DB_PASS'];
    $dbcnx = mysqli_connect($host, $user, $pass, $db);

    // Step 3: Lookup s_id from stations
    $stmt = mysqli_prepare($dbcnx, "SELECT s_id FROM stations WHERE s_name = ?");
    mysqli_stmt_bind_param($stmt, 's', $s_name);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_bind_result($stmt, $s_id);
    if (!mysqli_stmt_fetch($stmt)) {
        mysqli_stmt_close($stmt);
        http_response_code(404);
        echo json_encode([
            "status"  => "error",
            "message" => "Station not found"
        ]);
        exit;
    }
    mysqli_stmt_close($stmt);

    // Step 4: Sanitize table name
    $table = preg_replace('/[^a-zA-Z0-9_]/', '_', $s_id);

    // Step 5: Ensure the station’s data table exists
    $check = mysqli_query($dbcnx, "SHOW TABLES LIKE '{$table}'");
    if (mysqli_num_rows($check) === 0) {
        http_response_code(404);
        echo json_encode([
            "status"  => "error",
            "message" => "Data table for station '{$s_name}' does not exist"
        ]);
        exit;
    }

    // Step 6: Fetch rows for that node within the last X hours
    // Note: $hours is sanitized as an integer above
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
          AND created_at >= DATE_SUB(NOW(), INTERVAL {$hours} HOUR)
        ORDER BY created_at ASC
    ";
    $stmt = mysqli_prepare($dbcnx, $query);
    mysqli_stmt_bind_param($stmt, 's', $n_name);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    $rows = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $rows[] = $row;
    }
    mysqli_stmt_close($stmt);

    // Step 7: Return JSON response
    echo json_encode([
        "status"  => "success",
        "s_id"    => $s_id,
        "s_name"  => $s_name,
        "n_name"  => $n_name,
        "hours"   => $hours,
        "data"    => $rows
    ]);

    mysqli_close($dbcnx);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status"  => "error",
        "message" => $e->getMessage()
    ]);
}
?>
