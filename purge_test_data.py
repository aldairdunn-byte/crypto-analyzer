"""
Script de Purga y Limpieza de Datos de Prueba en Supabase.
Limpia tablas bot_trades, bots y user_portfolios, y restablece user_profiles a $1,000.00 USDT.
"""
import os
import requests
from datetime import datetime, timezone
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

def get_table_count(table_name: str) -> int:
    h = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Prefer": "count=exact"
    }
    url = f"{SUPABASE_URL}/rest/v1/{table_name}?select=id&limit=1"
    try:
        resp = requests.get(url, headers=h, timeout=10)
        cr = resp.headers.get("content-range")
        if cr and "/" in cr:
            total_str = cr.split("/")[1]
            return int(total_str) if total_str != "*" else 0
        return 0
    except Exception as e:
        print(f"[WARN] Error obteniendo conteo de {table_name}: {e}")
        return -1

def purge_table(table_name: str, id_col: str = "id"):
    url = f"{SUPABASE_URL}/rest/v1/{table_name}?{id_col}=neq.00000000-0000-0000-0000-000000000000"
    try:
        resp = requests.delete(url, headers=headers, timeout=15)
        res_data = resp.json() if resp.status_code in (200, 204) else resp.text
        count = len(res_data) if isinstance(res_data, list) else 'N/A'
        print(f"[PURGE] Tabla '{table_name}': Status {resp.status_code}, registros eliminados: {count}")
    except Exception as e:
        print(f"[ERROR] purgando {table_name}: {e}")

def reset_profiles():
    url = f"{SUPABASE_URL}/rest/v1/user_profiles?id=neq.00000000-0000-0000-0000-000000000000"
    payload = {
        "demo_usdt_balance": 1000.00,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    try:
        resp = requests.patch(url, headers=headers, json=payload, timeout=10)
        res_data = resp.json() if resp.status_code in (200, 204) else resp.text
        count = len(res_data) if isinstance(res_data, list) else 'N/A'
        print(f"[RESET] Perfiles actualizados a $1,000.00: Status {resp.status_code}, total: {count}")
    except Exception as e:
        print(f"[ERROR] reseteando perfiles: {e}")

if __name__ == "__main__":
    print("=================================================================")
    print("[AUDITORIA PRE-PURGA]")
    print(f"  - Registros en 'bot_trades': {get_table_count('bot_trades')}")
    print(f"  - Registros en 'bots':       {get_table_count('bots')}")
    print(f"  - Registros en 'portfolios': {get_table_count('user_portfolios')}")
    print(f"  - Registros en 'profiles':   {get_table_count('user_profiles')}")
    print("=================================================================")

    print("[START] Ejecutando purga en orden de integridad referencial...")
    # 1. Borrar trades para liberar FK bot_id -> bots(id)
    purge_table("bot_trades")
    # 2. Borrar bots
    purge_table("bots")
    # 3. Borrar tenencias spot de prueba
    purge_table("user_portfolios")
    # 4. Restablecer balances de perfiles existentes
    reset_profiles()

    print("=================================================================")
    print("[AUDITORIA POST-PURGA]")
    print(f"  - Registros en 'bot_trades': {get_table_count('bot_trades')}")
    print(f"  - Registros en 'bots':       {get_table_count('bots')}")
    print(f"  - Registros en 'portfolios': {get_table_count('user_portfolios')}")
    print(f"  - Registros en 'profiles':   {get_table_count('user_profiles')}")
    print("=================================================================")
    print("[SUCCESS] Purga de base de datos finalizada.")
