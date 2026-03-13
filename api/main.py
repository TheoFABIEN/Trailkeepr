from fastapi import FastAPI, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import psycopg2
import psycopg2.extras
import json
import gpxpy


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



# HIKING SPOT MODEL
class NewHike(BaseModel):
    name: str
    notes: Optional[str] = None
    difficulty: Optional[int] = None
    gaz: Optional[bool] = None
    lat: float
    lon: float
# CLIMBING SPOT MODEL
class NewClimbingSpot(BaseModel):
    name: str
    notes: str | None = None
    geometry: dict

@app.post("/add_hike")
def add_hike(hike: NewHike):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO hikes (name, difficulty, gaz, notes, geom)
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    ST_SetSRID(ST_MakePoint(%s,%s),4326)
                )
            """, (
                    hike.name, 
                    hike.difficulty, 
                    hike.gaz, 
                    hike.notes, 
                    hike.lon, 
                    hike.lat
                ))

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

# DELETING CLIMBING SPOTS
@app.delete("/climbing_spots/{spot_id}")
def delete_climbing_spot(spot_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM climbing_spots WHERE id = %s",
                (spot_id,)
            )
    return {"status": "deleted"}

# DELETING GPX HIKES
@app.delete("/gpx_hikes/{gpx_id}")
def delete_gpx(gpx_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM gpx_hikes WHERE id = %s",
                (gpx_id,)
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


# GPX IMPORT
@app.post("/upload_gpx")
async def upload_gpx(
        file: UploadFile = File(...),
        name: str = Form(None),
        difficulty: int = Form(None),
        gaz: bool = Form(None),
        notes: str = Form(None)
        ):

    gpx_data = await file.read()
    gpx = gpxpy.parse(gpx_data.decode())

    if not name:
        name = gpx.name if gpx.name else "Undefined"

    points = []

    for track in gpx.tracks:
        for segment in track.segments:
            for p in segment.points:
                points.append([p.longitude, p.latitude])

    geojson = {
        "type": "LineString",
        "coordinates": points
    }

    with get_conn() as conn:
        with conn.cursor() as cur:

            cur.execute("""
            INSERT INTO gpx_hikes (name, geom, notes)
            VALUES (
                %s,
                ST_SetSRID(
                    ST_GeomFromGeoJSON(%s),
                    4326
                ),
                %s
            )
            """, (name, json.dumps(geojson), notes))

    return {"status": "ok"}


# GET GPX HIKES FROM DATABASE
@app.get("/gpx_hikes")
def get_gpx_hikes():

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:

            cur.execute("""
            SELECT id, name, notes,
            ST_AsGeoJSON(geom) as geom
            FROM gpx_hikes
            """)

            hikes = cur.fetchall()

    return hikes
