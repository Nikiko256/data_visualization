<?php
// Database connection config
$host = $_ENV['DB_HOST'];
$db   = $_ENV['DB_NAME'];
$user = $_ENV['DB_USER'];
$pass = $_ENV['DB_PASS'];

$dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";

try {
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Get data from POST request (e.g., from a sensor)
$airtemp       = $_POST['airtemp'] ?? null;
$airpressure   = $_POST['airpressure'] ?? null;
$airmoisture   = $_POST['airmoisture'] ?? null;
$soiltemp      = $_POST['soiltemp'] ?? null;
$soilmoisture  = $_POST['soilmoisture'] ?? null;
$airspeed      = $_POST['airspeed'] ?? null;
$airdirection  = $_POST['airdirection'] ?? null;

// Optional: Validate the inputs here (e.g., is_numeric, ranges)

// Insert into database
$sql = "INSERT INTO sensor_data (airtemp, airpressure, airmoisture, soiltemp, soilmoisture, airspeed, airdirection)
        VALUES (:airtemp, :airpressure, :airmoisture, :soiltemp, :soilmoisture, :airspeed, :airdirection)";
$stmt = $pdo->prepare($sql);
$success = $stmt->execute([
    ':airtemp'      => $airtemp,
    ':airpressure'  => $airpressure,
    ':airmoisture'  => $airmoisture,
    ':soiltemp'     => $soiltemp,
    ':soilmoisture' => $soilmoisture,
    ':airspeed'     => $airspeed,
    ':airdirection' => $airdirection
]);

if ($success) {
    echo json_encode(['status' => 'success', 'message' => 'Data inserted']);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Insert failed']);
}
?>
