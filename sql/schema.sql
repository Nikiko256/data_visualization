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


/*CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(40) NULL,
  email VARCHAR(120) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nodes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  n_name VARCHAR(120) NOT NULL,         -- matches your existing n_name
  station_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_node_per_station (station_id, n_name),
  CONSTRAINT fk_nodes_station FOREIGN KEY (station_id) REFERENCES stations(id)
    ON DELETE CASCADE
); */

/* CREATE TABLE IF NOT EXISTS user_stations (
  u_id INT NOT NULL,
  s_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (u_id, s_id),

  -- one station -> one user
  UNIQUE KEY uq_user_stations_s_id (s_id),

  CONSTRAINT fk_us_user
    FOREIGN KEY (u_id) REFERENCES users(u_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT fk_us_station
    FOREIGN KEY (s_id) REFERENCES stations(s_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
*/

/*INSERT INTO user_stations (u_id, s_id)
SELECT user_id, s_id
FROM stations
ON DUPLICATE KEY UPDATE u_id = VALUES(u_id);
*/

CREATE TABLE IF NOT EXISTS station_nodes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  s_id VARCHAR(50) NOT NULL,
  n_name VARCHAR(50) NOT NULL,
  display_name VARCHAR(120) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_station_node (s_id, n_name)
);
