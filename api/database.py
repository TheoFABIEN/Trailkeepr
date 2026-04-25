import os
import psycopg2

def get_conn():
    return psycopg2.connect(
        host="postgis",
        database=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD")
    )