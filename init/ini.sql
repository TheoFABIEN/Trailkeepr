CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS points (
    id SERIAL PRIMARY KEY,
    name TEXT,
    difficulty INTEGER,
    gaz BOOLEAN,
    notes TEXT,
    geom GEOMETRY(Point, 4326)
);

CREATE TABLE IF NOT EXISTS areas (
    id SERIAL PRIMARY KEY,
    name TEXT,
    notes TEXT,
    geom GEOMETRY(Polygon, 4326)
);

CREATE TABLE IF NOT EXISTS gpx_hikes (
    id SERIAL PRIMARY KEY,
    name TEXT,
    difficulty INTEGER,
    gaz BOOLEAN,
    notes TEXT,
    distance_km FLOAT,
    elevation_gain INTEGER,
    elevation_loss INTEGER,
    geom GEOMETRY(LineString, 4326)
);

CREATE INDEX IF NOT EXISTS idx_points_geom ON points USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_areas_geom ON areas USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_gpx_hikes_geom ON gpx_hikes USING GIST (geom);

CREATE TABLE IF NOT EXISTS photos (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('gpx_hikes', 'points', 'areas')),
    filename TEXT NOT NULL,
    caption TEXT
);
