/* =============================================
   FLASHCARD.JS — Flashcard Module
   ============================================= */

'use strict';

(function FlashcardModule() {
  const LS_KEY = 'sf_decks';
  let decks       = [];
  let editingDeck = null;
  let studyDeck   = null;
  let studyCards  = [];
  let cardIndex   = 0;
  let isFlipped   = false;
  let selectedColor = '#7c3aed';

  // ─── Storage ─────────────────────────────────
  const load = () => { try { decks = JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { decks = []; } };
  const save = () => localStorage.setItem(LS_KEY, JSON.stringify(decks));
  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
  const escHtml = (s) => { const d = document.createElement('div'); d.appendChild(document.createTextNode(s)); return d.innerHTML; };

  // ─── Views ───────────────────────────────────
  function showDecks() {
    setView('deckLibraryView');
    renderDeckGrid();
  }
  function showEdit() { setView('deckEditView'); }
  function showStudy() { setView('flashcardStudyView'); }
  function setView(id) {
    ['deckLibraryView','deckEditView','flashcardStudyView'].forEach(v => {
      document.getElementById(v).style.display = v === id ? 'block' : 'none';
    });
  }

  // ─── Deck Library ────────────────────────────
  function renderDeckGrid() {
    const grid  = document.getElementById('deckGrid');
    const empty = document.getElementById('deckEmpty');
    grid.querySelectorAll('.deck-card').forEach(el => el.remove());

    if (decks.length === 0) { empty.style.display = 'block'; return; }
    empty.style.display = 'none';

    decks.forEach(deck => {
      const mastered  = deck.cards.filter(c => (c.ratings?.easy || 0) >= 2).length;
      const masteryPct = deck.cards.length > 0 ? Math.round((mastered / deck.cards.length) * 100) : 0;

      const card = document.createElement('div');
      card.className = 'deck-card';
      card.style.background = `linear-gradient(135deg, ${deck.color}, ${shadeColor(deck.color, -30)})`;
      card.innerHTML = `
        <div class="deck-card-header">
          <span class="deck-card-icon">🃏</span>
          <div class="deck-card-actions">
            <button class="deck-card-action edit-deck" title="Edit">✏️</button>
            <button class="deck-card-action delete-deck" title="Delete">🗑️</button>
          </div>
        </div>
        <div>
          <div class="deck-card-name">${escHtml(deck.name)}</div>
          <div class="deck-card-count">${deck.cards.length} card${deck.cards.length !== 1 ? 's' : ''}</div>
          <div class="deck-mastery-bar">
            <div class="deck-mastery-fill" style="width:${masteryPct}%"></div>
          </div>
          <div class="deck-mastery-text">${masteryPct}% mastered</div>
        </div>
      `;
      card.addEventListener('click', () => openStudy(deck.id));
      card.querySelector('.edit-deck').addEventListener('click', (e) => { e.stopPropagation(); openEdit(deck.id); });
      card.querySelector('.delete-deck').addEventListener('click', (e) => { e.stopPropagation(); deleteDeck(deck.id); });
      grid.appendChild(card);
    });
  }

  function shadeColor(col, amt) {
    let usePound = false;
    if (col[0] === '#') { col = col.slice(1); usePound = true; }
    const num = parseInt(col, 16);
    let r = (num >> 16) + amt;
    let g = ((num >> 8) & 0x00FF) + amt;
    let b = (num & 0x0000FF) + amt;
    r = r < 0 ? 0 : r > 255 ? 255 : r;
    g = g < 0 ? 0 : g > 255 ? 255 : g;
    b = b < 0 ? 0 : b > 255 ? 255 : b;
    return (usePound ? '#' : '') + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  // ─── Edit Deck ───────────────────────────────
  function openCreate() {
    editingDeck = { id: genId(), name: '', color: '#7c3aed', cards: [], createdAt: Date.now() };
    document.getElementById('deckNameInput').value = '';
    document.getElementById('deckEditTitle').textContent = 'New Deck';
    selectedColor = '#7c3aed';
    updateColorPicker();
    renderCardEditors();
    showEdit();
    addFlashcard(); // start with one card
  }

  function openEdit(id) {
    const deck = decks.find(d => d.id === id);
    if (!deck) return;
    editingDeck = JSON.parse(JSON.stringify(deck));
    document.getElementById('deckNameInput').value = deck.name;
    document.getElementById('deckEditTitle').textContent = 'Edit Deck';
    selectedColor = deck.color;
    updateColorPicker();
    renderCardEditors();
    showEdit();
  }

  function updateColorPicker() {
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.color === selectedColor);
    });
  }

  function renderCardEditors() {
    const list = document.getElementById('flashcardsList');
    list.innerHTML = '';
    editingDeck.cards.forEach((c, i) => appendCardEditor(c, i));
  }

  function appendCardEditor(card, idx) {
    const list = document.getElementById('flashcardsList');
    const el = document.createElement('div');
    el.className = 'flashcard-edit-item';
    el.dataset.cid = card.id;
    el.innerHTML = `
      <span class="flashcard-edit-num">#${idx + 1}</span>
      <div class="flashcard-edit-fields">
        <input type="text" class="text-input" placeholder="Front (Question)" value="${escHtml(card.front)}" data-side="front"/>
        <input type="text" class="text-input" placeholder="Back (Answer)" value="${escHtml(card.back)}" data-side="back"/>
      </div>
      <button class="task-action-btn delete" title="Remove card">🗑️</button>
    `;
    el.querySelector('[data-side=front]').addEventListener('input', (e) => { card.front = e.target.value; });
    el.querySelector('[data-side=back]').addEventListener('input', (e) => { card.back  = e.target.value; });
    el.querySelector('.delete').addEventListener('click', () => {
      editingDeck.cards = editingDeck.cards.filter(c => c.id !== card.id);
      el.remove();
      // Re-number
      document.querySelectorAll('.flashcard-edit-num').forEach((n, i) => { n.textContent = `#${i+1}`; });
    });
    list.appendChild(el);
  }

  function addFlashcard() {
    const card = { id: genId(), front: '', back: '', ratings: { again: 0, hard: 0, good: 0, easy: 0 } };
    editingDeck.cards.push(card);
    appendCardEditor(card, editingDeck.cards.length - 1);
  }

  function saveDeck() {
    const name = document.getElementById('deckNameInput').value.trim();
    if (!name) { window.showToast('Please enter a deck name', 'error'); return; }
    const validCards = editingDeck.cards.filter(c => c.front.trim() && c.back.trim());
    if (validCards.length === 0) { window.showToast('Add at least one complete card', 'error'); return; }

    editingDeck.name  = name;
    editingDeck.color = selectedColor;
    editingDeck.cards = validCards;

    const idx = decks.findIndex(d => d.id === editingDeck.id);
    if (idx >= 0) decks[idx] = editingDeck;
    else decks.unshift(editingDeck);

    save();
    window.showToast('Deck saved! 🃏', 'success');
    showDecks();
  }

  function deleteDeck(id) {
    decks = decks.filter(d => d.id !== id);
    save();
    renderDeckGrid();
    window.showToast('Deck deleted', 'info');
  }

  // ─── Study Mode ──────────────────────────────
  function openStudy(id) {
    const deck = decks.find(d => d.id === id);
    if (!deck || deck.cards.length === 0) {
      window.showToast('No cards in this deck yet!', 'error'); return;
    }
    studyDeck  = deck;
    studyCards = shuffleArray([...deck.cards]);
    cardIndex  = 0;
    isFlipped  = false;
    document.getElementById('studyDeckName').textContent = deck.name;
    showStudy();
    renderStudyCard();
  }

  function renderStudyCard() {
    const card = studyCards[cardIndex];
    isFlipped  = false;

    // Reset flip
    const inner = document.getElementById('flashcardInner');
    if (inner) inner.classList.remove('flipped');

    document.getElementById('cardFrontContent').textContent = card.front;
    document.getElementById('cardBackContent').textContent  = card.back;
    document.getElementById('flipHint').style.display = 'block';
    document.getElementById('ratingButtons').style.display = 'none';

    // Progress
    const pct = cardIndex / studyCards.length * 100;
    document.getElementById('studyProgressFill').style.width = `${pct}%`;
    document.getElementById('studyProgressLabel').textContent = `Card ${cardIndex+1} of ${studyCards.length}`;
    document.getElementById('studyCardCount').textContent     = `${cardIndex+1} / ${studyCards.length}`;
  }

  function flipCard() {
    const inner = document.getElementById('flashcardInner');
    if (!inner) return;
    isFlipped = !isFlipped;
    inner.classList.toggle('flipped', isFlipped);
    if (isFlipped) {
      document.getElementById('flipHint').style.display    = 'none';
      document.getElementById('ratingButtons').style.display = 'flex';
    } else {
      document.getElementById('flipHint').style.display    = 'block';
      document.getElementById('ratingButtons').style.display = 'none';
    }
  }

  function rateCard(rating) {
    const card = studyCards[cardIndex];
    // Update ratings in the actual deck
    const deckCard = studyDeck.cards.find(c => c.id === card.id);
    if (deckCard) {
      if (!deckCard.ratings) deckCard.ratings = { again: 0, hard: 0, good: 0, easy: 0 };
      deckCard.ratings[rating] = (deckCard.ratings[rating] || 0) + 1;
      save();
    }
    // Spaced repetition: put 'again' and 'hard' cards back into the queue
    if (rating === 'again') {
      const removed = studyCards.splice(cardIndex, 1)[0];
      const insertAt = Math.min(cardIndex + 2, studyCards.length);
      studyCards.splice(insertAt, 0, removed);
    } else {
      cardIndex++;
    }

    if (cardIndex >= studyCards.length) {
      showStudyComplete();
      return;
    }
    renderStudyCard();
  }

  function showStudyComplete() {
    const studyArea = document.querySelector('.flashcard-study-area');
    if (!studyArea) return;
    studyArea.innerHTML = `
      <div class="study-complete glass-card">
        <div class="complete-emoji">🎉</div>
        <h2>Deck Complete!</h2>
        <p>You've reviewed all cards in <strong>${escHtml(studyDeck.name)}</strong>.</p>
        <div style="margin-top:1.5rem; display:flex; gap:1rem; justify-content:center;">
          <button class="btn btn-secondary" id="restartStudy">🔄 Study Again</button>
          <button class="btn btn-primary" id="exitStudyBtn">📚 Back to Decks</button>
        </div>
      </div>
    `;
    document.getElementById('restartStudy')?.addEventListener('click', () => openStudy(studyDeck.id));
    document.getElementById('exitStudyBtn')?.addEventListener('click', showDecks);
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ─── Public API ──────────────────────────────
  window.flashcardModule = { showDecks };

  // ─── Init ────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    load();

    document.getElementById('openCreateDeck')?.addEventListener('click', openCreate);
    document.getElementById('backToDeckLibrary')?.addEventListener('click', showDecks);
    document.getElementById('addFlashcard')?.addEventListener('click', addFlashcard);
    document.getElementById('saveDeck')?.addEventListener('click', saveDeck);
    document.getElementById('startStudyDeck')?.addEventListener('click', () => {
      if (editingDeck) openStudy(editingDeck.id);
    });

    // Color picker
    document.getElementById('deckColorPicker')?.addEventListener('click', (e) => {
      const dot = e.target.closest('.color-dot');
      if (!dot) return;
      selectedColor = dot.dataset.color;
      if (editingDeck) editingDeck.color = selectedColor;
      updateColorPicker();
    });

    // Study card flip
    document.getElementById('flashcard3d')?.addEventListener('click', flipCard);
    document.addEventListener('keydown', (e) => {
      const studyView = document.getElementById('flashcardStudyView');
      if (!studyView || studyView.style.display === 'none') return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipCard(); }
      if (e.key === 'ArrowRight') {
        if (isFlipped) { rateCard('good'); return; }
        if (cardIndex < studyCards.length - 1) { cardIndex++; renderStudyCard(); }
      }
      if (e.key === 'ArrowLeft') {
        if (cardIndex > 0) { cardIndex--; renderStudyCard(); }
      }
    });

    // Rating buttons
    document.getElementById('ratingButtons')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.rating-btn');
      if (!btn) return;
      rateCard(btn.dataset.rating);
    });

    // Study nav
    document.getElementById('studyPrev')?.addEventListener('click', () => {
      if (cardIndex > 0) { cardIndex--; renderStudyCard(); }
    });
    document.getElementById('studyNext')?.addEventListener('click', () => {
      if (cardIndex < studyCards.length - 1) { cardIndex++; renderStudyCard(); }
    });
    document.getElementById('exitStudy')?.addEventListener('click', showDecks);

    renderDeckGrid();
  });
})();
