"""
Script de Purga y Limpieza de Datos de Prueba en Supabase.
Limpia tablas bot_trades, bots y signals huerfanas de pruebas anteriores.
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def purge_table(table_name: str, id_col: str = "id"):
    url = f"{SUPABASE_URL}/rest/v1/{table_name}?{id_col}=neq.00000000-0000-0000-0000-000000000000"
    try:
        resp = requests.delete(url, headers=headers, timeout=10)
        res_data = resp.json() if resp.status_code == 200 else resp.text
        count = len(res_data) if isinstance(res_data, list) else 'N/A'
        print(f"[PURGE] Tabla '{table_name}': Status {resp.status_code}, registros eliminados: {count}")
    except Exception as e:
        print(f"[ERROR] purgando {table_name}: {e}")

if __name__ == "__main__":
    print("[START] Iniciando purga profunda de datos de prueba en Supabase...")
    purge_table("bot_trades")
    purge_table("bots")
    purge_table("signals")
    print("[SUCCESS] Purga completada con exito.")
