import os
import aiofiles
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, Query, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import psycopg2
import psycopg2.extras
import json
import gpxpy
from database import get_conn


app = FastAPI()

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/points")
def get_points():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""SELECT id, name, notes,
                   ST_X(geom) as lon, ST_Y(geom) as lat
                   FROM points""")
            points = cur.fetchall()
    return points


@app.get("/areas")
def read_areas():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""SELECT id, name, notes, 
                ST_AsGeoJSON(geom) AS geom 
                FROM areas;""")
            areas = cur.fetchall()
    return areas



# POINTS MODEL
class NewPoint(BaseModel):
    name: str
    notes: Optional[str] = None
    lat: float
    lon: float
# AREA MODEL
class NewArea(BaseModel):
    name: str
    notes: str | None = None
    geometry: dict

@app.post("/add_point")
def add_point(point: NewPoint):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO points (name, notes, geom)
                VALUES (
                    %s,
                    %s,
                    ST_SetSRID(ST_MakePoint(%s,%s),4326)
                )
            """, (
                    point.name, 
                    point.notes, 
                    point.lon, 
                    point.lat
                ))

    return {"status": "ok"}


# DELETING POINT
@app.delete("/points/{point_id}")
def delete_point(point_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM points WHERE id = %s",
                (point_id,)
            )
    return {"status": "deleted"}

# DELETING AREAS
@app.delete("/areas/{area_id}")
def delete_area(area_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM areas WHERE id = %s",
                (area_id,)
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


# ADDING AREAS FROM MAP INTERFACE

@app.post("/add_area")
def add_area(area: NewArea):

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO areas (name, notes, geom)
                VALUES (
                    %s,
                    %s,
                    ST_SetSRID(
                        ST_GeomFromGeoJSON(%s),
                        4326
                    )
                )
            """, (area.name, area.notes, json.dumps(area.geometry)))

    return {"status": "ok"}


# GPX IMPORT

@app.post("/upload_gpx")
async def upload_gpx(
    file: UploadFile = File(...),
    name: str = Form(None),
    difficulty: Optional[int] = Form(None),
    gaz: Optional[bool] = Form(None),
    notes: str = Form(None)
):

    gpx_data = await file.read()
    gpx = gpxpy.parse(gpx_data.decode())

    if not name:
        name = gpx.name if gpx.name else "Unnamed hike"

    points = []
    elevations = []

    for track in gpx.tracks:
        for segment in track.segments:
            for p in segment.points:
                points.append([p.longitude, p.latitude])
                elevations.append(p.elevation)

    geojson = {
        "type": "LineString",
        "coordinates": points
    }

    distance_km = round(gpx.length_3d() / 1000, 2)
    elevation_gain = int(gpx.get_uphill_downhill().uphill)
    elevation_loss = int(gpx.get_uphill_downhill().downhill)

    with get_conn() as conn:
        with conn.cursor() as cur:

            cur.execute("""
            INSERT INTO gpx_hikes
            (name, difficulty, gaz, notes, distance_km, elevation_gain, elevation_loss, geom)
            VALUES (
                %s,%s,%s,%s,%s,%s,%s,
                ST_SetSRID(ST_GeomFromGeoJSON(%s),4326)
            )
            """, (
                name,
                difficulty,
                gaz,
                notes,
                distance_km,
                elevation_gain,
                elevation_loss,
                json.dumps(geojson)
            ))

    return {"status": "ok"}

# GET GPX HIKES FROM DATABASE
@app.get("/gpx_hikes")
def get_gpx_hikes(difficulty: int = Query(None, ge=1, le=5), gaz: bool = Query(None)):

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            sql = """
            SELECT id, name, difficulty, gaz, notes,
            distance_km,
            elevation_gain,
            elevation_loss,
            ST_AsGeoJSON(geom) as geom
            FROM gpx_hikes
            """
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
            cur.execute(sql, params)
            hikes = cur.fetchall()

    return hikes


class UpdateItem(BaseModel):
    name: str
    notes: Optional[str] = None
    difficulty: Optional[int] = None
    gaz: Optional[bool] = None

@app.put("/points/{item_id}")
def update_point(item_id: int, item: UpdateItem):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE points SET name = %s, notes = %s WHERE id = %s",
                (item.name, item.notes, item_id)
            )
    return {"status": "updated"}

@app.put("/areas/{item_id}")
def update_area(item_id: int, item: UpdateItem):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE areas SET name = %s, notes = %s WHERE id = %s",
                (item.name, item.notes, item_id)
            )
    return {"status": "updated"}

@app.put("/gpx_hikes/{item_id}")
def update_gpx(item_id: int, item: UpdateItem):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """UPDATE gpx_hikes 
                   SET name = %s, notes = %s, difficulty = %s, gaz = %s 
                   WHERE id = %s""",
                (item.name, item.notes, item.difficulty, item.gaz, item_id)
            )
    return {"status": "updated"}


########################################################
#      PHOTOS HANDLING
########################################################

@app.post("/photos")
async def upload_photo(
    item_id: int = Form(...),
    item_type: str = Form(...),
    caption: str = Form(None),
    file: UploadFile = File(...)
):
    if item_type not in ("gpx_hikes", "points", "areas"):
        raise HTTPException(status_code=400, detail="item_type invalide")
    content = await file.read()
    MAX_BYTES = 15 * 1024 * 1024
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 15MB limit")
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Unsupported format")
    filename = f"{item_type}_{item_id}_{int(__import__('time').time())}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(content)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO photos (item_id, item_type, filename, caption) VALUES (%s, %s, %s, %s)",
                (item_id, item_type, filename, caption)
            )
    return {"status": "ok", "filename": filename}


@app.get("/photos/{item_type}/{item_id}")
def get_photos(item_type: str, item_id: int):
    if item_type not in ("gpx_hikes", "points", "areas"):
        raise HTTPException(status_code=400, detail="item_type invalide")
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT id, filename, caption FROM photos WHERE item_id = %s AND item_type = %s ORDER BY id",
                (item_id, item_type)
            )
            return cur.fetchall()


@app.delete("/photos/{photo_id}")
def delete_photo(photo_id: int):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT filename FROM photos WHERE id = %s", (photo_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Photo introuvable")
            filepath = os.path.join(UPLOAD_DIR, row["filename"])
            if os.path.exists(filepath):
                os.remove(filepath)
            cur.execute("DELETE FROM photos WHERE id = %s", (photo_id,))
    return {"status": "deleted"}