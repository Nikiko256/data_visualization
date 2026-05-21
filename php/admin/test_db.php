<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/_dB.php';

echo "<pre>";

echo "DB_HOST: " . ($_ENV['DB_HOST'] ?? 'EMPTY') . "\n";
echo "DB_NAME: " . ($_ENV['DB_NAME'] ?? 'EMPTY') . "\n";
echo "DB_USER: " . ($_ENV['DB_USER'] ?? 'EMPTY') . "\n";
echo "DB_PASS: " . (isset($_ENV['DB_PASS']) ? 'SET' : 'EMPTY') . "\n\n";

$cnx = db();

echo "Database connection OK\n\n";

$result = mysqli_query($cnx, "SHOW TABLES");

while ($row = mysqli_fetch_array($result)) {
    print_r($row);
}

echo "</pre>";