/* =============================================
   QUIZ.JS — Quiz Maker Module
   ============================================= */

'use strict';

(function QuizModule() {
  const LS_KEY = 'sf_quizzes';
  let quizzes     = [];
  let editingQuiz = null;   // quiz object being edited/created
  let activeQuiz  = null;   // quiz being taken
  let answers     = {};     // { questionId: selectedAnswer }
  let qIndex      = 0;
  let timerSecs   = 0;
  let timerIv     = null;
  let isFlipped   = false;

  // ─── Storage ─────────────────────────────────
  const load = () => { try { quizzes = JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { quizzes = []; } };
  const save = () => localStorage.setItem(LS_KEY, JSON.stringify(quizzes));
  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
  const escHtml = (s) => { const d = document.createElement('div'); d.appendChild(document.createTextNode(s)); return d.innerHTML; };

  // ─── Views ───────────────────────────────────
  function show(view) {
    ['quizLibraryView','quizCreateView','quizTakeView','quizResultsView'].forEach(id => {
      document.getElementById(id).style.display = id === view ? 'block' : 'none';
    });
  }
  function showLibrary() { show('quizLibraryView'); renderLibrary(); }

  // ─── Library ─────────────────────────────────
  function renderLibrary() {
    const grid  = document.getElementById('quizGrid');
    const empty = document.getElementById('quizEmpty');
    grid.querySelectorAll('.quiz-card').forEach(el => el.remove());

    if (quizzes.length === 0) { empty.style.display = 'block'; return; }
    empty.style.display = 'none';

    quizzes.forEach(quiz => {
      const card = document.createElement('div');
      card.className = 'quiz-card';
      const best = quiz.scores?.length ? Math.max(...quiz.scores) : null;
      card.innerHTML = `
        ${best !== null ? `<div class="quiz-best-score">${best}%</div>` : ''}
        <div class="quiz-card-icon">🧠</div>
        <div class="quiz-card-title">${escHtml(quiz.title)}</div>
        ${quiz.subject ? `<div class="quiz-card-subject">${escHtml(quiz.subject)}</div>` : ''}
        <div class="quiz-card-meta">${quiz.questions.length} question${quiz.questions.length !== 1 ? 's' : ''} ${quiz.questions.length >= 15 ? '✅' : ''}</div>
        <div class="quiz-card-stats">
          <span>📅 ${new Date(quiz.createdAt).toLocaleDateString()}</span>
          ${quiz.scores?.length ? `<span>🏆 Best: ${best}%</span>` : ''}
        </div>
        <div class="quiz-card-actions">
          <button class="btn btn-primary btn-sm take-btn">▶ Take</button>
          <button class="btn btn-secondary btn-sm edit-btn">✏️</button>
          <button class="btn btn-ghost btn-sm export-btn" title="Export JSON">⬇️</button>
          <button class="btn btn-ghost btn-sm delete-btn" title="Delete">🗑️</button>
        </div>
      `;
      card.querySelector('.take-btn').addEventListener('click', (e) => { e.stopPropagation(); startQuiz(quiz.id); });
      card.querySelector('.edit-btn').addEventListener('click', (e) => { e.stopPropagation(); openEdit(quiz.id); });
      card.querySelector('.export-btn').addEventListener('click', (e) => { e.stopPropagation(); exportQuiz(quiz.id); });
      card.querySelector('.delete-btn').addEventListener('click', (e) => { e.stopPropagation(); deleteQuiz(quiz.id); });
      grid.appendChild(card);
    });
  }

  // ─── Create/Edit Quiz ────────────────────────
  const MIN_QUESTIONS = 15;

  function openCreate() {
    editingQuiz = { id: genId(), title: '', subject: '', questions: [], createdAt: Date.now(), scores: [] };
    document.getElementById('quizTitle').value   = '';
    document.getElementById('quizSubject').value = '';
    document.getElementById('quizCreateTitle').textContent = 'Create New Quiz';
    document.getElementById('quizQuestionsList').innerHTML = '';
    // Pre-fill with 15 question slots
    for (let i = 0; i < MIN_QUESTIONS; i++) addQuestion();
    show('quizCreateView');
    updateQuestionCounter();
  }

  function openEdit(id) {
    const quiz = quizzes.find(q => q.id === id);
    if (!quiz) return;
    editingQuiz = JSON.parse(JSON.stringify(quiz)); // deep clone
    document.getElementById('quizTitle').value   = quiz.title;
    document.getElementById('quizSubject').value = quiz.subject || '';
    document.getElementById('quizCreateTitle').textContent = 'Edit Quiz';
    document.getElementById('quizQuestionsList').innerHTML = '';
    // Ensure at least 15 questions when editing
    while (editingQuiz.questions.length < MIN_QUESTIONS) {
      editingQuiz.questions.push({
        id: genId(), type: 'mc', text: '',
        options: ['','','',''], correct: 0, explanation: ''
      });
    }
    editingQuiz.questions.forEach((q, i) => renderQuestionEditor(q, i));
    show('quizCreateView');
    updateQuestionCounter();
  }

  function addQuestion() {
    const q = {
      id:      genId(),
      type:    'mc',
      text:    '',
      options: ['', '', '', ''],
      correct: 0,
      explanation: ''
    };
    editingQuiz.questions.push(q);
    renderQuestionEditor(q, editingQuiz.questions.length - 1);
    updateQuestionCounter();
  }

  function updateQuestionCounter() {
    const count = editingQuiz ? editingQuiz.questions.length : 0;
    let counterEl = document.getElementById('questionCounter');
    if (!counterEl) {
      // Inject next to the Add Question button
      const addBtn = document.getElementById('addQuestion');
      if (!addBtn) return;
      counterEl = document.createElement('div');
      counterEl.id = 'questionCounter';
      counterEl.style.cssText = 'text-align:center;font-size:0.8rem;font-weight:600;margin-top:0.5rem;';
      addBtn.parentNode.insertBefore(counterEl, addBtn.nextSibling);
    }
    const color = count >= MIN_QUESTIONS ? 'var(--success)' : 'var(--warning)';
    counterEl.style.color = color;
    counterEl.textContent = count >= MIN_QUESTIONS
      ? `✅ ${count} questions (minimum met)`
      : `⚠️ ${count} / ${MIN_QUESTIONS} questions — need ${MIN_QUESTIONS - count} more`;
    // Toggle delete buttons based on min
    document.querySelectorAll('#quizQuestionsList .quiz-question-item .delete').forEach(btn => {
      btn.disabled = count <= MIN_QUESTIONS;
      btn.title    = count <= MIN_QUESTIONS ? `Minimum ${MIN_QUESTIONS} questions required` : 'Remove question';
      btn.style.opacity = count <= MIN_QUESTIONS ? '0.35' : '1';
    });
  }

  function renderQuestionEditor(q, idx) {
    const container = document.getElementById('quizQuestionsList');
    const el = document.createElement('div');
    el.className = 'quiz-question-item';
    el.dataset.qid = q.id;
    rebuildQuestionEditor(el, q, idx);
    container.appendChild(el);
  }

  function rebuildQuestionEditor(el, q, idx) {
    el.innerHTML = `
      <div class="question-header">
        <span class="question-num">Q${idx + 1}</span>
        <div class="question-type-selector">
          <button class="qtype-btn ${q.type === 'mc' ? 'active' : ''}" data-type="mc">Multiple Choice</button>
          <button class="qtype-btn ${q.type === 'tf' ? 'active' : ''}" data-type="tf">True / False</button>
          <button class="qtype-btn ${q.type === 'short' ? 'active' : ''}" data-type="short">Short Answer</button>
        </div>
        <button class="task-action-btn delete" title="Remove">🗑️</button>
      </div>
      <div class="form-group">
        <label class="input-label">Question</label>
        <textarea class="text-input textarea" rows="2" placeholder="Enter your question...">${escHtml(q.text)}</textarea>
      </div>
      ${buildAnswerEditor(q)}
      <div class="form-group">
        <label class="input-label">Explanation (optional)</label>
        <input type="text" class="text-input" placeholder="Why is this the correct answer?" value="${escHtml(q.explanation || '')}"/>
      </div>
    `;

    // Type buttons
    el.querySelectorAll('.qtype-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        q.type = btn.dataset.type;
        if (q.type === 'tf') { q.options = ['True', 'False']; q.correct = 0; }
        else if (q.type === 'mc') { q.options = ['', '', '', '']; q.correct = 0; }
        else { q.options = ['']; q.correct = 0; }
        const allQ = el.closest('#quizQuestionsList').querySelectorAll('.quiz-question-item');
        const i = [...allQ].indexOf(el);
        rebuildQuestionEditor(el, q, i);
      });
    });

    // Question text
    el.querySelector('textarea').addEventListener('input', (e) => { q.text = e.target.value; });

    // Explanation
    el.querySelectorAll('input[type=text]').forEach(inp => {
      inp.addEventListener('input', (e) => { q.explanation = e.target.value; });
    });

    // MC options
    if (q.type === 'mc') {
      el.querySelectorAll('.mc-option .text-input').forEach((inp, i) => {
        inp.addEventListener('input', (e) => { q.options[i] = e.target.value; });
      });
      el.querySelectorAll('.correct-radio').forEach((radio, i) => {
        radio.addEventListener('change', () => { q.correct = i; });
      });
      el.querySelector('.add-mc-option')?.addEventListener('click', () => {
        q.options.push('');
        const allQ = el.closest('#quizQuestionsList').querySelectorAll('.quiz-question-item');
        const i = [...allQ].indexOf(el);
        rebuildQuestionEditor(el, q, i);
      });
    }
    if (q.type === 'tf') {
      el.querySelectorAll('.correct-radio').forEach((radio, i) => {
        radio.addEventListener('change', () => { q.correct = i; });
      });
    }
    if (q.type === 'short') {
      el.querySelectorAll('.text-input')[1]?.addEventListener('input', (e) => { q.options[0] = e.target.value; });
    }

    // Delete (guarded by minimum)
    el.querySelector('.delete').addEventListener('click', () => {
      if (editingQuiz.questions.length <= MIN_QUESTIONS) {
        window.showToast(`Minimum ${MIN_QUESTIONS} questions required`, 'error');
        return;
      }
      editingQuiz.questions = editingQuiz.questions.filter(qq => qq.id !== q.id);
      el.remove();
      // Re-number remaining
      document.querySelectorAll('#quizQuestionsList .question-num').forEach((n, i) => { n.textContent = `Q${i+1}`; });
      updateQuestionCounter();
    });
  }

  function buildAnswerEditor(q) {
    if (q.type === 'mc') {
      const opts = q.options.map((opt, i) => `
        <div class="mc-option">
          <input type="radio" class="correct-radio" name="correct_${q.id}" ${q.correct === i ? 'checked' : ''} title="Mark as correct"/>
          <input type="text" class="text-input" placeholder="Option ${String.fromCharCode(65+i)}" value="${escHtml(opt)}"/>
        </div>
      `).join('');
      return `<div class="form-group"><label class="input-label">Options (select correct)</label>
        <div class="mc-options">${opts}<button class="btn btn-ghost btn-sm add-mc-option">+ Add Option</button></div></div>`;
    }
    if (q.type === 'tf') {
      return `<div class="form-group"><label class="input-label">Correct Answer</label>
        <div class="mc-options">
          <div class="mc-option"><input type="radio" class="correct-radio" name="correct_${q.id}" ${q.correct === 0 ? 'checked' : ''}/><span>True</span></div>
          <div class="mc-option"><input type="radio" class="correct-radio" name="correct_${q.id}" ${q.correct === 1 ? 'checked' : ''}/><span>False</span></div>
        </div></div>`;
    }
    if (q.type === 'short') {
      return `<div class="form-group"><label class="input-label">Correct Answer</label>
        <input type="text" class="text-input" placeholder="The exact correct answer..." value="${escHtml(q.options[0] || '')}"/></div>`;
    }
    return '';
  }

  function saveQuiz() {
    const title = document.getElementById('quizTitle').value.trim();
    if (!title) { window.showToast('Please enter a quiz title', 'error'); return; }
    const filledQuestions = editingQuiz.questions.filter(q => q.text.trim());
    if (filledQuestions.length < MIN_QUESTIONS) {
      window.showToast(`A quiz needs at least ${MIN_QUESTIONS} questions — only ${filledQuestions.length} filled in`, 'error');
      return;
    }
    const incomplete = filledQuestions.some(q => !q.text.trim());
    if (incomplete) { window.showToast('All questions must have text', 'error'); return; }

    // Only save questions that have text filled
    editingQuiz.title     = title;
    editingQuiz.subject   = document.getElementById('quizSubject').value.trim();
    editingQuiz.questions = filledQuestions;

    const existing = quizzes.findIndex(q => q.id === editingQuiz.id);
    if (existing >= 0) quizzes[existing] = editingQuiz;
    else quizzes.unshift(editingQuiz);

    save();
    window.showToast(`Quiz saved with ${filledQuestions.length} questions! 🧠`, 'success');
    showLibrary();
  }

  function deleteQuiz(id) {
    quizzes = quizzes.filter(q => q.id !== id);
    save();
    renderLibrary();
    window.showToast('Quiz deleted', 'info');
  }

  function exportQuiz(id) {
    const quiz = quizzes.find(q => q.id === id);
    if (!quiz) return;
    const blob = new Blob([JSON.stringify(quiz, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${quiz.title.replace(/\s+/g, '_')}.json`;
    a.click();
  }

  // ─── Take Quiz ───────────────────────────────
  function startQuiz(id) {
    activeQuiz = quizzes.find(q => q.id === id);
    if (!activeQuiz) return;
    answers = {};
    qIndex  = 0;
    timerSecs = 0;
    clearInterval(timerIv);
    timerIv = setInterval(() => {
      timerSecs++;
      const el = document.getElementById('quizTimer');
      if (el) el.textContent = `⏱ ${fmt(timerSecs)}`;
    }, 1000);
    document.getElementById('quizTakeName').textContent = activeQuiz.title;
    show('quizTakeView');
    renderQuestion();
  }

  function renderQuestion() {
    const q   = activeQuiz.questions[qIndex];
    const total = activeQuiz.questions.length;
    document.getElementById('quizProgressText').textContent = `Question ${qIndex+1} of ${total}`;
    const pct = ((qIndex) / total) * 100;
    document.getElementById('quizProgressBar').style.width = `${pct}%`;

    const wrap = document.getElementById('quizQuestionWrap');
    wrap.innerHTML = '';

    const qDiv = document.createElement('div');
    qDiv.className = 'quiz-question-wrap';
    qDiv.innerHTML = `<div class="question-text">${escHtml(q.text)}</div>`;

    if (q.type === 'mc' || q.type === 'tf') {
      const optDiv = document.createElement('div');
      optDiv.className = 'answer-options';
      q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'answer-option';
        btn.innerHTML = `<span class="option-letter">${String.fromCharCode(65+i)}</span>${escHtml(opt)}`;
        if (answers[q.id] === i) btn.classList.add('selected');
        btn.addEventListener('click', () => {
          answers[q.id] = i;
          optDiv.querySelectorAll('.answer-option').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        });
        optDiv.appendChild(btn);
      });
      qDiv.appendChild(optDiv);
    } else {
      // Short answer
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'text-input';
      inp.placeholder = 'Type your answer...';
      inp.value = answers[q.id] !== undefined ? answers[q.id] : '';
      inp.addEventListener('input', (e) => { answers[q.id] = e.target.value.trim(); });
      qDiv.appendChild(inp);
    }

    wrap.appendChild(qDiv);

    // Prev / Next
    const prevBtn = document.getElementById('quizPrev');
    const nextBtn = document.getElementById('quizNext');
    prevBtn.style.visibility = qIndex === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = qIndex === activeQuiz.questions.length - 1 ? 'Finish ✅' : 'Next →';
  }

  function finishQuiz() {
    clearInterval(timerIv);
    let correct = 0;
    activeQuiz.questions.forEach(q => {
      if (q.type === 'short') {
        const userAns = (answers[q.id] || '').toLowerCase().trim();
        const rightAns = (q.options[0] || '').toLowerCase().trim();
        if (userAns === rightAns) correct++;
      } else {
        if (answers[q.id] === q.correct) correct++;
      }
    });
    const score = Math.round((correct / activeQuiz.questions.length) * 100);
    // Save score
    const q = quizzes.find(q => q.id === activeQuiz.id);
    if (q) {
      if (!q.scores) q.scores = [];
      q.scores.push(score);
      save();
    }
    showResults(score, correct);
  }

  function showResults(score, correct) {
    const total = activeQuiz.questions.length;
    document.getElementById('scorePercent').textContent    = `${score}%`;
    document.getElementById('resultsQuizName').textContent = activeQuiz.title;
    document.getElementById('resultsSubtitle').textContent =
      `${correct} / ${total} correct — ${timerSecs < 60 ? timerSecs + 's' : Math.floor(timerSecs/60) + 'm ' + (timerSecs%60) + 's'}`;

    // Color score circle
    const circle = document.getElementById('scoreCircle');
    if      (score >= 80) circle.style.background = 'linear-gradient(135deg,#10b981,#06b6d4)';
    else if (score >= 50) circle.style.background = 'linear-gradient(135deg,#f59e0b,#10b981)';
    else                  circle.style.background = 'linear-gradient(135deg,#ef4444,#f59e0b)';

    const breakdown = document.getElementById('resultsBreakdown');
    breakdown.innerHTML = '';
    activeQuiz.questions.forEach((q, i) => {
      let isCorrect;
      let userAnswerText, correctAnswerText;
      if (q.type === 'short') {
        const userAns = (answers[q.id] || '').toLowerCase().trim();
        isCorrect = userAns === (q.options[0] || '').toLowerCase().trim();
        userAnswerText    = answers[q.id] || '(no answer)';
        correctAnswerText = q.options[0] || '';
      } else {
        isCorrect = answers[q.id] === q.correct;
        userAnswerText    = answers[q.id] !== undefined ? q.options[answers[q.id]] : '(no answer)';
        correctAnswerText = q.options[q.correct];
      }
      const item = document.createElement('div');
      item.className = `result-item ${isCorrect ? 'correct' : 'wrong'}`;
      item.innerHTML = `
        <div class="result-q">${isCorrect ? '✅' : '❌'} Q${i+1}: ${escHtml(q.text)}</div>
        <div class="result-a ${isCorrect ? 'correct' : 'wrong'}">Your answer: ${escHtml(userAnswerText)}</div>
        ${!isCorrect ? `<div class="result-a correct">Correct: ${escHtml(correctAnswerText)}</div>` : ''}
        ${q.explanation ? `<div class="result-explanation">💡 ${escHtml(q.explanation)}</div>` : ''}
      `;
      breakdown.appendChild(item);
    });

    show('quizResultsView');
    window.showToast(score >= 80 ? `Excellent! ${score}% 🎉` : score >= 50 ? `Good job! ${score}% 👍` : `Keep practicing! ${score}% 💪`, 'info');
  }

  function fmt(secs) {
    const m = Math.floor(secs/60).toString().padStart(2,'0');
    const s = (secs%60).toString().padStart(2,'0');
    return `${m}:${s}`;
  }

  // ─── Public API ──────────────────────────────
  window.quizModule = { showLibrary };

  // ─── Init ────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    load();

    document.getElementById('openCreateQuiz')?.addEventListener('click', openCreate);
    document.getElementById('backToLibrary')?.addEventListener('click', showLibrary);
    document.getElementById('backToLibraryFromResults')?.addEventListener('click', showLibrary);
    document.getElementById('saveQuiz')?.addEventListener('click', saveQuiz);
    document.getElementById('addQuestion')?.addEventListener('click', () => {
      addQuestion();
    });

    document.getElementById('quizPrev')?.addEventListener('click', () => {
      if (qIndex > 0) { qIndex--; renderQuestion(); }
    });
    document.getElementById('quizNext')?.addEventListener('click', () => {
      if (qIndex < activeQuiz.questions.length - 1) { qIndex++; renderQuestion(); }
      else finishQuiz();
    });
    document.getElementById('retakeQuiz')?.addEventListener('click', () => {
      if (activeQuiz) startQuiz(activeQuiz.id);
    });

    renderLibrary();
  });
})();
