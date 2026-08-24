"""
Script de Prueba de Conexión en Vivo con Supabase PostgreSQL.
Verifica la lectura de credenciales desde .env y realiza un SELECT sobre market_data_cache.
"""

import os
import sys
import json
from pathlib import Path

# Configurar salida UTF-8 para soporte de emojis en Windows
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Cargar variables de entorno desde .env
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / ".env"
    load_dotenv(dotenv_path=env_path)
except ImportError:
    pass

from supabase_client import SupabaseClient

def run_live_connection_test():
    print("================================================================")
    print("PROBANDO CONEXIÓN EN VIVO A SUPABASE (POSTGRESQL)")
    print("================================================================")
    
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_KEY", "")

    print(f"URL detectada: {url}")
    print(f"Key detectada: {key[:15]}...{key[-10:] if len(key) > 25 else ''}")
    print("----------------------------------------------------------------")

    if not url or not key:
        print("❌ Error: SUPABASE_URL o SUPABASE_KEY no están definidos en .env")
        sys.exit(1)

    try:
        client = SupabaseClient(url=url, key=key)
        
        print("-> Ejecutando consulta: SELECT * FROM market_data_cache LIMIT 5...")
        rows = client.table_select("market_data_cache", limit=5)
        
        print(f"-> Filas obtenidas: {len(rows)}")
        print("----------------------------------------------------------------")
        for i, row in enumerate(rows, 1):
            coin = row.get("coin_id", "desconocido")
            price = row.get("usd", 0.0)
            c24 = row.get("usd_24h_change", 0.0)
            vol = row.get("usd_24h_vol", 0.0)
            mcap = row.get("usd_market_cap", 0.0)
            source = row.get("source", "coingecko")
            print(f"[{i}] {coin.upper():12} | Precio: ${price:,.4f} | 24h: {c24:+.2f}% | Vol: ${vol:,.0f} | Mcap: ${mcap:,.0f} | Fuente: {source}")

        print("----------------------------------------------------------------")
        print("✅ Conexion exitosa")
        print("================================================================")
        return True

    except Exception as e:
        print("----------------------------------------------------------------")
        print(f"❌ Error al conectar con Supabase: {type(e).__name__} - {e}")
        import traceback
        traceback.print_exc()
        print("================================================================")
        return False

if __name__ == "__main__":
    success = run_live_connection_test()
    if not success:
        sys.exit(1)
