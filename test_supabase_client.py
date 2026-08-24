"""
Suite de Pruebas Unitarias para SupabaseClient.
100% Mockeado (Aislamiento de red para CI/CD determinista).
"""

import pytest
import unittest.mock as mock
from datetime import datetime, timezone
from supabase_client import SupabaseClient, get_supabase_client

@pytest.fixture
def client():
    """Instancia de cliente con credenciales de prueba."""
    return SupabaseClient(
        url="https://fake-project-id.supabase.co",
        key="fake-anon-key-for-testing",
        max_retries=2,
        retry_delay=0.01
    )

def test_client_initialization(client):
    """Verifica que el cliente se inicialice correctamente con credenciales."""
    assert client.is_configured is True
    assert client.url == "https://fake-project-id.supabase.co"
    assert client.key == "fake-anon-key-for-testing"

def test_create_bot(client):
    """Verifica la creación de un nuevo bot."""
    mock_bot = {
        "id": "11111111-1111-1111-1111-111111111111",
        "name": "Test Solana Bot",
        "coin_id": "solana",
        "strategy": "MOMENTUM_TREND",
        "status": "ACTIVE",
        "capital_allocated_usd": 15.0
    }
    with mock.patch("requests.post") as mock_post:
        mock_post.return_value.status_code = 201
        mock_post.return_value.json.return_value = [mock_bot]
        
        bot = client.create_bot("Test Solana Bot", "solana", capital_allocated_usd=15.0)
        assert bot["name"] == "Test Solana Bot"
        assert bot["coin_id"] == "solana"
        assert mock_post.called

def test_update_bot_status(client):
    """Verifica la actualización de estado de un bot."""
    with mock.patch("requests.patch") as mock_patch:
        mock_patch.return_value.status_code = 200
        mock_patch.return_value.json.return_value = [{"id": "bot-123", "status": "PAUSED"}]
        
        updated = client.update_bot_status("bot-123", "PAUSED")
        assert updated["status"] == "PAUSED"

    # Verificar rechazo de estado inválido
    with pytest.raises(ValueError):
        client.update_bot_status("bot-123", "INVALID_STATUS")

def test_get_active_bots(client):
    """Verifica la obtención de bots activos."""
    mock_bots = [
        {"id": "bot-1", "name": "Bot 1", "status": "ACTIVE"},
        {"id": "bot-2", "name": "Bot 2", "status": "ACTIVE"}
    ]
    with mock.patch("requests.get") as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = mock_bots
        
        active = client.get_active_bots()
        assert len(active) == 2
        assert active[0]["name"] == "Bot 1"

def test_record_and_close_trade_buy(client):
    """Verifica el registro y cierre de una operación BUY con cálculo de PnL."""
    trade_id = "trade-001"
    open_trade = {
        "id": trade_id,
        "bot_id": "bot-1",
        "coin_id": "solana",
        "side": "BUY",
        "entry_price": 100.0,
        "units": 0.1,
        "amount_usd": 10.0,
        "status": "OPEN"
    }

    # 1. Registro de trade
    with mock.patch("requests.post") as mock_post:
        mock_post.return_value.status_code = 201
        mock_post.return_value.json.return_value = [open_trade]
        
        trade = client.record_trade("bot-1", "solana", "BUY", 100.0, 0.1, 10.0)
        assert trade["status"] == "OPEN"

    # 2. Cierre de trade con Take Profit a $110.0 (+10% PnL = +$1.0 USD)
    with mock.patch("requests.get") as mock_get, mock.patch("requests.patch") as mock_patch:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = [open_trade]
        
        mock_patch.return_value.status_code = 200
        mock_patch.return_value.json.return_value = [{
            "id": trade_id,
            "status": "CLOSED",
            "exit_price": 110.0,
            "pnl_usd": 1.0,
            "pnl_pct": 10.0
        }]
        
        closed = client.close_trade(trade_id, exit_price=110.0, exit_reason="TAKE_PROFIT_1")
        assert closed["status"] == "CLOSED"
        assert closed["pnl_usd"] == 1.0
        assert closed["pnl_pct"] == 10.0

def test_save_signal_insert_and_deduplicate(client):
    """Verifica guardado y deduplicación de señales."""
    signal_data = {
        "status": "BUY",
        "badge": "COMPRA LISTA AHORA",
        "risk_level": "Bajo",
        "can_buy_now": True,
        "simple_title": "Subida Sana",
        "plain_explanation": "Fuerza compradora detectada"
    }

    # 1. Caso Inserción nueva (no existe señal reciente)
    with mock.patch("requests.get") as mock_get, mock.patch("requests.post") as mock_post:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = []  # Sin duplicados
        
        mock_post.return_value.status_code = 201
        mock_post.return_value.json.return_value = [{"id": "sig-001", "coin_id": "solana", "status": "BUY"}]
        
        res = client.save_signal("solana", signal_data, price=140.0, rsi=55.0, ema20=135.0, atr_pct=5.0)
        assert res["status"] == "BUY"
        assert mock_post.called

    # 2. Caso Actualización (existe señal previa dentro de 5 min)
    with mock.patch("requests.get") as mock_get, mock.patch("requests.patch") as mock_patch:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = [{"id": "sig-001"}]  # Existe
        
        mock_patch.return_value.status_code = 200
        mock_patch.return_value.json.return_value = [{"id": "sig-001", "status": "BUY", "price": 142.0}]
        
        res = client.save_signal("solana", signal_data, price=142.0, deduplicate_minutes=5)
        assert res["status"] == "BUY"
        assert mock_patch.called

def test_portfolio_crud(client):
    """Verifica actualización y consulta de portafolio."""
    holdings = [
        {"asset": "USDT", "name": "Tether USD", "symbol": "USDT", "amount": 7.35, "price": 1.0, "total_usd": 7.35},
        {"asset": "SOL", "name": "Solana", "symbol": "SOL", "amount": 0.5, "price": 140.0, "total_usd": 70.0}
    ]

    with mock.patch("requests.post") as mock_post, mock.patch("requests.get") as mock_get:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = holdings
        
        res_update = client.update_portfolio(holdings)
        assert len(res_update) == 2
        
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = holdings
        
        res_get = client.get_portfolio()
        assert len(res_get) == 2
        assert res_get[0]["asset"] == "USDT"

def test_user_config(client):
    """Verifica lectura y escritura de configuración de usuario."""
    cfg = {"pen_rate": 3.36, "capital_usd": 7.35, "currency_mode": "USD / PEN"}

    with mock.patch("requests.get") as mock_get, mock.patch("requests.post") as mock_post:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = [{"key": "main_config", **cfg}]
        
        saved = client.get_user_config("main_config")
        assert saved["pen_rate"] == 3.36
        
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = [{"key": "main_config", **cfg}]
        
        written = client.save_user_config("main_config", cfg)
        assert written["capital_usd"] == 7.35

def test_bot_logging(client):
    """Verifica registro de eventos y logs de bot."""
    with mock.patch("requests.post") as mock_post:
        mock_post.return_value.status_code = 201
        mock_post.return_value.json.return_value = [{
            "id": "log-1",
            "event_type": "INFO",
            "message": "Sistema iniciado"
        }]
        
        log = client.log_bot_event("INFO", "Sistema iniciado", coin_id="solana")
        assert log["event_type"] == "INFO"
        assert log["message"] == "Sistema iniciado"

def test_market_data_caching(client):
    """Verifica almacenamiento y recuperación de caché de mercado."""
    market_snapshot = {
        "solana": {"usd": 140.0, "usd_24h_change": 4.5, "usd_24h_vol": 2e9, "usd_market_cap": 6e10},
        "bitcoin": {"usd": 65000.0, "usd_24h_change": 1.2, "usd_24h_vol": 2e10, "usd_market_cap": 1.2e12}
    }

    with mock.patch("requests.post") as mock_post, mock.patch("requests.get") as mock_get:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = [{"coin_id": "solana"}, {"coin_id": "bitcoin"}]
        
        cached = client.cache_market_data(market_snapshot)
        assert len(cached) == 2
        
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = [
            {"coin_id": "solana", "usd": 140.0, "usd_24h_change": 4.5, "usd_7d_change": 10.0, "usd_24h_vol": 2e9, "usd_market_cap": 6e10, "high_24h": 145.0, "low_24h": 135.0, "is_synthetic": False, "source": "coingecko"},
            {"coin_id": "bitcoin", "usd": 65000.0, "usd_24h_change": 1.2, "usd_7d_change": 3.0, "usd_24h_vol": 2e10, "usd_market_cap": 1.2e12, "high_24h": 66000.0, "low_24h": 64000.0, "is_synthetic": False, "source": "coingecko"}
        ]
        
        retrieved = client.get_cached_market_data()
        assert retrieved is not None
        assert "solana" in retrieved
        assert retrieved["solana"]["usd"] == 140.0

def test_retry_on_network_failure(client):
    """Verifica que el cliente reintente automáticamente ante fallos transitorios."""
    call_count = 0

    def fail_once(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise requests.exceptions.ConnectionError("Fallo temporal de conexión")
        resp = mock.MagicMock()
        resp.status_code = 200
        resp.json.return_value = [{"id": "bot-1", "name": "Bot 1", "status": "ACTIVE"}]
        return resp

    with mock.patch("requests.get", side_effect=fail_once):
        bots = client.get_active_bots()
        assert call_count == 2
        assert len(bots) == 1
