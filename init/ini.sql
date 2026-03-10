CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE hikes (
    id SERIAL PRIMARY KEY,
    name TEXT,
    difficulty INTEGER,
    affluence INTEGER,
    gaz BOOLEAN,
    notes TEXT,
    geom GEOMETRY(Point, 4326)
);
