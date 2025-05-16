CREATE TABLE tracker_data (
    id SERIAL PRIMARY KEY,
    tracker_id VARCHAR(50) NOT NULL,
    location VARCHAR(255) NOT NULL,
    speed DECIMAL(10,2),
    status VARCHAR(50),
    last_update TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description VARCHAR(255),
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6)
);

CREATE INDEX idx_tracker_id ON tracker_data(tracker_id);
CREATE INDEX idx_last_update ON tracker_data(last_update); 