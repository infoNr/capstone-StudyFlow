/* =============================================
   APP.JS — Entry Point, Routing, Theme
   ============================================= */

'use strict';

// ─── Theme ───────────────────────────────────
const THEME_KEY = 'sf_theme';

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const icon  = btn.querySelector('.theme-icon');
  const label = btn.querySelector('.theme-label');
  if (theme === 'light') {
    icon.textContent  = '☀️';
    label.textContent = 'Light Mode';
  } else {
    icon.textContent  = '🌙';
    label.textContent = 'Dark Mode';
  }
}

// ─── Navigation / Routing ────────────────────
let currentSection = 'todo';

function navigateTo(section) {
  if (currentSection === section) return;
  currentSection = section;

  // Deactivate all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));

  // Activate target
  const sec = document.getElementById(`section-${section}`);
  if (sec) sec.classList.add('active');

  const navItem = document.getElementById(`nav-${section}`)?.closest('.nav-item');
  if (navItem) navItem.classList.add('active');

  document.querySelectorAll(`.mobile-nav-btn[data-section="${section}"]`)
    .forEach(b => b.classList.add('active'));

  // Lifecycle hooks
  if (section === 'pomodoro' && window.pomodoroModule) {
    window.pomodoroModule.refreshTaskList();
  }
  if (section === 'quiz' && window.quizModule) {
    window.quizModule.showLibrary();
  }
  if (section === 'flashcard' && window.flashcardModule) {
    window.flashcardModule.showDecks();
  }
}

// ─── Toast Notification ──────────────────────
window.showToast = function(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || '💬'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
};

// ─── Modal Helpers ───────────────────────────
window.openModal = function(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('open');
};
window.closeModal = function(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
};

// ─── Sidebar Collapse ────────────────────────
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle  = document.getElementById('sidebarToggle');
  const main    = document.getElementById('mainContent');

  const collapsed = localStorage.getItem('sf_sidebar') === 'collapsed';
  if (collapsed) {
    sidebar.classList.add('collapsed');
    main.style.marginLeft = 'var(--sidebar-collapsed)';
  }

  toggle?.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    main.style.marginLeft = isCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)';
    localStorage.setItem('sf_sidebar', isCollapsed ? 'collapsed' : 'expanded');
  });
}

// ─── Bootstrap ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSidebar();

  // Sidebar nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.section));
  });

  // Mobile nav buttons
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.section));
  });

  // Theme toggle
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // Initial section
  navigateTo('todo');
});
