# Study Planner App 

A fully-featured, single-page study productivity web app built with **HTML, CSS (Vanilla), and JavaScript** — no frameworks, no backend required. All data persists via `localStorage`.

---

## Overview

| Feature | Description |
|---|---|
| 📋 **Todo List** | Task management with priorities, due dates, and completion tracking |
| 🍅 **Pomodoro Timer** | Customizable work/break intervals with session history |
| 🔔 **Reminders** | Date/time-based browser notifications for tasks and study sessions |
| 🧠 **Quiz Maker** | Create, take, and score custom quizzes with multiple question types |
| 🃏 **Flashcards** | Deck-based flashcard study with flip animations and spaced repetition |

---

## Tech Stack

- **HTML5** — Semantic structure, single `index.html`
- **Vanilla CSS** — Custom design system, dark mode, glassmorphism, animations
- **Vanilla JavaScript** — Modular JS (ES6+, no bundler needed), localStorage persistence
- **Web Notifications API** — For reminders
- **Google Fonts** — `Inter` or `Outfit` for premium typography

---

## Proposed File Structure

```
capstore/
├── index.html          # Main shell with all sections
├── css/
│   ├── index.css       # Global design system, tokens, typography, layout
│   ├── sidebar.css     # Navigation sidebar
│   ├── todo.css        # Todo list styles
│   ├── pomodoro.css    # Pomodoro timer styles
│   ├── reminders.css   # Reminders styles
│   ├── quiz.css        # Quiz maker styles
│   └── flashcard.css   # Flashcard styles
└── js/
    ├── app.js          # App entry point, routing, theme toggle
    ├── todo.js         # Todo module (CRUD, filtering, priorities)
    ├── pomodoro.js     # Pomodoro timer, work/break cycles, sounds
    ├── reminders.js    # Reminder CRUD, notification scheduling
    ├── quiz.js         # Quiz creation, quiz taking, scoring
    └── flashcard.js    # Deck management, card flip, spaced repetition
```
flowchart LR
    Setup --> Subjects
    Subjects --> Todos
    Todos --> Pomodoro
    Todos --> Reminders
    Subjects --> Flashcards
    Subjects --> Quizzes
    Flashcards -.-> Quizzes
    Pomodoro --> Dashboard
    Todos --> Dashboard
    Flashcards --> Dashboard
    Reminders --> Dashboard

---

## Design System

- **Color Palette**: Deep navy (`#0f0f1a`) background, vibrant violet (`#7c3aed`) primary, electric cyan (`#06b6d4`) accent
- **Dark mode first** with glassmorphism cards (`backdrop-filter: blur`)
- **Sidebar navigation** with icon + label, active state glow
- **Micro-animations**: Card hover lifts, button ripples, page transitions, timer pulse
- **Typography**: `Outfit` from Google Fonts (weights 300–700)

---

## Feature Details

### 📋 Todo List
- Add tasks with: title, description, priority (low/medium/high), due date, category/tag
- Filter by: All / Active / Completed / Priority / Category
- Sort by: Due date, priority, creation date
- Mark complete (strikethrough + confetti animation)
- Delete / edit tasks inline
- Progress bar (X of Y tasks completed today)

### 🍅 Pomodoro Timer
- Default: 25min work → 5min short break → 15min long break (every 4 cycles)
- Configurable durations via settings panel
- Animated circular countdown ring (SVG-based)
- Sound alerts (using Web Audio API) on session end
- Session log: daily history of completed pomodoros
- Integration: link a Todo task to the active session

### 🔔 Reminders
- Create reminders with title, note, date, time, repeat option (once/daily/weekly)
- Badge counter on sidebar nav icon
- Browser `Notification` API for push-style alerts
- Fallback in-app toast if notifications denied
- Upcoming reminders list sorted by time

### 🧠 Quiz Maker
- **Create mode**: Add questions (Multiple Choice, True/False, Short Answer)
- **Quiz mode**: Take quiz with timer per question, progress bar
- **Results screen**: Score summary, correct/incorrect breakdown, explanations
- Save multiple quiz sets to localStorage
- Import/Export quiz as JSON

### 🃏 Flashcards
- Create **decks** with a name and color tag
- Add cards with **front** (question) and **back** (answer), supports markdown-lite formatting
- **Study mode**: Flip animation (3D CSS transform), keyboard navigation (arrows)
- **Spaced repetition**: Rate each card (Again / Hard / Good / Easy) — cards resurface based on rating
- Progress tracker per deck (% mastered)

---

## Implementation Phases

### Phase 1 — Foundation & Layout
- `index.html` shell, sidebar navigation
- `index.css` global design system (tokens, typography, layout, utilities)
- `app.js` routing (show/hide sections), theme initialization

### Phase 2 — Todo List
- `todo.css` + `todo.js`
- Full CRUD, filtering, sorting, localStorage

### Phase 3 — Pomodoro Timer
- `pomodoro.css` + `pomodoro.js`
- SVG ring animation, Web Audio alerts, session log

### Phase 4 — Reminders
- `reminders.css` + `reminders.js`
- Notification API, toast fallback, repeat logic

### Phase 5 — Quiz Maker
- `quiz.css` + `quiz.js`
- Create/take/score quizzes, import/export JSON

### Phase 6 — Flashcards
- `flashcard.css` + `flashcard.js`
- Deck management, card flip, spaced repetition rating

### Phase 7 — Polish & Integration
- Cross-feature links (e.g. Todo → Pomodoro, Reminders → Todo)
- Responsive layout (mobile-friendly sidebar collapses to bottom nav)
- Final micro-animation pass, SEO meta tags

---

## Verification Plan

### Manual Verification
- Test all CRUD operations across all modules
- Verify localStorage persistence across page refreshes
- Test Notification API permission flow and toast fallback
- Verify Pomodoro timer accuracy and audio alerts
- Test quiz scoring for all question types
- Test flashcard 3D flip and spaced repetition logic
- Responsive check on mobile viewport

### Automated (Browser Console)
- Inspect `localStorage` keys to verify data integrity
- Check for JS console errors across all views

---

> [!IMPORTANT]
> All data is stored in **localStorage** — no backend required. The app runs entirely in the browser from the local filesystem or any static host.

> [!TIP]
> After approval, the build will be deployed into `c:\Users\donne\OneDrive\Desktop\capstore\` and can be opened directly via `index.html` in any browser.
