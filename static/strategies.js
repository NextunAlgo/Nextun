// ─── Strategies Page JS ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Datetime
  function updateDateTime() {
    const el = document.getElementById('current-datetime');
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
      }).replace(',', '');
    }
  }
  updateDateTime();
  setInterval(updateDateTime, 60000);

  // Theme Toggle
  const themeBtns = document.querySelectorAll('.theme-btn');
  if (themeBtns.length >= 2) {
    const [lightBtn, darkBtn] = themeBtns;
    if (sessionStorage.getItem('theme') === 'dark') {
      document.body.classList.add('dark-theme');
      darkBtn.classList.add('active'); lightBtn.classList.remove('active');
    }
    lightBtn.addEventListener('click', () => {
      document.body.classList.remove('dark-theme');
      lightBtn.classList.add('active'); darkBtn.classList.remove('active');
      sessionStorage.setItem('theme', 'light');
    });
    darkBtn.addEventListener('click', () => {
      document.body.classList.add('dark-theme');
      darkBtn.classList.add('active'); lightBtn.classList.remove('active');
      sessionStorage.setItem('theme', 'dark');
    });
  }

  // Logout — only clear the auth token; strategy state lives in the DB
  document.getElementById('logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.removeItem('nextunToken');
    window.location.href = '/';
  });

  // ── Sync activation state with backend on page load ──────────────────────
  // Supports MULTIPLE strategies running concurrently.
  (async function syncState() {
    try {
      const token = sessionStorage.getItem('nextunToken');
      if (!token) return;

      const res = await fetch('/api/bot/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) return;

      // The backend returns { active_strategies: [...] } when no strategyId is given
      const activeList = data.active_strategies || [];
      const isLTRunning = activeList.some(s => s.strategy_name && s.strategy_name.includes('Liquidity'));
      const isDTRunning = activeList.some(s => s.strategy_name && s.strategy_name.includes('Double'));

      // Handle legacy single-strategy response
      if (!activeList.length && data.running) {
        const isLT = data.strategy_name && data.strategy_name.includes('Liquidity');
        const isDT = data.strategy_name && data.strategy_name.includes('Double');
        if (isDT) syncDTActive(token);
        else if (isLT) syncLTActive(token);
        return;
      }

      // Double Top / Double Bottom
      if (isDTRunning) {
        syncDTActive(token);
      } else {
        sessionStorage.removeItem('dt_strategy_active');
        setDTActiveState(false);
        const execBtn = document.getElementById('dt-execute-btn');
        const panel = document.getElementById('bot-panel');
        if (execBtn) { execBtn.textContent = 'Run Live Strategy'; execBtn.classList.remove('active-state'); }
        if (panel)   { panel.style.display = 'none'; }
      }

      // Liquidity Trap
      if (isLTRunning) {
        syncLTActive(token);
      } else {
        sessionStorage.removeItem('lt_strategy_active');
        ltSetActiveState(false);
        const ltPanel  = document.getElementById('lt-bot-panel');
        const ltLabel  = document.getElementById('lt-bot-label-text');
        const ltToggle = document.getElementById('lt-bot-toggle');
        const ltExecBtn = document.getElementById('lt-execute-btn');
        if (ltExecBtn) { ltExecBtn.textContent = 'Run Live Strategy'; ltExecBtn.classList.remove('active-state'); }
        if (ltPanel)   { ltPanel.style.display = 'none'; }
        if (ltLabel)   { ltLabel.textContent = 'Bot: OFF'; ltLabel.style.color = ''; }
        if (ltToggle)  { ltToggle.checked = false; }
      }

    } catch (e) { console.error('[syncState] Error:', e); }
  })();

  // ── Helper: apply active state to DT strategy from backend ──────────────
  function syncDTActive(token) {
    sessionStorage.setItem('dt_strategy_active', 'true');
    setDTActiveState(true);
    const execBtn = document.getElementById('dt-execute-btn');
    const panel   = document.getElementById('bot-panel');
    const label   = document.getElementById('bot-label-text');
    const toggle  = document.getElementById('bot-toggle');
    if (execBtn) { execBtn.textContent = 'Stop Live Strategy'; execBtn.classList.add('active-state'); }
    if (panel)   { panel.style.display = 'block'; }
    if (label)   { label.textContent = 'Bot: ACTIVE 🟢'; label.style.color = '#16a34a'; }
    if (toggle)  { toggle.checked = true; }
    const log = document.getElementById('bot-log');
    if (log) startBotStatusPolling(token, log);
  }

  // ── Helper: apply active state to LT strategy from backend ──────────────
  function syncLTActive(token) {
    sessionStorage.setItem('lt_strategy_active', 'true');
    ltSetActiveState(true);
    const ltLog    = document.getElementById('lt-bot-log');
    const ltPanel  = document.getElementById('lt-bot-panel');
    const ltLabel  = document.getElementById('lt-bot-label-text');
    const ltToggle = document.getElementById('lt-bot-toggle');
    if (ltPanel)   { ltPanel.style.display = 'block'; }
    if (ltLabel)   { ltLabel.textContent = 'Bot: ACTIVE 🟢'; ltLabel.style.color = '#16a34a'; }
    if (ltToggle)  { ltToggle.checked = true; }
    if (ltLog)     { startLtBotStatusPolling(token); }
  }

  // Mobile Drawer
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.querySelector(".sidebar");
  const mainContent = document.querySelector(".main-content");

  // Open sidebar
  menuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebar.classList.add("show");
  });

  // Close when clicking outside sidebar
  document.addEventListener("click", (e) => {

      if (
          sidebar.classList.contains("show") &&
          !sidebar.contains(e.target) &&
          !menuToggle.contains(e.target)
      ) {
          sidebar.classList.remove("show");
      }

  });

  // Prevent closing when clicking inside sidebar
  sidebar.addEventListener("click", (e) => {
      e.stopPropagation();
  });

  // Desktop resize
  window.addEventListener("resize", () => {

      if(window.innerWidth > 768){
          sidebar.classList.remove("show");
      }

  });

});

// ─── DT Badge / State ──────────────────────────────────────────
function setDTActiveState(isActive) {
  const badge = document.getElementById('dt-status-badge');
  const btn   = document.getElementById('dt-activate-btn');
  if (badge) {
    badge.textContent  = isActive ? '✓ Active' : 'Available';
    badge.className    = 'strategy-badge ' + (isActive ? 'badge-active' : 'badge-available');
  }
  if (btn) {
    btn.textContent = isActive ? '⏹ Deactivate Strategy' : '⚡ Activate Strategy';
    btn.className   = 'btn-activate ' + (isActive ? 'active-state' : '');
  }
  const botToggle = document.getElementById('bot-toggle');
  if (botToggle && botToggle.checked !== isActive) botToggle.checked = isActive;
}

// Legacy alias so old callers still work
function setActiveState(isActive) { setDTActiveState(isActive); }


// ─── Execute Live Strategy (DT) ────────────────────────────────
let botStatusInterval = null;

async function executeLiveStrategy() {
  const token = sessionStorage.getItem('nextunToken');
  if (!token) { alert("Please log in first to run the live strategy."); return; }

  const symbol    = document.getElementById('bt-symbol').value;
  const timeframe = document.getElementById('bt-timeframe').value;
  const execBtn   = document.getElementById('dt-execute-btn');
  const panel     = document.getElementById('bot-panel');
  const log       = document.getElementById('bot-log');
  const label     = document.getElementById('bot-label-text');
  const toggle    = document.getElementById('bot-toggle');

  const originalText = execBtn.textContent;
  execBtn.disabled   = true;
  execBtn.textContent = 'Wait...';

  try {
    const stratRes = await fetch('/api/strategies', { headers: { 'Authorization': `Bearer ${token}` } });
    const stratData = await stratRes.json();
    let strategyId = 1;
    if (stratData.success && stratData.data?.strategies) {
      const strat = stratData.data.strategies.find(s => s.name.includes("Double Top"));
      if (strat) strategyId = strat.id;
    }

    const res  = await fetch('/api/strategies/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ strategyId, symbol, timeframe })
    });
    const data = await res.json();

    if (data.success) {
      if (data.message === 'Strategy activated') {
        // ── ACTIVATE ──
        // NOTE: We do NOT stop the Liquidity Trap here — both can run concurrently.
        execBtn.textContent = 'Stop Live Strategy';
        execBtn.classList.add('active-state');
        panel.style.display = 'block';
        log.innerHTML = '';
        if (label)  { label.textContent = 'Bot: ACTIVE 🟢'; label.style.color = '#16a34a'; }
        if (toggle) { toggle.checked = true; }
        addLog('[SYSTEM] Double Bottom Bot activated! Live logs will appear below...');

        setDTActiveState(true);
        sessionStorage.setItem('dt_strategy_active', 'true');
        sessionStorage.setItem('dt_strategy_name', 'Double Top / Double Bottom');
        sessionStorage.setItem('dt_strategy_symbol', symbol);
        sessionStorage.setItem('dt_strategy_timeframe', timeframe);
        sessionStorage.setItem('dt_strategy_rr', '1:2');

        startBotStatusPolling(token, log);

      } else {
        // ── STOP ──
        execBtn.textContent = 'Run Live Strategy';
        execBtn.classList.remove('active-state');
        if (label)  { label.textContent = 'Bot: OFF'; label.style.color = ''; }
        if (toggle) { toggle.checked = false; }
        addLog('[SYSTEM] Bot stopped.');
        setDTActiveState(false);

        if (botStatusInterval) { clearInterval(botStatusInterval); botStatusInterval = null; }
        setTimeout(() => { panel.style.display = 'none'; }, 2000);

        sessionStorage.setItem('dt_strategy_active', 'false');
        sessionStorage.removeItem('dt_strategy_name');
        sessionStorage.removeItem('dt_strategy_symbol');
        sessionStorage.removeItem('dt_strategy_timeframe');
      }
    } else {
      alert("Error: " + (data.message || 'Unknown error'));
      execBtn.textContent = originalText;
    }
  } catch (err) {
    console.error('Toggle failed:', err);
    alert('Network error while toggling strategy.');
    execBtn.textContent = originalText;
  } finally {
    execBtn.disabled = false;
  }
}

// ─── DT Bot Status Polling ─────────────────────────────────────
function startBotStatusPolling(token, logEl) {
  if (botStatusInterval) clearInterval(botStatusInterval);
  let lastLogCount = 0;

  botStatusInterval = setInterval(async () => {
    try {
      const res  = await fetch('/api/bot/status?strategyId=1', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();

      if (data.success && data.logs && data.logs.length > lastLogCount) {
        const newLogs = data.logs.slice(lastLogCount);
        newLogs.forEach(msg => addLog(msg));
        lastLogCount = data.logs.length;
      }

      // Stop UI only if the backend says this strategy is no longer active
      if (data.success && data.activated === false) {
        const btn = document.getElementById('dt-execute-btn');
        if (btn && (btn.textContent.includes('Stop') || btn.classList.contains('active-state'))) {
          btn.textContent = 'Run Live Strategy';
          btn.classList.remove('active-state');
          const label  = document.getElementById('bot-label-text');
          const toggle = document.getElementById('bot-toggle');
          if (label)  { label.textContent = 'Bot: OFF'; label.style.color = ''; }
          if (toggle) { toggle.checked = false; }
          setDTActiveState(false);
          sessionStorage.setItem('dt_strategy_active', 'false');
          clearInterval(botStatusInterval);
          botStatusInterval = null;
          const panel = document.getElementById('bot-panel');
          if (panel) setTimeout(() => { panel.style.display = 'none'; }, 2000);
        }
      }
    } catch (e) { /* silently ignore polling errors */ }
  }, 2000);
}

// ─── DT Bot Toggle (checkbox) ──────────────────────────────────
let botInterval = null;

async function toggleBot(checkbox) {
  const panel  = document.getElementById('bot-panel');
  const label  = document.getElementById('bot-label-text');
  const log    = document.getElementById('bot-log');
  const token  = sessionStorage.getItem('nextunToken');

  if (!token) { alert("Please log in first to run the live strategy."); checkbox.checked = false; return; }

  const symbol    = document.getElementById('bt-symbol').value;
  const timeframe = document.getElementById('bt-timeframe').value;
  checkbox.disabled = true;

  try {
    const stratRes  = await fetch('/api/strategies', { headers: { 'Authorization': `Bearer ${token}` } });
    const stratData = await stratRes.json();
    let strategyId  = 1;
    if (stratData.success && stratData.data?.strategies) {
      const strat = stratData.data.strategies.find(s => s.name.includes("Double Top"));
      if (strat) strategyId = strat.id;
    }

    const res  = await fetch('/api/strategies/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ strategyId, symbol, timeframe })
    });
    const data = await res.json();

    if (data.success) {
      if (data.message === 'Strategy activated') {
        panel.style.display = 'block';
        label.textContent   = 'Bot: ACTIVE 🟢';
        label.style.color   = '#16a34a';
        log.innerHTML       = '';
        addLog('[SYSTEM] Real Backend Bot activated! Live logs will appear below...');

        setDTActiveState(true);
        sessionStorage.setItem('dt_strategy_active', 'true');
        sessionStorage.setItem('dt_strategy_name', 'Double Top / Double Bottom');
        sessionStorage.setItem('dt_strategy_symbol', symbol);
        sessionStorage.setItem('dt_strategy_timeframe', timeframe);
        sessionStorage.setItem('dt_strategy_rr', '1:2');

        const execBtn = document.getElementById('dt-execute-btn');
        if (execBtn) { execBtn.textContent = 'Stop Live Strategy'; execBtn.classList.add('active-state'); }

        startBotStatusPolling(token, log);
      } else {
        label.textContent = 'Bot: OFF';
        label.style.color = '';
        addLog('[SYSTEM] Bot stopped.');
        setDTActiveState(false);

        const execBtn = document.getElementById('dt-execute-btn');
        if (execBtn) { execBtn.textContent = 'Run Live Strategy'; execBtn.classList.remove('active-state'); }

        if (botStatusInterval) { clearInterval(botStatusInterval); botStatusInterval = null; }
        setTimeout(() => { panel.style.display = 'none'; }, 2000);

        sessionStorage.setItem('dt_strategy_active', 'false');
        sessionStorage.removeItem('dt_strategy_name');
        sessionStorage.removeItem('dt_strategy_symbol');
        sessionStorage.removeItem('dt_strategy_timeframe');
      }
    } else {
      alert("Error: " + (data.message || 'Unknown error'));
      checkbox.checked = !checkbox.checked;
    }
  } catch (err) {
    console.error('Toggle failed:', err);
    alert('Network error while toggling strategy.');
    checkbox.checked = !checkbox.checked;
  } finally {
    checkbox.disabled = false;
  }
}

// ─── DT Log Helper ─────────────────────────────────────────────
function addLog(msg) {
  const log = document.getElementById('bot-log');
  if (!log) return;
  const line = document.createElement('div');
  line.textContent = msg;
  if (msg.includes('LONG'))   line.style.color = '#4ade80';
  else if (msg.includes('SHORT'))  line.style.color = '#f87171';
  else if (msg.includes('SYSTEM')) line.style.color = '#60a5fa';
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

// ─── DT Backtest ───────────────────────────────────────────────
async function runBacktest() {
  const isStratActive = sessionStorage.getItem('dt_strategy_active') === 'true';
  if (!isStratActive) {
    alert("Please click 'Run Live Strategy' first to enable the engine and generate trades.");
    return;
  }

  const symbol        = document.getElementById('bt-symbol').value;
  const timeframe     = document.getElementById('bt-timeframe').value;
  const useMarketHours = document.getElementById('dt-market-hours')?.checked || false;

  const loading      = document.getElementById('bt-loading');
  const statsEl      = document.getElementById('bt-stats');
  const tradeSection = document.getElementById('bt-trade-section');
  const runBtn       = document.getElementById('dt-run-btn');

  loading.style.display = 'block';
  statsEl.style.display = 'none';
  tradeSection.style.display = 'none';
  runBtn.disabled = true;
  runBtn.style.opacity = '0.6';

  try {
    const res = await fetch('/api/strategy/backtest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, timeframe, strategy_name: 'Double Top / Double Bottom', use_market_hours: useMarketHours })
    });

    const data = await res.json();
    if (!data.success) { alert('Backtest error: ' + (data.message || data.detail || 'Unknown error')); return; }

    const d = data.data;
    document.getElementById('rc-total').textContent   = d.total_trades;
    document.getElementById('rc-winrate').textContent = d.win_rate + '%';
    document.getElementById('rc-wl').textContent      = d.wins + ' / ' + d.losses;
    document.getElementById('dt-win-rate').textContent = d.win_rate + '%';

    const pnlEl = document.getElementById('rc-pnl');
    pnlEl.textContent  = (d.total_pnl >= 0 ? '+' : '') + d.total_pnl.toFixed(4);
    pnlEl.style.color  = d.total_pnl >= 0 ? '#16a34a' : '#dc2626';
    statsEl.style.display = 'grid';

    const tradesWithSymbol = (d.trades || []).map(t => ({ ...t, symbol: d.symbol }));
    sessionStorage.setItem('bt_trades', JSON.stringify(tradesWithSymbol));
    sessionStorage.setItem('bt_summary', JSON.stringify({
      symbol: d.symbol, timeframe: d.timeframe, total_trades: d.total_trades,
      wins: d.wins, partials: d.partials || 0, losses: d.losses,
      total_pnl: d.total_pnl, strategy_name: 'Double Top / Double Bottom'
    }));
    sessionStorage.setItem('dt_strategy_winrate', d.win_rate + '%');
    sessionStorage.setItem('dt_strategy_symbol', d.symbol);
    sessionStorage.setItem('dt_strategy_timeframe', d.timeframe);

    if (tradeSection) {
      tradeSection.style.display = 'block';
      tradeSection.innerHTML = `
        <div style="text-align:center; padding:20px; background:var(--bg-color); border-radius:12px; border:1px solid var(--border-color);">
          <div style="font-size:28px; margin-bottom:8px;">✅</div>
          <div style="font-size:15px; font-weight:700; color:var(--text-dark); margin-bottom:6px;">
            ${d.total_trades} trades saved for ${d.symbol}
          </div>
          <div style="font-size:13px; color:var(--text-gray); margin-bottom:14px;">
            ${d.wins} Full Wins · ${d.partials || 0} Partial Wins · ${d.losses} Losses · Win Rate: ${d.win_rate}% · Net P&L: ${d.total_pnl >= 0 ? '+' : ''}${d.total_pnl.toFixed(4)}
          </div>
          <a href="/trades" style="display:inline-block; padding:10px 24px;
            background:linear-gradient(135deg,#3b82f6,#6366f1); color:white;
            border-radius:8px; font-size:13px; font-weight:600; text-decoration:none;">
            📋 View All Trades in Trades Page →
          </a>
        </div>
      `;
    }

  } catch (err) {
    console.error('Backtest failed:', err);
    alert('Network error. Make sure the Django server is running on port 8000.');
  } finally {
    loading.style.display = 'none';
    runBtn.disabled = false;
    runBtn.style.opacity = '1';
  }
}


// ═══════════════════════════════════════════════════════════════
// ─── Liquidity Trap Strategy ───────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// Restore LT state on page load
(function () {
  if (sessionStorage.getItem('lt_strategy_active') === 'true') {
    ltSetActiveState(true);
  }
})();

function ltSetActiveState(isActive) {
  const badge = document.getElementById('lt-status-badge');
  const btn   = document.getElementById('lt-execute-btn');
  if (badge) {
    badge.textContent = isActive ? '✓ Active' : 'Available';
    badge.className   = 'strategy-badge ' + (isActive ? 'badge-active' : 'badge-available');
  }
  if (btn) {
    btn.textContent = isActive ? 'Stop Live Strategy' : 'Run Live Strategy';
    btn.className   = 'btn-activate ' + (isActive ? 'active-state' : '');
  }
}

// ─── LT Log Helper ─────────────────────────────────────────────
function ltAddLog(msg) {
  const log = document.getElementById('lt-bot-log');
  if (!log) return;
  const line = document.createElement('div');
  line.textContent = msg;
  if (msg.includes('LONG') || msg.includes('BUY'))  line.style.color = '#4ade80';
  else if (msg.includes('SHORT') || msg.includes('SELL')) line.style.color = '#f87171';
  else if (msg.includes('SYSTEM')) line.style.color = '#60a5fa';
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

// ─── LT Bot Status Polling ─────────────────────────────────────
let ltBotStatusInterval = null;

function startLtBotStatusPolling(token) {
  if (ltBotStatusInterval) clearInterval(ltBotStatusInterval);
  let lastLogCount = 0;

  ltBotStatusInterval = setInterval(async () => {
    try {
      const res  = await fetch('/api/bot/status?strategyId=2', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();

      if (data.success && data.logs && data.logs.length > lastLogCount) {
        const newLogs = data.logs.slice(lastLogCount);
        newLogs.forEach(msg => ltAddLog(msg));
        lastLogCount = data.logs.length;
      }

      // Stop UI only if the backend says this strategy is no longer active
      if (data.success && data.activated === false) {
        const execBtn = document.getElementById('lt-execute-btn');
        if (execBtn && execBtn.classList.contains('active-state')) {
          ltSetActiveState(false);
          ltAddLog('[SYSTEM] Bot stopped.');
          clearInterval(ltBotStatusInterval);
          ltBotStatusInterval = null;
          const label  = document.getElementById('lt-bot-label-text');
          const toggle = document.getElementById('lt-bot-toggle');
          if (label)  { label.textContent = 'Bot: OFF'; label.style.color = ''; }
          if (toggle) { toggle.checked = false; }
          const panel = document.getElementById('lt-bot-panel');
          if (panel) setTimeout(() => { panel.style.display = 'none'; }, 2000);
          sessionStorage.removeItem('lt_strategy_active');
        }
      }
    } catch (e) { console.error('[LT poll]', e); }
  }, 5000);
}

// ─── LT Execute Live Strategy ──────────────────────────────────
async function ltExecuteLiveStrategy() {
  const token = sessionStorage.getItem('nextunToken');
  if (!token) { alert("Please log in first."); return; }

  const symbol    = document.getElementById('lt-symbol').value;
  const timeframe = document.getElementById('lt-timeframe').value;
  const execBtn   = document.getElementById('lt-execute-btn');
  const panel     = document.getElementById('lt-bot-panel');
  const log       = document.getElementById('lt-bot-log');
  const label     = document.getElementById('lt-bot-label-text');
  const toggle    = document.getElementById('lt-bot-toggle');

  const originalText = execBtn.textContent;
  execBtn.disabled   = true;
  execBtn.textContent = 'Wait...';

  try {
    const stratRes  = await fetch('/api/strategies', { headers: { 'Authorization': `Bearer ${token}` } });
    const stratData = await stratRes.json();
    let strategyId  = 2;
    if (stratData.success && stratData.data?.strategies) {
      const strat = stratData.data.strategies.find(s => s.name.includes("Liquidity"));
      if (strat) strategyId = strat.id;
    }

    const res  = await fetch('/api/strategies/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ strategyId, symbol, timeframe })
    });
    const data = await res.json();

    if (data.success) {
      if (data.message === 'Strategy activated') {
        // ── ACTIVATE ──
        // NOTE: We do NOT stop the Double Bottom strategy here — both can run concurrently.
        ltSetActiveState(true);
        panel.style.display = 'block';
        log.innerHTML       = '';
        if (label)  { label.textContent = 'Bot: ACTIVE 🟢'; label.style.color = '#16a34a'; }
        if (toggle) { toggle.checked = true; }
        ltAddLog('[SYSTEM] Liquidity Trap Bot activated! Live logs will appear below...');

        sessionStorage.setItem('lt_strategy_active', 'true');
        sessionStorage.setItem('lt_strategy_name', 'Liquidity Trap & Inducement');
        sessionStorage.setItem('lt_strategy_symbol', symbol);
        sessionStorage.setItem('lt_strategy_timeframe', timeframe);
        sessionStorage.setItem('lt_strategy_rr', '1:2');

        startLtBotStatusPolling(token);

      } else {
        // ── STOP ──
        ltSetActiveState(false);
        if (label)  { label.textContent = 'Bot: OFF'; label.style.color = ''; }
        if (toggle) { toggle.checked = false; }
        ltAddLog('[SYSTEM] Bot stopped.');

        if (ltBotStatusInterval) { clearInterval(ltBotStatusInterval); ltBotStatusInterval = null; }
        setTimeout(() => { panel.style.display = 'none'; }, 2000);

        sessionStorage.removeItem('lt_strategy_active');
        sessionStorage.removeItem('lt_strategy_name');
        sessionStorage.removeItem('lt_strategy_symbol');
        sessionStorage.removeItem('lt_strategy_timeframe');
        sessionStorage.removeItem('lt_strategy_rr');
      }

    } else {
      alert(data.message || 'Error');
      execBtn.textContent = originalText;
    }

  } catch (err) {
    console.error(err);
    alert('Network error');
    execBtn.textContent = originalText;
  }

  execBtn.disabled = false;
}

// ─── LT Bot Toggle (checkbox) ──────────────────────────────────
let ltBotInterval = null;

async function ltToggleBot(checkbox) {
  const panel  = document.getElementById('lt-bot-panel');
  const label  = document.getElementById('lt-bot-label-text');
  const log    = document.getElementById('lt-bot-log');
  const token  = sessionStorage.getItem('nextunToken');

  if (!token) { alert("Please log in first to run the live strategy."); checkbox.checked = false; return; }

  const symbol    = document.getElementById('lt-symbol').value;
  const timeframe = document.getElementById('lt-timeframe').value;
  checkbox.disabled = true;

  try {
    const stratRes  = await fetch('/api/strategies', { headers: { 'Authorization': `Bearer ${token}` } });
    const stratData = await stratRes.json();
    let strategyId  = 2;
    if (stratData.success && stratData.data?.strategies) {
      const strat = stratData.data.strategies.find(s => s.name.includes("Liquidity"));
      if (strat) strategyId = strat.id;
    }

    const res  = await fetch('/api/strategies/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ strategyId, symbol, timeframe })
    });
    const data = await res.json();

    if (data.success) {
      if (data.message === 'Strategy activated') {
        panel.style.display = 'block';
        label.textContent   = 'Bot: ACTIVE 🟢';
        label.style.color   = '#16a34a';
        log.innerHTML       = '';
        ltAddLog(`[SYSTEM] Real Liquidity Trap Bot activated on ${symbol} (${timeframe}). Live logs will appear below...`);

        ltSetActiveState(true);
        const execBtn = document.getElementById('lt-execute-btn');
        if (execBtn) { execBtn.textContent = 'Stop Live Strategy'; execBtn.classList.add('active-state'); }

        sessionStorage.setItem('lt_strategy_active', 'true');
        sessionStorage.setItem('lt_strategy_name', 'Liquidity Trap & Inducement');
        sessionStorage.setItem('lt_strategy_symbol', symbol);
        sessionStorage.setItem('lt_strategy_timeframe', timeframe);
        sessionStorage.setItem('lt_strategy_rr', '1:2');

        startLtBotStatusPolling(token);
      } else {
        label.textContent = 'Bot: OFF';
        label.style.color = '';
        ltAddLog('[SYSTEM] Bot stopped.');
        ltSetActiveState(false);

        const execBtn = document.getElementById('lt-execute-btn');
        if (execBtn) { execBtn.textContent = 'Run Live Strategy'; execBtn.classList.remove('active-state'); }

        if (ltBotStatusInterval) { clearInterval(ltBotStatusInterval); ltBotStatusInterval = null; }
        setTimeout(() => { panel.style.display = 'none'; }, 2000);

        sessionStorage.removeItem('lt_strategy_active');
        sessionStorage.removeItem('lt_strategy_name');
        sessionStorage.removeItem('lt_strategy_symbol');
        sessionStorage.removeItem('lt_strategy_timeframe');
      }
    } else {
      alert("Error: " + (data.message || 'Unknown error'));
      checkbox.checked = !checkbox.checked;
    }
  } catch (err) {
    console.error('Toggle failed:', err);
    alert('Network error while toggling strategy.');
    checkbox.checked = !checkbox.checked;
  } finally {
    checkbox.disabled = false;
  }
}

// ─── LT Backtest ───────────────────────────────────────────────
function ltToggleActivate() {
  const current = sessionStorage.getItem('lt_strategy_active') === 'true';
  const next    = !current;

  sessionStorage.setItem('lt_strategy_active', next ? 'true' : 'false');

  if (next) {
    const symbol    = document.getElementById('lt-symbol')?.value || 'EURUSD=X';
    const timeframe = document.getElementById('lt-timeframe')?.value || '5m';
    sessionStorage.setItem('lt_strategy_name', 'Liquidity Trap');
    sessionStorage.setItem('lt_strategy_symbol', symbol);
    sessionStorage.setItem('lt_strategy_timeframe', timeframe);
    sessionStorage.setItem('lt_strategy_rr', '1:2');
    ltSetActiveState(true);
    ltRunBacktest();
  } else {
    sessionStorage.removeItem('lt_strategy_name');
    sessionStorage.removeItem('lt_strategy_symbol');
    sessionStorage.removeItem('lt_strategy_timeframe');
    sessionStorage.removeItem('lt_strategy_winrate');
    sessionStorage.removeItem('bt_trades');
    sessionStorage.removeItem('bt_summary');
    ltSetActiveState(false);
  }
}

async function ltRunBacktest() {
  const isStratActive = sessionStorage.getItem('lt_strategy_active') === 'true';
  if (!isStratActive) {
    alert("Please click 'Run Live Strategy' on Liquidity Trap first.");
    return;
  }

  const symbol         = document.getElementById('lt-symbol').value;
  const timeframe      = document.getElementById('lt-timeframe').value;
  const useMarketHours = document.getElementById('lt-market-hours')?.checked || false;

  const loading      = document.getElementById('lt-loading');
  const statsEl      = document.getElementById('lt-stats');
  const tradeSection = document.getElementById('lt-trade-section');
  const runBtn       = document.getElementById('lt-run-btn');

  loading.style.display = 'block';
  statsEl.style.display = 'none';
  tradeSection.style.display = 'none';
  runBtn.disabled = true;
  runBtn.style.opacity = '0.6';

  try {
    const res = await fetch('/api/strategy/backtest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, timeframe, strategy_name: 'Liquidity Trap', use_market_hours: useMarketHours })
    });

    const data = await res.json();
    if (!data.success) { alert('Backtest error: ' + (data.message || 'Unknown error')); return; }

    const d = data.data;
    document.getElementById('lt-rc-total').textContent   = d.total_trades;
    document.getElementById('lt-rc-winrate').textContent = d.win_rate + '%';
    document.getElementById('lt-rc-wl').textContent      = d.wins + ' / ' + d.losses;
    document.getElementById('lt-win-rate').textContent   = d.win_rate + '%';

    const pnlEl = document.getElementById('lt-rc-pnl');
    pnlEl.textContent = (d.total_pnl >= 0 ? '+' : '') + d.total_pnl.toFixed(4);
    pnlEl.style.color = d.total_pnl >= 0 ? '#16a34a' : '#dc2626';
    statsEl.style.display = 'grid';

    const tradesWithSymbol = (d.trades || []).map(t => ({ ...t, symbol: d.symbol }));
    sessionStorage.setItem('bt_trades', JSON.stringify(tradesWithSymbol));
    sessionStorage.setItem('bt_summary', JSON.stringify({
      symbol: d.symbol, timeframe: d.timeframe, total_trades: d.total_trades,
      wins: d.wins, partials: d.partials || 0, losses: d.losses,
      win_rate: d.win_rate, total_pnl: d.total_pnl, strategy_name: 'Liquidity Trap'
    }));
    sessionStorage.setItem('dt_strategy_winrate', d.win_rate + '%');
    sessionStorage.setItem('dt_strategy_symbol', d.symbol);
    sessionStorage.setItem('dt_strategy_timeframe', d.timeframe);

    if (tradeSection) {
      tradeSection.style.display = 'block';
      tradeSection.innerHTML = `
        <div style="text-align:center;padding:20px;background:var(--bg-color);border-radius:12px;border:1px solid var(--border-color);">
          <div style="font-size:28px;margin-bottom:8px;">✅</div>
          <div style="font-size:15px;font-weight:700;color:var(--text-dark);margin-bottom:6px;">${d.total_trades} trades saved for ${d.symbol} (Liquidity Trap)</div>
          <div style="font-size:13px;color:var(--text-gray);margin-bottom:14px;">
            ${d.wins} Full Wins · ${d.partials || 0} Partial Wins · ${d.losses} Losses · Win Rate: ${d.win_rate}% · Net P&L: ${d.total_pnl >= 0 ? '+' : ''}${d.total_pnl.toFixed(4)}
          </div>
          <a href="/trades" style="display:inline-block;padding:10px 24px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:white;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;">📋 View All Trades in Trades Page →</a>
        </div>`;
    }
  } catch (err) {
    console.error('Liquidity Trap Backtest failed:', err);
    alert('Network error. Make sure the Django server is running on port 8000.');
  } finally {
    loading.style.display = 'none';
    runBtn.disabled = false;
    runBtn.style.opacity = '1';
  }
}
