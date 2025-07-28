<?php
// ————————————————————————————
// 0) Show all PHP errors/warnings
// ————————————————————————————
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// ————————————————————————————
// 1) Make MySQLi throw exceptions on errors
// ————————————————————————————
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/load_env.php';
loadEnv(__DIR__ . '/.env');

header('Content-Type: application/json');

try {
    // 2) Read & coerce inputs from POST
    $airtemp      = isset($_POST['airtemp'])      ? (float) $_POST['airtemp']      : null;
    $airpressure  = isset($_POST['airpressure'])  ? (float) $_POST['airpressure']  : null;
    $airmoisture  = isset($_POST['airmoisture'])  ? (float) $_POST['airmoisture']  : null;
    $soiltemp     = isset($_POST['soiltemp'])     ? (float) $_POST['soiltemp']     : null;
    $soilmoisture = isset($_POST['soilmoisture']) ? (float) $_POST['soilmoisture'] : null;
    $airspeed     = isset($_POST['airspeed'])     ? (float) $_POST['airspeed']     : null;
    $airdirection = isset($_POST['airdirection']) ? trim($_POST['airdirection'])  : null;
    $rainDepth    = isset($_POST['rainDepth'])    ? (float) $_POST['rainDepth']    : null;

    // 3) DB creds
    $host = $_ENV['DB_HOST'];
    $db   = $_ENV['DB_NAME'];
    $user = $_ENV['DB_USER'];
    $pass = $_ENV['DB_PASS'];

    // 4) Connect (throws on failure)
    $dbcnx = mysqli_connect($host, $user, $pass, $db);

    // 5) Prepare & bind (including rainDepth)
    $stmt = mysqli_prepare(
        $dbcnx,
        "INSERT INTO sensor_data
         (airtemp, airpressure, airmoisture, soiltemp, soilmoisture, airspeed, airdirection, rainDepth)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    mysqli_stmt_bind_param(
        $stmt,
        'ddddddsd',
        $airtemp,
        $airpressure,
        $airmoisture,
        $soiltemp,
        $soilmoisture,
        $airspeed,
        $airdirection,
        $rainDepth
    );

    // 6) Execute
    mysqli_stmt_execute($stmt);

    // 7) Return success + new ID
    echo json_encode([
        'status'    => 'success',
        'message'   => 'Data inserted',
        'insert_id' => mysqli_insert_id($dbcnx)
    ]);

    // 8) Cleanup
    mysqli_stmt_close($stmt);
    mysqli_close($dbcnx);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => $e->getMessage()
    ]);
}