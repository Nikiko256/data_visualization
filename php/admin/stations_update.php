<?php
require_once __DIR__ . '/_db.php';

try {
    $in = read_json();

    $s_id = trim($in['s_id'] ?? '');
    $s_name = trim($in['s_name'] ?? '');

    if ($s_id === '' || $s_name === '') {
        fail(422, "Missing s_id or s_name");
    }

    $cnx = db();

    $stmt = mysqli_prepare($cnx, "
        UPDATE stations
        SET s_name = ?
        WHERE s_id = ?
    ");

    mysqli_stmt_bind_param($stmt, 'ss', $s_name, $s_id);
    mysqli_stmt_execute($stmt);

    $affected = mysqli_stmt_affected_rows($stmt);

    mysqli_stmt_close($stmt);

    ok([
        "message" => "Station updated",
        "affected_rows" => $affected
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');

    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}