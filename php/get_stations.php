<?php
// Allow requests from anywhere (you can lock this down to your dev origin
// if you want: e.g. "http://127.0.0.1:5500" instead of "*")
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
loadEnv(__DIR__ . '../.env');

header('Content-Type: application/json');

try {
    // Connect to the database
    $host = $_ENV['DB_HOST'];
    $db   = $_ENV['DB_NAME'];
    $user = $_ENV['DB_USER'];
    $pass = $_ENV['DB_PASS'];
    $dbcnx = mysqli_connect($host, $user, $pass, $db);

    // Query all station names in alphabetical order
    $sql = "SELECT s_name FROM stations ORDER BY s_name ASC";
    $result = mysqli_query($dbcnx, $sql);

    $stations = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $stations[] = $row['s_name'];
    }

    // Return JSON response
    echo json_encode([
        "status"   => "success",
        "stations" => $stations
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
