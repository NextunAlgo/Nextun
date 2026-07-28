import os
import time
import threading
from datetime import datetime
from django.apps import AppConfig


class ApiConfig(AppConfig):
    name = 'api'

    def ready(self):
        # Avoid double-start from Django's auto-reloader (it forks a child process)
        # RUN_MAIN is set to 'true' in the child (reloader) process
        if os.environ.get('RUN_MAIN') != 'true':
            return

        # Start the bot manager in a background daemon thread
        t = threading.Thread(target=_bot_manager_loop, daemon=True)
        t.start()
        print("[BOT MANAGER] Started — watching database for active strategies...")


# ── Shared state for the bot manager ────────────────────────────
_running_bots = {}   # (user_id, strategy_id) -> (thread, stop_event)
_manager_lock = threading.Lock()

# Map Yahoo-style symbols to MT5 symbols
SYMBOL_MAP = {
    'EURUSD=X': 'EURUSD', 'GBPUSD=X': 'GBPUSD', 'USDJPY=X': 'USDJPY',
    'AUDUSD=X': 'AUDUSD', 'BTC-USD': 'BTCUSD', 'ETH-USD': 'ETHUSD',
    'GC=F': 'XAUUSD', 'SI=F': 'XAGUSD',
}
TF_MAP = {
    '1m': 'M1', '5m': 'M5', '15m': 'M15', '30m': 'M30', '45m': 'M30',
    '1h': 'H1', '2h': 'H1', '4h': 'H4', '1d': 'H4',
}


def _bot_log(user_id, strategy_id, msg):
    """Write a log to the BotLog DB table and print to terminal."""
    try:
        from api.models import BotLog
        BotLog.objects.create(user_id=user_id, strategy_id=strategy_id, message=msg)
        # Keep only the latest 50 logs per user/strategy
        keep_ids = (
            BotLog.objects.filter(user_id=user_id, strategy_id=strategy_id)
            .order_by('-created_at')
            .values_list('pk', flat=True)[:50]
        )
        BotLog.objects.filter(
            user_id=user_id, strategy_id=strategy_id
        ).exclude(pk__in=list(keep_ids)).delete()
    except Exception as e:
        print(f"[BOT LOG ERROR] {e}")
    print(f"[BOT] {msg}")


def _run_bot_loop(user_id, strategy_id, stop_event):
    """Background thread that scans for patterns every 30 seconds."""
    from api.models import CustomUser, Trade, UserActiveStrategy
    from api.dbtp_dbbtm import get_signal, mt5_lock, initialize, place_real_mt5_trade, close_mt5_position

    _bot_log(user_id, strategy_id, "Bot engine started!")

    while not stop_event.is_set():
        try:
            user = CustomUser.objects.get(id=user_id)
            try:
                active_strat = UserActiveStrategy.objects.get(user=user, strategy_id=strategy_id)
            except UserActiveStrategy.DoesNotExist:
                _bot_log(user_id, strategy_id, "No active strategy found in DB. Stopping.")
                break

            raw_symbol = active_strat.symbol
            raw_tf = active_strat.timeframe
            mt5_symbol = SYMBOL_MAP.get(raw_symbol, raw_symbol)
            mt5_tf = TF_MAP.get(raw_tf, raw_tf)

            now_str = datetime.now().strftime("%H:%M:%S")
            _bot_log(user_id, strategy_id,
                     f"[{now_str}] Scanning {mt5_symbol} ({mt5_tf}) — fetching 300 candles from MT5...")

            with mt5_lock:
                if not initialize(user):
                    _bot_log(user_id, strategy_id,
                             f"[{now_str}] Failed to connect to MT5. Will retry in 30s...")
                else:
                    if active_strat.strategy.name == 'Liquidity Trap & Inducement':
                        from api.liquidity_trap_mt5 import get_signal as liq_get_signal
                        signal = liq_get_signal(mt5_symbol, mt5_tf, user=user)
                    else:
                        signal = get_signal(mt5_symbol, mt5_tf, user=user)
                    action = signal.get("action", "NONE")

                    if action in ["BUY", "SELL"]:
                        _bot_log(user_id, strategy_id,
                                 f"[{now_str}] PATTERN FOUND! {action} on {mt5_symbol}")
                        volume = signal.get("volume", 0.01)
                        sl = signal.get("sl", 150)
                        tp = signal.get("tp", 300)
                        magic_number = 999111 if strategy_id == 1 else 999222
                        success, msg, entry_price = place_real_mt5_trade(
                            mt5_symbol, action, volume, sl, tp, user=user, magic=magic_number
                        )
                        if success:
                            Trade.objects.create(
                                user=user, symbol=mt5_symbol, type=action,
                                quantity=volume, entryPrice=entry_price,
                                currentPrice=entry_price, pnl=0.0, status='OPEN'
                            )
                            _bot_log(user_id, strategy_id,
                                     f"[{now_str}] Trade placed on MT5! {action} {mt5_symbol} "
                                     f"vol={volume} SL={sl} TP={tp}")
                            _bot_log(user_id, strategy_id,
                                     f"[{now_str}] MT5 Response: {msg}")
                        else:
                            _bot_log(user_id, strategy_id,
                                     f"[{now_str}] Trade failed: {msg}")

                    elif action in ["CLOSE_BUY", "CLOSE_SELL"]:
                        _bot_log(user_id, strategy_id,
                                 f"[{now_str}] Signal to {action} on {mt5_symbol} (opposing position)")
                        success, msg = close_mt5_position(mt5_symbol, user=user)
                        if success:
                            _bot_log(user_id, strategy_id,
                                     f"[{now_str}] Successfully closed position on MT5! {msg}")
                            open_trades = Trade.objects.filter(
                                user__exnessAccountId=user.exnessAccountId,
                                symbol=mt5_symbol, status='OPEN'
                            )
                            for t in open_trades:
                                t.status = 'CLOSED'
                                t.save()
                        else:
                            _bot_log(user_id, strategy_id,
                                     f"[{now_str}] Failed to close position: {msg}")
                    else:
                        _bot_log(user_id, strategy_id,
                                 f"[{now_str}] No pattern on {mt5_symbol} ({mt5_tf}). "
                                 f"Next scan in 30s...")

        except Exception as e:
            _bot_log(user_id, strategy_id, f"Error: {e}")

        # Sleep 30s in 1-second ticks so we can respond to stop_event quickly
        for _ in range(30):
            if stop_event.is_set():
                break
            time.sleep(1)

    _bot_log(user_id, strategy_id, "Bot engine stopped.")
    # Clean up from _running_bots when the thread exits
    with _manager_lock:
        _running_bots.pop((user_id, strategy_id), None)


def _bot_manager_loop():
    """
    Master loop that polls the DB every 5 seconds.
    - Spawns bot threads for newly activated strategies.
    - Stops bot threads for deactivated strategies.
    Runs entirely inside the Django process — no separate command needed.
    """
    from api.models import UserActiveStrategy

    while True:
        try:
            active_strats = list(UserActiveStrategy.objects.select_related('user', 'strategy').all())
            active_keys = set((s.user.id, s.strategy.id) for s in active_strats)

            with _manager_lock:
                # Start threads for new strategies
                for s in active_strats:
                    key = (s.user.id, s.strategy.id)
                    if key not in _running_bots:
                        print(f"[BOT MANAGER] Starting bot for user {s.user.id}, "
                              f"strategy '{s.strategy.name}'")
                        stop_event = threading.Event()
                        t = threading.Thread(
                            target=_run_bot_loop,
                            args=(s.user.id, s.strategy.id, stop_event),
                            daemon=True,
                        )
                        t.start()
                        _running_bots[key] = (t, stop_event)

                # Stop threads for removed strategies
                keys_to_remove = []
                for key, (t, stop_event) in _running_bots.items():
                    if key not in active_keys:
                        print(f"[BOT MANAGER] Stopping bot for user {key[0]}, strategy {key[1]}")
                        stop_event.set()
                        keys_to_remove.append(key)
                for key in keys_to_remove:
                    _running_bots.pop(key, None)

        except Exception as e:
            print(f"[BOT MANAGER ERROR] {e}")

        time.sleep(5)


def stop_bot_for_user(user_id, strategy_id):
    """Called from views.py when the user clicks Stop Strategy."""
    with _manager_lock:
        entry = _running_bots.pop((user_id, strategy_id), None)
        if entry:
            _, stop_event = entry
            stop_event.set()
