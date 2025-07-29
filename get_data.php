<?php
// ————————————————————————————
// 0) Turn on all PHP errors/warnings (will show up in your response)
// ————————————————————————————
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// ————————————————————————————
// 1) Tell mysqli to throw exceptions on errors
// ————————————————————————————
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/load_env.php';
loadEnv(__DIR__ . '/.env');

header('Content-Type: application/json');

// 2. Read creds from .env
$host = $_ENV['DB_HOST'];
$db   = $_ENV['DB_NAME'];
$user = $_ENV['DB_USER'];
$pass = $_ENV['DB_PASS'];

// 3. Connect with mysqli (procedural style)
//    will now *throw* a mysqli_sql_exception if it fails
$dbcnx = mysqli_connect($host, $user, $pass, $db);

// 4. Run your query
$sql    = "SELECT * FROM sensor_data ORDER BY create_at DESC";
$result = mysqli_query($dbcnx, $sql);

// 5. Fetch all rows into an array
$data = [];
while ($row = mysqli_fetch_assoc($result)) {
    $data[] = $row;
}

// 6. Return JSON
echo json_encode([
    'status' => 'success',
    'data'   => $data
]);

// 7. Clean up
mysqli_free_result($result);
mysqli_close($dbcnx);