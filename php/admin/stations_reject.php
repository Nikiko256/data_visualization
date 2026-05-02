<?php
require_once __DIR__ . '/_db.php';

$input = json_decode(file_get_contents('php://input'), true);
$s_id = trim($input['s_id'] ?? '');

if ($s_id === '') {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "Missing s_id"
    ]);
    exit;
}

$cnx = db();

$stmt = mysqli_prepare($cnx, "
    UPDATE stations
    SET status = 'rejected'
    WHERE s_id = ?
");

mysqli_stmt_bind_param($stmt, 's', $s_id);
mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

echo json_encode([
    "status" => "success",
    "message" => "Station rejected",
    "s_id" => $s_id
]);