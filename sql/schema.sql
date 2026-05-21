CREATE TABLE stations (
    s_id VARCHAR(50) PRIMARY KEY,
    s_name VARCHAR(250)
);

CREATE TABLE IF NOT EXISTS station_nodes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  s_id VARCHAR(50) NOT NULL,
  n_name VARCHAR(50) NOT NULL,
  display_name VARCHAR(120) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_station_node (s_id, n_name),
  CONSTRAINT fk_nodes_station
    FOREIGN KEY (s_id) REFERENCES stations(s_id)
    ON DELETE CASCADE
);


ALTER TABLE stations
  ADD COLUMN user_id INT NULL,
  ADD COLUMN is_public TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE stations
  ADD CONSTRAINT fk_stations_user
  FOREIGN KEY (user_id) REFERENCES users(user_id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX idx_stations_user ON stations(user_id);


CREATE TABLE IF NOT EXISTS station_nodes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  s_id VARCHAR(50) NOT NULL,
  n_name VARCHAR(50) NOT NULL,
  display_name VARCHAR(120) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_station_node (s_id, n_name)
);

CREATE TABLE station_nodes (
  s_id VARCHAR(50) NOT NULL,
  n_name VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (s_id, n_name)
);
