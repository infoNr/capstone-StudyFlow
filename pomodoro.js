/* =============================================
   POMODORO.JS — Timer Module
   ============================================= */

'use strict';

(function PomodoroModule() {
  const LS_KEY_SETTINGS = 'sf_pomo_settings';
  const LS_KEY_LOG      = 'sf_pomo_log';

  let settings = { work: 25, short: 5, long: 15, cycles: 4 };
  let log = [];

  let mode         = 'work';  // 'work' | 'short' | 'long'
  let timeLeft     = 0;
  let totalTime    = 0;
  let running      = false;
  let intervalId   = null;
  let sessionsDone = 0;      // completed work sessions this streak

  const RING_R = 95;
  const CIRCUMFERENCE = 2 * Math.PI * RING_R; // ~596.9

  // ─── Storage ─────────────────────────────────
  function loadData() {
    try { settings = { ...settings, ...JSON.parse(localStorage.getItem(LS_KEY_SETTINGS)) }; } catch {}
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY_LOG)) || [];
      const today = new Date().toDateString();
      log = raw.filter(e => new Date(e.timestamp).toDateString() === today);
    } catch { log = []; }
  }
  function saveSettings() { localStorage.setItem(LS_KEY_SETTINGS, JSON.stringify(settings)); }
  function saveLog() {
    // Keep only today + merge with any stored future entries
    try {
      const stored = JSON.parse(localStorage.getItem(LS_KEY_LOG)) || [];
      const today = new Date().toDateString();
      const other = stored.filter(e => new Date(e.timestamp).toDateString() !== today);
      localStorage.setItem(LS_KEY_LOG, JSON.stringify([...other, ...log]));
    } catch {}
  }

  // ─── Time Helpers ────────────────────────────
  function modeMinutes() {
    return mode === 'work' ? settings.work : mode === 'short' ? settings.short : settings.long;
  }
  function fmt(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // ─── Ring Update ─────────────────────────────
  function updateRing() {
    const ring = document.getElementById('timerRingProgress');
    if (!ring) return;
    const frac = totalTime > 0 ? timeLeft / totalTime : 1;
    ring.style.strokeDasharray  = CIRCUMFERENCE;
    ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - frac);
  }

  function updateDisplay() {
    const disp = document.getElementById('timerDisplay');
    if (disp) disp.textContent = fmt(timeLeft);
    updateRing();
    // Update dots
    const dots = document.getElementById('sessionDots');
    if (dots) {
      dots.innerHTML = '';
      for (let i = 0; i < settings.cycles; i++) {
        const d = document.createElement('span');
        d.className = `session-dot ${i < (sessionsDone % settings.cycles) ? 'done' : ''}`;
        dots.appendChild(d);
      }
    }
  }

  function updateModeLabel() {
    const labels = { work: '🎯 Focus Time', short: '☕ Short Break', long: '🛌 Long Break' };
    const el = document.getElementById('timerModeLabel');
    if (el) el.textContent = labels[mode];
  }

  // ─── Timer Control ───────────────────────────
  function setMode(m) {
    if (running) stopTimer();
    mode = m;
    timeLeft = modeMinutes() * 60;
    totalTime = timeLeft;
    updateDisplay();
    updateModeLabel();

    // Tab highlighting
    document.querySelectorAll('.pomo-tab').forEach(t => t.classList.remove('active'));
    const tabMap = { work: 'tab-work', short: 'tab-short', long: 'tab-long' };
    document.getElementById(tabMap[mode])?.classList.add('active');

    // Ring color for breaks
    const ring = document.getElementById('timerRingProgress');
    if (ring) {
      ring.style.stroke = mode === 'work' ? 'url(#timerGradient)' : '#10b981';
    }

    const btn = document.getElementById('timerToggle');
    if (btn) btn.textContent = 'Start';
  }

  function startTimer() {
    running = true;
    document.getElementById('timerToggle').textContent = 'Pause';
    document.querySelector('.timer-ring')?.classList.add('running');

    intervalId = setInterval(() => {
      if (timeLeft <= 0) {
        clearInterval(intervalId);
        running = false;
        onTimerEnd();
        return;
      }
      timeLeft--;
      updateDisplay();
    }, 1000);
  }

  function stopTimer() {
    clearInterval(intervalId);
    running = false;
    document.getElementById('timerToggle').textContent = 'Resume';
    document.querySelector('.timer-ring')?.classList.remove('running');
  }

  function resetTimer() {
    if (running) stopTimer();
    timeLeft = modeMinutes() * 60;
    totalTime = timeLeft;
    updateDisplay();
    document.getElementById('timerToggle').textContent = 'Start';
  }

  function onTimerEnd() {
    document.querySelector('.timer-ring')?.classList.remove('running');
    document.getElementById('timerToggle').textContent = 'Start';
    playSound();

    if (mode === 'work') {
      sessionsDone++;
      // Log session
      const task = document.getElementById('pomodoroTaskSelect')?.value || '';
      const taskName = task
        ? document.getElementById('pomodoroTaskSelect')?.options[
            document.getElementById('pomodoroTaskSelect').selectedIndex
          ]?.text || 'Free study'
        : 'Free study';
      const entry = {
        timestamp: Date.now(),
        task: taskName,
        duration: settings.work,
        type: 'work'
      };
      log.push(entry);
      saveLog();
      renderSessionLog();
      window.showToast(`Great focus! 🎯 Session ${sessionsDone} complete.`, 'success');
      // Auto-switch to break
      if (sessionsDone % settings.cycles === 0) {
        window.showToast('Time for a long break! 🛌', 'info', 4000);
        setMode('long');
      } else {
        window.showToast('Time for a short break! ☕', 'info', 4000);
        setMode('short');
      }
    } else {
      window.showToast('Break over! Ready to focus? 🎯', 'info', 3000);
      setMode('work');
    }
    updateDisplay();
  }

  function skipTimer() {
    if (running) stopTimer();
    timeLeft = 0;
    onTimerEnd();
  }

  // ─── Web Audio Sound ─────────────────────────
  function playSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const freqs = mode === 'work' ? [523, 659, 784] : [784, 659, 523];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.4);
        osc.start(ctx.currentTime + i * 0.25);
        osc.stop(ctx.currentTime + i * 0.25 + 0.5);
      });
    } catch {}
  }

  // ─── Session Log Render ──────────────────────
  function renderSessionLog() {
    const logEl = document.getElementById('sessionLog');
    if (!logEl) return;

    const todayLog = log.filter(e => new Date(e.timestamp).toDateString() === new Date().toDateString());
    const workSessions = todayLog.filter(e => e.type === 'work');

    document.getElementById('todayPomodoros').textContent = workSessions.length;
    document.getElementById('todayMinutes').textContent   = workSessions.reduce((s, e) => s + e.duration, 0);

    logEl.innerHTML = '';
    if (workSessions.length === 0) {
      logEl.innerHTML = '<div class="empty-state-sm">No sessions yet today.</div>';
      return;
    }
    [...workSessions].reverse().forEach(e => {
      const item = document.createElement('div');
      item.className = 'session-log-item';
      item.innerHTML = `
        <span class="session-emoji">🍅</span>
        <span class="session-task">${e.task}</span>
        <span class="session-time">${new Date(e.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
      `;
      logEl.appendChild(item);
    });
  }

  // ─── Task List Refresh ───────────────────────
  function refreshTaskList() {
    const sel = document.getElementById('pomodoroTaskSelect');
    if (!sel) return;
    const current = sel.value;
    const tasks = window.getTasks ? window.getTasks() : [];
    sel.innerHTML = '<option value="">— Select a task —</option>';
    tasks.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.title.length > 40 ? t.title.slice(0, 40) + '…' : t.title;
      if (t.id === current) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  // ─── Settings ────────────────────────────────
  function openSettings() {
    const panel = document.getElementById('pomodoroSettingsPanel');
    if (!panel) return;
    document.getElementById('settingWork').value   = settings.work;
    document.getElementById('settingShort').value  = settings.short;
    document.getElementById('settingLong').value   = settings.long;
    document.getElementById('settingCycles').value = settings.cycles;
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }

  function saveSettings() {
    settings.work   = parseInt(document.getElementById('settingWork').value)   || 25;
    settings.short  = parseInt(document.getElementById('settingShort').value)  || 5;
    settings.long   = parseInt(document.getElementById('settingLong').value)   || 15;
    settings.cycles = parseInt(document.getElementById('settingCycles').value) || 4;
    localStorage.setItem(LS_KEY_SETTINGS, JSON.stringify(settings));
    resetTimer();
    window.showToast('Settings saved ⚙️', 'success');
    document.getElementById('pomodoroSettingsPanel').style.display = 'none';
  }

  // ─── Public API ──────────────────────────────
  window.pomodoroModule = { refreshTaskList };

  // ─── Init ────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setMode('work');
    renderSessionLog();

    document.getElementById('timerToggle')?.addEventListener('click', () => {
      running ? stopTimer() : startTimer();
    });
    document.getElementById('timerReset')?.addEventListener('click', resetTimer);
    document.getElementById('timerSkip')?.addEventListener('click', skipTimer);

    document.querySelectorAll('.pomo-tab').forEach(tab => {
      tab.addEventListener('click', () => setMode(tab.dataset.mode));
    });

    document.getElementById('pomodoroSettings')?.addEventListener('click', openSettings);
    document.getElementById('saveSettings')?.addEventListener('click', saveSettings);
  });
})();
