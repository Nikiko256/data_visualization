CREATE TABLE sensor_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    airtemp FLOAT,
    airpressure FLOAT,
    airmoisture FLOAT,
    soiltemp FLOAT,
    soilmoisture FLOAT,
    airspeed FLOAT,
    airdirection VARCHAR(100),
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

