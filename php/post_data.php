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

$input = trim(file_get_contents('php://input'));


if ($input === '') {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "Missing data"
    ]);
    exit;
}

$values = explode(';', $input);

if (count($values) !== 11) {
    http_response_code(422);
    echo json_encode([
        "status" => "error",
        "message" => "Expected 11 values"
    ]);
    exit;
}

$soil_temperature = floatval($values[0]);
$soil_moisture    = floatval($values[1]);
$air_temperature  = floatval($values[2]);
$air_humidity     = floatval($values[3]);
$air_pressure     = floatval($values[4]);
$rain_depth       = floatval($values[5]);
$wind_speed       = floatval($values[6]);
$wind_direction   = trim($values[7]);
$n_name           = trim($values[8]);
$s_id             = trim($values[9]);
$s_name           = trim($values[10]);

if ($n_name === '' || $s_id === '' || $s_name === '') {
    http_response_code(422);
    echo json_encode([
        "status" => "error",
        "message" => "n_name, s_id and s_name are required"
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

    $s_id_sanitized = preg_replace('/[^a-zA-Z0-9_]/', '_', $s_id);
    $s_name_clean = trim($s_name);
    $table = 'station_' . $s_id_sanitized;

    if ($s_id_sanitized === '') {
        throw new Exception("Invalid station id");
    }

    $table_check = mysqli_query($dbcnx, "SHOW TABLES LIKE '{$table}'");
    $is_new_station_table = (mysqli_num_rows($table_check) === 0);

    if ($is_new_station_table) {
        mysqli_query($dbcnx, "
            CREATE TABLE `{$table}` (
                n_name        VARCHAR(50) NOT NULL,
                soilTemp      FLOAT DEFAULT NULL,
                soilMoist     FLOAT DEFAULT NULL,
                airTemp       FLOAT DEFAULT NULL,
                airHumid      FLOAT DEFAULT NULL,
                airPress      FLOAT DEFAULT NULL,
                rainDepth     FLOAT DEFAULT NULL,
                windSpeed     FLOAT DEFAULT NULL,
                windDirection VARCHAR(10) DEFAULT NULL,
                created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (n_name, created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
    }

    $check_station = mysqli_prepare($dbcnx, "SELECT 1 FROM stations WHERE s_id = ? LIMIT 1");
    mysqli_stmt_bind_param($check_station, 's', $s_id);
    mysqli_stmt_execute($check_station);
    mysqli_stmt_store_result($check_station);
    $station_exists = mysqli_stmt_num_rows($check_station) > 0;
    mysqli_stmt_close($check_station);

    if (!$station_exists) {
        $insert_station = mysqli_prepare($dbcnx, "
            INSERT INTO stations (s_id, s_name)
            VALUES (?, ?)
        ");
        mysqli_stmt_bind_param($insert_station, 'ss', $s_id, $s_name_clean);
        mysqli_stmt_execute($insert_station);
        mysqli_stmt_close($insert_station);
    } else {
        $update_station = mysqli_prepare($dbcnx, "
            UPDATE stations
            SET s_name = ?
            WHERE s_id = ?
        ");
        mysqli_stmt_bind_param($update_station, 'ss', $s_name_clean, $s_id);
        mysqli_stmt_execute($update_station);
        mysqli_stmt_close($update_station);
    }

    $check_node = mysqli_prepare($dbcnx, "
        SELECT 1
        FROM station_nodes
        WHERE s_id = ? AND n_name = ?
        LIMIT 1
    ");
    mysqli_stmt_bind_param($check_node, 'ss', $s_id, $n_name);
    mysqli_stmt_execute($check_node);
    mysqli_stmt_store_result($check_node);
    $node_exists = mysqli_stmt_num_rows($check_node) > 0;
    mysqli_stmt_close($check_node);

    if (!$node_exists) {
        $insert_node = mysqli_prepare($dbcnx, "
            INSERT INTO station_nodes (s_id, n_name, display_name, is_active)
            VALUES (?, ?, ?, 1)
        ");
        mysqli_stmt_bind_param($insert_node, 'sss', $s_id, $n_name, $n_name);
        mysqli_stmt_execute($insert_node);
        mysqli_stmt_close($insert_node);
    }

    $stmt = mysqli_prepare($dbcnx, "
        INSERT INTO `{$table}` (
            n_name, soilTemp, soilMoist, airTemp, airHumid,
            airPress, rainDepth, windSpeed, windDirection
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

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

    echo json_encode([
        "status" => "success",
        "message" => "Data inserted",
        "table" => $table,
        "s_id" => $s_id,
        "s_name" => $s_name_clean,
        "n_name" => $n_name
    ]);

    mysqli_close($dbcnx);
    exit;

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
    exit;
}
?>