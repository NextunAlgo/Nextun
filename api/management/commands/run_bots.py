import time as _time
import threading
from datetime import datetime
from django.core.management.base import BaseCommand
from api.models import CustomUser, Trade, UserActiveStrategy, BotLog
from api.dbtp_dbbtm import get_signal, mt5_lock, initialize, place_real_mt5_trade, close_mt5_position

# Map Yahoo-style symbols to MT5 symbols (Exness without suffix)
SYMBOL_MAP = {
    'EURUSD=X': 'EURUSD', 'GBPUSD=X': 'GBPUSD', 'USDJPY=X': 'USDJPY',
    'AUDUSD=X': 'AUDUSD', 'BTC-USD': 'BTCUSD', 'ETH-USD': 'ETHUSD',
    'GC=F': 'XAUUSD', 'SI=F': 'XAGUSD',
}
# Map Yahoo-style timeframes to MT5 timeframe keys
TF_MAP = {
    '1m': 'M1', '5m': 'M5', '15m': 'M15', '30m': 'M30', '45m': 'M30',
    '1h': 'H1', '2h': 'H1', '4h': 'H4', '1d': 'H4',
}

def _bot_log(user_id, strategy_id, msg):
    """Add a log message to the BotLog model and print to terminal."""
    try:
        BotLog.objects.create(
            user_id=user_id,
            strategy_id=strategy_id,
            message=msg
        )
        
        # Limit to 50 logs per user/strategy to prevent DB bloat
        logs_to_keep = BotLog.objects.filter(user_id=user_id, strategy_id=strategy_id).order_by('-created_at')[:50]
        BotLog.objects.filter(user_id=user_id, strategy_id=strategy_id).exclude(pk__in=logs_to_keep.values('pk')).delete()
        
    except Exception as e:
        print(f"[BOT LOG ERROR] {e}")
    print(f"[BOT] {msg}")

def _run_bot_loop(user_id, strategy_id, stop_event):
    """Background thread that scans for patterns every 30 seconds."""
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
            _bot_log(user_id, strategy_id, f"[{now_str}] Scanning {mt5_symbol} ({mt5_tf}) — fetching 300 candles from MT5...")

            # Hold the MT5 lock for the ENTIRE scan+trade cycle.
            with mt5_lock:
                if not initialize(user):
                    _bot_log(user_id, strategy_id, f"[{now_str}] Failed to connect to MT5. Will retry in 30s...")
                else:
                    if active_strat.strategy.name == 'Liquidity Trap & Inducement':
                        from api.liquidity_trap_mt5 import get_signal as liq_get_signal
                        signal = liq_get_signal(mt5_symbol, mt5_tf, user=user)
                    else:
                        signal = get_signal(mt5_symbol, mt5_tf, user=user)
                    action = signal.get("action", "NONE")

                    if action in ["BUY", "SELL"]:
                        _bot_log(user_id, strategy_id, f"[{now_str}] PATTERN FOUND! {action} on {mt5_symbol}")
                        volume = signal.get("volume", 0.01)
                        sl = signal.get("sl", 150)
                        tp = signal.get("tp", 300)

                        magic_number = 999111 if strategy_id == 1 else 999222
                        success, msg, entry_price = place_real_mt5_trade(mt5_symbol, action, volume, sl, tp, user=user, magic=magic_number)

                        if success:
                            Trade.objects.create(
                                user=user, symbol=mt5_symbol, type=action,
                                quantity=volume, entryPrice=entry_price, currentPrice=entry_price,
                                pnl=0.0, status='OPEN'
                            )
                            _bot_log(user_id, strategy_id, f"[{now_str}] Trade placed on MT5! {action} {mt5_symbol} vol={volume} SL={sl} TP={tp}")
                            _bot_log(user_id, strategy_id, f"[{now_str}] MT5 Response: {msg}")
                        else:
                            _bot_log(user_id, strategy_id, f"[{now_str}] Trade failed: {msg}")

                    elif action in ["CLOSE_BUY", "CLOSE_SELL"]:
                        _bot_log(user_id, strategy_id, f"[{now_str}] Signal to {action} on {mt5_symbol} (opposing position)")
                        success, msg = close_mt5_position(mt5_symbol, user=user)
                        if success:
                            _bot_log(user_id, strategy_id, f"[{now_str}] Successfully closed position on MT5! {msg}")
                            open_trades = Trade.objects.filter(
                                user__exnessAccountId=user.exnessAccountId, 
                                symbol=mt5_symbol, 
                                status='OPEN'
                            )
                            for t in open_trades:
                                t.status = 'CLOSED'
                                t.save()
                        else:
                            _bot_log(user_id, strategy_id, f"[{now_str}] Failed to close position: {msg}")
                    else:
                        _bot_log(user_id, strategy_id, f"[{now_str}] No pattern on {mt5_symbol} ({mt5_tf}). Next scan in 30s...")

        except Exception as e:
            _bot_log(user_id, strategy_id, f"Error: {e}")

        for _ in range(30):
            if stop_event.is_set():
                break
            _time.sleep(1)

    _bot_log(user_id, strategy_id, "Bot engine stopped.")


class Command(BaseCommand):
    help = 'Runs the trading bot engine in the background for all active strategies.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting Bot Engine Daemon..."))
        
        # Track running threads: (user_id, strategy_id) -> (thread_obj, stop_event)
        running_bots = {}

        try:
            while True:
                # Get current active strategies from DB
                active_strats = UserActiveStrategy.objects.all()
                active_keys = set((s.user.id, s.strategy.id) for s in active_strats)
                
                # Check for new strategies that need to be started
                for s in active_strats:
                    key = (s.user.id, s.strategy.id)
                    if key not in running_bots:
                        self.stdout.write(f"Starting bot for user {s.user.id}, strategy {s.strategy.name}")
                        stop_event = threading.Event()
                        t = threading.Thread(
                            target=_run_bot_loop,
                            args=(s.user.id, s.strategy.id, stop_event),
                            daemon=True
                        )
                        t.start()
                        running_bots[key] = (t, stop_event)

                # Check for strategies that were stopped (removed from DB)
                keys_to_remove = []
                for key, (t, stop_event) in running_bots.items():
                    if key not in active_keys:
                        self.stdout.write(f"Stopping bot for user {key[0]}, strategy {key[1]}")
                        stop_event.set()
                        keys_to_remove.append(key)
                
                for key in keys_to_remove:
                    del running_bots[key]

                # Prevent 100% CPU usage
                _time.sleep(5)
                
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("\nShutting down gracefully..."))
            for key, (t, stop_event) in running_bots.items():
                stop_event.set()
            for key, (t, stop_event) in running_bots.items():
                t.join(timeout=2.0)
            self.stdout.write(self.style.SUCCESS("All bots stopped."))
