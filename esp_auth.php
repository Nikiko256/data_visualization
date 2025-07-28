<?php

$device_id = $_POST['id'] ?? 'UNKNOWN';
$temp = $_POST['temp'] ?? null;
$hum = $_POST['hum'] ?? null;

$conn = new mysqli("localhost", "user", "pass", "sensor_db");
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$stmt = $conn->prepare("INSERT INTO readings (device_id, temperature, humidity, timestamp) VALUES (?, ?, ?, NOW())");
$stmt->bind_param("sdd", $device_id, $temp, $hum);
$stmt->execute();
$stmt->close();
$conn->close();

echo "OK";
?>
