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

require_once __DIR__ . '/admin/_db.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $cnx = db();

    $sql = "
        SELECT s_id, s_name, status
        FROM stations
        WHERE status = 'approved'
        ORDER BY s_name ASC
    ";

    $result = mysqli_query($cnx, $sql);

    $stations = [];

    while ($row = mysqli_fetch_assoc($result)) {
        $s_id = (string)$row["s_id"];

        $cleanId = preg_replace('/[^a-zA-Z0-9_]/', '_', $s_id);

        if (str_starts_with($cleanId, 'station_')) {
            $table = $cleanId;
        } else {
            $table = 'station_' . $cleanId;
        }

        $last_update = null;

        $check = mysqli_query($cnx, "SHOW TABLES LIKE '{$table}'");

        if (mysqli_num_rows($check) > 0) {
            $lastQuery = mysqli_query($cnx, "
                SELECT MAX(created_at) AS last_update
                FROM `{$table}`
            ");

            $lastRow = mysqli_fetch_assoc($lastQuery);
            $last_update = $lastRow["last_update"];
        }

        $stations[] = [
            "s_id" => $row["s_id"],
            "s_name" => $row["s_name"],
            "status" => $row["status"],
            "last_update" => $last_update
        ];
    }

    echo json_encode([
        "status" => "success",
        "stations" => $stations
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    http_response_code(500);

    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}