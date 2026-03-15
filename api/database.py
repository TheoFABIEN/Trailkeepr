import psycopg2

def get_conn():
    return psycopg2.connect(
        host="postgis",
        database="hiking",
        user="postgres",
        password="postgres"
    )
