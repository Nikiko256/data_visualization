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

// Step 1: Get the input data
$input = trim(file_get_contents('php://input'));


if (!$input) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing data parameter"]);
    exit;
}

// Step 2: Explode the string
$values = explode(";", $input);

if (count($values) !== 11) {
    http_response_code(422);
    echo json_encode(["status" => "error", "message" => "Expected 11 values"]);
    exit;
}

// Step 3: Assign values
$soil_temperature  = floatval($values[0]);
$soil_moisture     = floatval($values[1]);
$air_temperature   = floatval($values[2]);
$air_humidity      = floatval($values[3]);
$air_pressure      = floatval($values[4]);
$rain_depth        = floatval($values[5]);
$wind_speed        = floatval($values[6]);
$wind_direction    = trim($values[7]); // VARCHAR
$n_name            = trim($values[8]); // node name
$s_id              = trim($values[9]); // station id
$s_name            = trim($values[10]); // station name

try {
    // Step 4: Connect to DB
    $host = $_ENV['DB_HOST'];
    $db   = $_ENV['DB_NAME'];
    $user = $_ENV['DB_USER'];
    $pass = $_ENV['DB_PASS'];

    $dbcnx = mysqli_connect($host, $user, $pass, $db);

    // Step 5: Create table [s_id] if it doesn't exist
    $s_id_sanitized = preg_replace('/[^a-zA-Z0-9_]/', '_', $s_id); // Prevent SQL injection in table name
    $table_check = mysqli_query($dbcnx, "SHOW TABLES LIKE '{$s_id_sanitized}'");

    if (mysqli_num_rows($table_check) === 0) {
        $create_table_sql = "
            CREATE TABLE `{$s_id_sanitized}` (
                n_name        VARCHAR(50),
                soilTemp      FLOAT,
                soilMoist     FLOAT,
                airTemp       FLOAT,
                airHumid      FLOAT,
                airPress      FLOAT,
                rainDepth     FLOAT,
                windSpeed     FLOAT,
                windDirection VARCHAR(10),
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (n_name, created_at)
            )
        ";
        mysqli_query($dbcnx, $create_table_sql);
    }

    // Step 6: Insert data into the [s_id] table
    $insert_sql = "
        INSERT INTO `{$s_id_sanitized}` (
            n_name, soilTemp, soilMoist, airTemp, airHumid,
            airPress, rainDepth, windSpeed, windDirection
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ";

    $stmt = mysqli_prepare($dbcnx, $insert_sql);
    mysqli_stmt_bind_param(
        $stmt,
        'sddddddds',
        $n_name,
        $soil_temperature,
        $soil_moisture,
        $air_temperature,
        $air_humidity,
        $air_pressure,
        $rain_depth,
        $wind_speed,
        $wind_direction
    );
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    // Step 7: Insert into `stations` if not exists
    $check_station = mysqli_prepare($dbcnx, "SELECT s_id FROM stations WHERE s_id = ?");
    mysqli_stmt_bind_param($check_station, 's', $s_id);
    mysqli_stmt_execute($check_station);
    mysqli_stmt_store_result($check_station);

    if (mysqli_stmt_num_rows($check_station) === 0) {
        mysqli_stmt_close($check_station);

        $insert_station = mysqli_prepare(
            $dbcnx,
            "INSERT INTO stations (s_id, s_name) VALUES (?, ?)"
        );
        mysqli_stmt_bind_param($insert_station, 'ss', $s_id, $s_name);
        mysqli_stmt_execute($insert_station);
        mysqli_stmt_close($insert_station);
    } else {
        mysqli_stmt_close($check_station);
    }

    // Step 8: Return response
    echo json_encode([
        "status" => "success",
        "message" => "Data inserted",
        "table" => $s_id_sanitized
    ]);

    mysqli_close($dbcnx);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
?>
