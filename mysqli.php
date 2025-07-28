<?php
$mysqli = new mysqli("localhost", "username", "password", "database_name");

if ($mysqli->connect_error) {
    die("Connection failed: " . $mysqli->connect_error);
}

$sql = "CREATE TABLE sensor_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    airtemp FLOAT,
    airpressure FLOAT,
    airmoisture FLOAT,
    soiltemp FLOAT,
    soilmoisture FLOAT,
    airspeed FLOAT,
    airdirection VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";

if ($mysqli->query($sql) === TRUE) {
    echo "Table sensor_data created successfully";
} else {
    echo "Error creating table: " . $mysqli->error;
}

$mysqli->close();
?>
