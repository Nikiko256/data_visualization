<?php
// Allow requests from anywhere (you can lock this down to your dev origin
// "http://127.0.0.1:5500" instead of "*")
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/load_env.php';
loadEnv(__DIR__ . '/../.env');

header('Content-Type: application/json');

// Step 1: Get the input data (expects JSON: { "s_name": "Station Name" })
$input = trim(file_get_contents('php://input'));
if (!$input) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing JSON payload"]);
    exit;
}

$data = json_decode($input, true);
if (json_last_error() !== JSON_ERROR_NONE || empty($data['s_name'])) {
    http_response_code(422);
    echo json_encode(["status" => "error", "message" => "Invalid JSON or missing 's_name'"]);
    exit;
}
$s_name = trim($data['s_name']);

try {
    // Step 2: Connect to DB
    $host = $_ENV['DB_HOST'];
    $db   = $_ENV['DB_NAME'];
    $user = $_ENV['DB_USER'];
    $pass = $_ENV['DB_PASS'];
    $dbcnx = mysqli_connect($host, $user, $pass, $db);

    // Step 3: Find s_id by s_name
    $stmt = mysqli_prepare($dbcnx, "SELECT s_id FROM stations WHERE s_name = ?");
    mysqli_stmt_bind_param($stmt, 's', $s_name);
    mysqli_stmt_execute($stmt);

    $s_id = null;
    mysqli_stmt_bind_result($stmt, $s_id);
    if (!mysqli_stmt_fetch($stmt)) {
        // no matching station name
        mysqli_stmt_close($stmt);
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Station not found"]);
        exit;
    }
    mysqli_stmt_close($stmt);

    $s_id = (string)$s_id;

    // Step 4: Sanitize table name
    $table = preg_replace('/[^a-zA-Z0-9_]/', '_', $s_id);
    if ($table === null) {
        throw new Exception("Failed to sanitize table name");
    }


    // Step 5: Check that table exists
    $check = mysqli_query($dbcnx, "SHOW TABLES LIKE '{$table}'");
    if (mysqli_num_rows($check) === 0) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Data table for station '{$s_name}' does not exist"]);
        exit;
    }

    // Step 6: Fetch all data
    $result = mysqli_query($dbcnx, "SELECT * FROM `{$table}` ORDER BY created_at ASC");
    $rows = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $rows[] = $row;
    }

    // Step 7: Return JSON response
    echo json_encode([
        "status"   => "success",
        "s_id"     => $s_id,
        "s_name"   => $s_name,
        "data"     => $rows
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
