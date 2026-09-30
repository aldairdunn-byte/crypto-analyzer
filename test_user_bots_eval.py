import os
import requests
from dotenv import load_dotenv

load_dotenv("c:/Users/user/.gemini/antigravity/scratch/crypto-analyzer/.env")
from supabase_client import get_supabase_client
from bot_engine import evaluate_active_grid_bot_tick
from telegram_bot import resolve_binance_symbol

sb = get_supabase_client()
bots = sb.get_active_bots()
user_bots = [b for b in bots if b.get('user_id') == '926f344e-6209-49d9-99ff-326e4514096f']

resp = requests.get('https://api.binance.com/api/v3/ticker/price')
prices = {x['symbol']: float(x['price']) for x in resp.json()}
symbols_set = set(prices.keys())

print(f"Found {len(user_bots)} bots for user 926f344e:")
for b in user_bots:
    sym = resolve_binance_symbol(b['coin_id'], b['name'], symbols_set)
    lp = prices.get(sym)
    print(f"\n--- Bot: {b['name']} ({sym}) | Live Price: {lp} ---")
    cfg = b.get('config') or {}
    print(f"    Config: low={cfg.get('price_low')}, high={cfg.get('price_high')}, num_grids={cfg.get('num_grids')}, initial={cfg.get('initial_price')}")
    res = evaluate_active_grid_bot_tick(bot=b, current_price=lp, client=sb)
    print(f"    Executed actions: {res.get('actions_executed')}")
