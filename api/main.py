from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
import psycopg2.extras
import json

origins = ["*"]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_conn():
    return psycopg2.connect(
        host="postgis",
        database="hiking",
        user="postgres",
        password="postgres"
    )

@app.get("/hikes")
def get_hikes(difficulty: int = Query(None, ge=1, le=5), gaz: bool = Query(None)):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:

            sql = """SELECT id, name, difficulty, affluence, gaz, notes,
                   ST_X(geom) as lon, ST_Y(geom) as lat, notes
                   FROM hikes"""
            filters = []
            params = []

            if difficulty is not None:
                filters.append("difficulty = %s")
                params.append(difficulty)
            if gaz is not None:
                filters.append("gaz = %s")
                params.append(gaz)
            if filters:
                sql += " WHERE " + " AND ".join(filters)
            #cur.execute("""
            #    SELECT id, name,
            #    ST_X(geom) as lon,
            #    ST_Y(geom) as lat,
	        #notes
            #    FROM hikes
            #""")
            cur.execute(sql, params)
            hikes = cur.fetchall()
    return hikes


@app.get("/climbing_spots")
def read_climbing_spots():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT id, name, notes, ST_AsGeoJSON(geom) AS geom FROM climbing_spots;"
            )
            spots = cur.fetchall()
    return spots



# ADDING HIKING SPOTS FROM MAP INTERFACE

class NewSpot(BaseModel):
    name: str
    notes: str | None = None
    difficulty: int
    affluence: int
    gaz: bool
    lat: float
    lon: float

class NewClimbingSpot(BaseModel):
    name: str
    notes: str | None = None
    geometry: dict

@app.post("/add_hike")
def add_hike(spot: NewSpot):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO hikes (name, difficulty, affluence, gaz, notes, geom)
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    ST_SetSRID(ST_MakePoint(%s,%s),4326)
                )
            """, (spot.name, spot.difficulty, spot.affluence, spot.gaz, spot.notes, spot.lon, spot.lat))

    return {"status": "ok"}


# DELETING HIKES
@app.delete("/hikes/{hike_id}")
def delete_hike(hike_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM hikes WHERE id = %s",
                (hike_id,)
            )
    return {"status": "deleted"}


# ADDING CLIMBING SPOTS FROM MAP INTERFACE

@app.post("/add_climbing_spot")
def add_climbing_spot(spot: NewClimbingSpot):

    with get_conn() as conn:
        with conn.cursor() as cur:

            cur.execute("""
                INSERT INTO climbing_spots (name, notes, geom)
                VALUES (
                    %s,
                    %s,
                    ST_SetSRID(
                        ST_GeomFromGeoJSON(%s),
                        4326
                    )
                )
            """, (spot.name, spot.notes, json.dumps(spot.geometry)))

    return {"status": "ok"}
