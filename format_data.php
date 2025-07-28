<?php
// Accept raw input string, via GET or POST
$input = $_POST['data'] ?? $_GET['data'] ?? '';

if (!$input) {
    http_response_code(400);
    echo "Missing data parameter";
    exit;
}

// Split string by comma
$values = explode(",", $input);

// Check that we have exactly 8 values
if (count($values) !== 8) {
    http_response_code(422);
    echo "Invalid number of values. Expected 8 (7 float, 1 string)";
    exit;
}

// Sanitize and assign values
$soil_humidity     = floatval($values[0]);
$soil_temperature  = floatval($values[1]);
$air_humidity      = floatval($values[2]);
$air_temperature   = floatval($values[3]);
$air_pressure      = floatval($values[4]);
$air_speed         = floatval($values[5]);
$extra_float       = floatval($values[6]); // could be replaced or removed if unused
$air_direction     = trim($values[7]);     // this is the string

// Optional: Just return the formatted data for now
echo json_encode([
    "soil_humidity" => $soil_humidity,
    "soil_temperature" => $soil_temperature,
    "air_humidity" => $air_humidity,
    "air_temperature" => $air_temperature,
    "air_pressure" => $air_pressure,
    "air_speed" => $air_speed,
    "extra_float" => $extra_float,
    "air_direction" => $air_direction
]);
?>
