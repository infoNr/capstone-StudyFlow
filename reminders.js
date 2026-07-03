/* =============================================
   REMINDERS.JS — Reminder Module
   ============================================= */

'use strict';

(function RemindersModule() {
  const LS_KEY = 'sf_reminders';
  let reminders = [];
  let notifPermission = false;
  let checkInterval   = null;

  // ─── Storage ─────────────────────────────────
  const load = () => { try { reminders = JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { reminders = []; } };
  const save = () => localStorage.setItem(LS_KEY, JSON.stringify(reminders));

  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

  // ─── Notifications ───────────────────────────
  async function requestNotifPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') { notifPermission = true; return true; }
    if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      notifPermission = perm === 'granted';
      return notifPermission;
    }
    return false;
  }

  function sendNotification(title, body) {
    if (notifPermission && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔔</text></svg>'
        });
      } catch {}
    }
    // Always show in-app toast
    window.showToast(`🔔 ${title}${body ? ': ' + body : ''}`, 'info', 6000);
  }

  // ─── Reminder Checking ───────────────────────
  function checkReminders() {
    const now = new Date();
    const changed = [];

    reminders.forEach(r => {
      if (r.dismissed) return;
      const due = new Date(`${r.date}T${r.time}`);
      if (due <= now) {
        sendNotification(r.title, r.note);
        if (r.repeat === 'once') {
          r.dismissed = true;
          r.firedAt   = Date.now();
        } else if (r.repeat === 'daily') {
          const next = new Date(due);
          next.setDate(next.getDate() + 1);
          r.date = next.toISOString().slice(0, 10);
        } else if (r.repeat === 'weekly') {
          const next = new Date(due);
          next.setDate(next.getDate() + 7);
          r.date = next.toISOString().slice(0, 10);
        }
        changed.push(r.id);
      }
    });

    if (changed.length) {
      save();
      render();
      updateBadge();
    }
  }

  // ─── CRUD ────────────────────────────────────
  function addReminder(data) {
    reminders.push({
      id:        genId(),
      title:     data.title.trim(),
      note:      data.note?.trim() || '',
      date:      data.date,
      time:      data.time,
      repeat:    data.repeat || 'once',
      dismissed: false,
      createdAt: Date.now()
    });
    reminders.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
    save();
    render();
    updateBadge();
    window.showToast('Reminder set! 🔔', 'success');
  }

  function deleteReminder(id) {
    reminders = reminders.filter(r => r.id !== id);
    save();
    render();
    updateBadge();
    window.showToast('Reminder removed', 'info');
  }

  // ─── Badge ───────────────────────────────────
  function updateBadge() {
    const upcoming = reminders.filter(r => !r.dismissed).length;
    const badge = document.getElementById('reminderBadge');
    if (!badge) return;
    if (upcoming > 0) {
      badge.style.display = 'flex';
      badge.textContent   = upcoming;
    } else {
      badge.style.display = 'none';
    }
  }

  // ─── Render ──────────────────────────────────
  function render() {
    const now      = new Date();
    const upcoming = reminders.filter(r => !r.dismissed && new Date(`${r.date}T${r.time}`) > now);
    const past     = reminders.filter(r =>  r.dismissed || new Date(`${r.date}T${r.time}`) <= now);

    renderList(document.getElementById('reminderList'),     document.getElementById('reminderEmpty'),     upcoming, false);
    renderList(document.getElementById('reminderPastList'), document.getElementById('reminderPastEmpty'), past,     true);
  }

  function renderList(container, emptyEl, list, isPast) {
    if (!container) return;
    container.querySelectorAll('.reminder-item').forEach(el => el.remove());

    if (list.length === 0) {
      if (emptyEl) emptyEl.style.display = isPast ? 'block' : 'block';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    list.forEach(r => {
      const el = buildReminderEl(r, isPast);
      container.appendChild(el);
    });
  }

  function buildReminderEl(r, isPast) {
    const due      = new Date(`${r.date}T${r.time}`);
    const now      = new Date();
    const countdown = !isPast ? formatCountdown(due - now) : null;
    const div = document.createElement('div');
    div.className = `reminder-item ${isPast ? 'past' : ''}`;
    div.dataset.id = r.id;

    const repeatBadge = r.repeat !== 'once'
      ? `<span class="reminder-repeat">🔁 ${capitalize(r.repeat)}</span>` : '';
    const countdownBadge = countdown
      ? `<span class="reminder-countdown">${countdown}</span>` : '';

    div.innerHTML = `
      <div class="reminder-icon">${isPast ? '✅' : '🔔'}</div>
      <div class="reminder-info">
        <div class="reminder-title">${escHtml(r.title)}</div>
        ${r.note ? `<div class="reminder-note">${escHtml(r.note)}</div>` : ''}
        <div class="reminder-meta">
          <span class="reminder-datetime">${formatDateTime(due)}</span>
          ${repeatBadge}
          ${countdownBadge}
        </div>
      </div>
      <div class="reminder-actions">
        <button class="task-action-btn delete" title="Delete">🗑️</button>
      </div>
    `;
    div.querySelector('.delete').addEventListener('click', () => deleteReminder(r.id));
    return div;
  }

  // ─── Format Helpers ──────────────────────────
  function formatDateTime(date) {
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function formatCountdown(ms) {
    if (ms <= 0) return null;
    const secs  = Math.floor(ms / 1000);
    const mins  = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const days  = Math.floor(hours / 24);
    if (days > 0)  return `in ${days}d ${hours % 24}h`;
    if (hours > 0) return `in ${hours}h ${mins % 60}m`;
    if (mins > 0)  return `in ${mins}m`;
    return `in ${secs}s`;
  }

  function escHtml(s) { const d = document.createElement('div'); d.appendChild(document.createTextNode(s)); return d.innerHTML; }
  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ─── Modal Form ──────────────────────────────
  function resetForm() {
    document.getElementById('reminderTitle').value  = '';
    document.getElementById('reminderNote').value   = '';
    document.getElementById('reminderDate').value   = '';
    document.getElementById('reminderTime').value   = '';
    document.getElementById('reminderRepeat').value = 'once';
  }

  function saveReminder() {
    const title = document.getElementById('reminderTitle').value.trim();
    const date  = document.getElementById('reminderDate').value;
    const time  = document.getElementById('reminderTime').value;
    if (!title) { window.showToast('Please enter a title', 'error'); return; }
    if (!date || !time) { window.showToast('Please set date and time', 'error'); return; }

    const due = new Date(`${date}T${time}`);
    if (due <= new Date()) { window.showToast('Please choose a future date/time', 'error'); return; }

    addReminder({
      title,
      note:   document.getElementById('reminderNote').value,
      date,
      time,
      repeat: document.getElementById('reminderRepeat').value
    });
    resetForm();
    window.closeModal('addReminderModal');
  }

  // ─── Init ────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    load();

    // Check notification permission
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        notifPermission = true;
        document.getElementById('notifBanner')?.classList.add('hidden');
      } else if (Notification.permission === 'denied') {
        document.getElementById('notifBanner')?.classList.add('hidden');
      }
    } else {
      document.getElementById('notifBanner')?.classList.add('hidden');
    }

    document.getElementById('enableNotif')?.addEventListener('click', async () => {
      const granted = await requestNotifPermission();
      if (granted) {
        document.getElementById('notifBanner')?.classList.add('hidden');
        window.showToast('Notifications enabled! 🔔', 'success');
      } else {
        window.showToast('Notification permission denied', 'error');
      }
    });
    document.getElementById('dismissNotifBanner')?.addEventListener('click', () => {
      document.getElementById('notifBanner')?.classList.add('hidden');
    });

    document.getElementById('openAddReminder')?.addEventListener('click', () => {
      resetForm();
      window.openModal('addReminderModal');
    });
    document.getElementById('closeAddReminder')?.addEventListener('click', () => {
      resetForm();
      window.closeModal('addReminderModal');
    });
    document.getElementById('cancelAddReminder')?.addEventListener('click', () => {
      resetForm();
      window.closeModal('addReminderModal');
    });
    document.getElementById('saveReminder')?.addEventListener('click', saveReminder);

    render();
    updateBadge();

    // Check reminders every 30 seconds
    checkInterval = setInterval(() => {
      checkReminders();
      render(); // refresh countdowns
    }, 30000);

    // Also update countdowns every minute
    setInterval(render, 60000);
  });
})();
