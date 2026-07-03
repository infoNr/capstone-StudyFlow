/* =============================================
   TODO.JS — Todo List Module
   ============================================= */

'use strict';

(function TodoModule() {
  const LS_KEY = 'sf_todos';
  let tasks = [];
  let filter = 'all';
  let sortBy = 'created';
  let editingId = null;

  // ─── Storage ─────────────────────────────────
  const load = () => { try { tasks = JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { tasks = []; } };
  const save = () => localStorage.setItem(LS_KEY, JSON.stringify(tasks));

  // ─── Helpers ─────────────────────────────────
  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
  const isOverdue = (t) => t.dueDate && !t.completed && new Date(t.dueDate) < new Date(new Date().toDateString());
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  function getFiltered() {
    let list = [...tasks];
    switch (filter) {
      case 'active':    list = list.filter(t => !t.completed); break;
      case 'completed': list = list.filter(t => t.completed); break;
      case 'high':      list = list.filter(t => t.priority === 'high'); break;
      case 'medium':    list = list.filter(t => t.priority === 'medium'); break;
      case 'low':       list = list.filter(t => t.priority === 'low'); break;
    }
    switch (sortBy) {
      case 'duedate':
        list.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        });
        break;
      case 'priority':
        list.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        break;
      default:
        list.sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  }

  // ─── Render ──────────────────────────────────
  function render() {
    const list = document.getElementById('todoList');
    const empty = document.getElementById('todoEmpty');
    const filtered = getFiltered();

    // Update stats
    const total   = tasks.length;
    const done    = tasks.filter(t => t.completed).length;
    const active  = total - done;
    const overdue = tasks.filter(t => isOverdue(t)).length;
    document.getElementById('statTotal').textContent   = total;
    document.getElementById('statActive').textContent  = active;
    document.getElementById('statDone').textContent    = done;
    document.getElementById('statOverdue').textContent = overdue;

    // Progress ring
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const ring = document.getElementById('todoProgressRing');
    const circumference = 138.2;
    ring.style.strokeDashoffset = circumference - (circumference * pct / 100);
    document.getElementById('todoProgressText').textContent = `${pct}%`;

    // Clear existing items (keep empty state)
    list.querySelectorAll('.task-item').forEach(el => el.remove());

    if (filtered.length === 0) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    filtered.forEach(task => {
      const el = buildTaskEl(task);
      list.appendChild(el);
    });

    // Sync pomodoro task list
    if (window.pomodoroModule) window.pomodoroModule.refreshTaskList();
  }

  function buildTaskEl(task) {
    const overdue = isOverdue(task);
    const div = document.createElement('div');
    div.className = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''}`;
    div.setAttribute('role', 'listitem');
    div.dataset.id = task.id;

    const dueDateStr = task.dueDate
      ? `<span class="task-due ${overdue ? 'overdue' : ''}">📅 ${formatDate(task.dueDate)}${overdue ? ' (Overdue)' : ''}</span>`
      : '';
    const categoryTag = task.category
      ? `<span class="task-tag tag-category">🏷 ${escHtml(task.category)}</span>`
      : '';
    const overdueTag = overdue
      ? `<span class="task-tag tag-overdue">Overdue</span>`
      : '';

    div.innerHTML = `
      <button class="task-check" data-id="${task.id}" aria-label="${task.completed ? 'Mark incomplete' : 'Mark complete'}">
        ${task.completed ? '✓' : ''}
      </button>
      <div class="task-info">
        <div class="task-title">${escHtml(task.title)}</div>
        ${task.description ? `<div class="task-desc">${escHtml(task.description)}</div>` : ''}
        <div class="task-meta">
          <span class="task-tag tag-priority-${task.priority}">${capitalize(task.priority)}</span>
          ${categoryTag}
          ${dueDateStr}
          ${overdueTag}
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action-btn edit" data-id="${task.id}" title="Edit">✏️</button>
        <button class="task-action-btn delete" data-id="${task.id}" title="Delete">🗑️</button>
      </div>
    `;

    // Events
    div.querySelector('.task-check').addEventListener('click', () => toggleTask(task.id));
    div.querySelector('.edit').addEventListener('click', () => openEdit(task.id));
    div.querySelector('.delete').addEventListener('click', () => deleteTask(task.id));

    return div;
  }

  // ─── CRUD ────────────────────────────────────
  function addTask(data) {
    tasks.unshift({
      id: genId(),
      title: data.title.trim(),
      description: data.description?.trim() || '',
      priority: data.priority || 'medium',
      dueDate: data.dueDate || '',
      category: data.category?.trim() || '',
      completed: false,
      createdAt: Date.now()
    });
    save();
    render();
    window.showToast('Task added! 📋', 'success');
  }

  function toggleTask(id) {
    const t = tasks.find(t => t.id === id);
    if (!t) return;
    t.completed = !t.completed;
    t.completedAt = t.completed ? Date.now() : null;
    save();
    render();
    if (t.completed) {
      window.showToast('Task completed! 🎉', 'success');
      launchConfetti();
    }
  }

  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    save();
    render();
    window.showToast('Task deleted', 'info');
  }

  function openEdit(id) {
    const t = tasks.find(t => t.id === id);
    if (!t) return;
    editingId = id;
    document.getElementById('taskTitle').value    = t.title;
    document.getElementById('taskDesc').value     = t.description;
    document.getElementById('taskPriority').value = t.priority;
    document.getElementById('taskDue').value      = t.dueDate;
    document.getElementById('taskCategory').value = t.category;
    document.getElementById('addTaskTitle').textContent = 'Edit Task';
    document.getElementById('saveTask').textContent = 'Update Task';
    window.openModal('addTaskModal');
  }

  function saveTask() {
    const title = document.getElementById('taskTitle').value.trim();
    if (!title) { window.showToast('Please enter a task title', 'error'); return; }
    const data = {
      title,
      description: document.getElementById('taskDesc').value,
      priority:    document.getElementById('taskPriority').value,
      dueDate:     document.getElementById('taskDue').value,
      category:    document.getElementById('taskCategory').value
    };
    if (editingId) {
      const t = tasks.find(t => t.id === editingId);
      if (t) Object.assign(t, data);
      editingId = null;
      window.showToast('Task updated ✅', 'success');
    } else {
      addTask(data);
      return;
    }
    save();
    render();
    resetForm();
    window.closeModal('addTaskModal');
  }

  function resetForm() {
    document.getElementById('taskTitle').value    = '';
    document.getElementById('taskDesc').value     = '';
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskDue').value      = '';
    document.getElementById('taskCategory').value = '';
    document.getElementById('addTaskTitle').textContent = 'Add Task';
    document.getElementById('saveTask').textContent = 'Add Task';
    editingId = null;
  }

  // ─── Confetti ────────────────────────────────
  function launchConfetti() {
    const colors = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
    for (let i = 0; i < 40; i++) {
      const piece = document.createElement('div');
      piece.style.cssText = `
        position:fixed; top:${Math.random() * 30 + 20}%; left:${Math.random() * 80 + 10}%;
        width:8px; height:8px; border-radius:${Math.random() > 0.5 ? '50%' : '0'};
        background:${colors[Math.floor(Math.random() * colors.length)]};
        pointer-events:none; z-index:9999;
        animation: confettiFall ${0.8 + Math.random() * 0.8}s ease forwards;
        animation-delay:${Math.random() * 0.3}s;
      `;
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 1500);
    }
    // Inject keyframes once
    if (!document.getElementById('confettiStyle')) {
      const s = document.createElement('style');
      s.id = 'confettiStyle';
      s.textContent = `
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(200px) rotate(720deg); opacity: 0; }
        }
      `;
      document.head.appendChild(s);
    }
  }

  // ─── Expose task list for Pomodoro ───────────
  window.getTasks = () => tasks.filter(t => !t.completed);

  // ─── Utilities ───────────────────────────────
  function escHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }
  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // ─── Event Wiring ────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    load();

    // Open add modal
    document.getElementById('openAddTask')?.addEventListener('click', () => {
      resetForm();
      window.openModal('addTaskModal');
    });
    document.getElementById('closeAddTask')?.addEventListener('click', () => {
      resetForm();
      window.closeModal('addTaskModal');
    });
    document.getElementById('cancelAddTask')?.addEventListener('click', () => {
      resetForm();
      window.closeModal('addTaskModal');
    });
    document.getElementById('saveTask')?.addEventListener('click', () => {
      saveTask();
      if (!editingId) {
        resetForm();
        window.closeModal('addTaskModal');
      }
    });

    // Enter key in title
    document.getElementById('taskTitle')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { saveTask(); resetForm(); window.closeModal('addTaskModal'); }
    });

    // Filter pills
    document.querySelectorAll('.todo-filters .pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.todo-filters .pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        filter = pill.dataset.filter;
        render();
      });
    });

    // Sort
    document.getElementById('todoSort')?.addEventListener('change', (e) => {
      sortBy = e.target.value;
      render();
    });

    render();
  });
})();
