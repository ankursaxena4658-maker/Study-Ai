# 📚 StudyAI Pro — v3.0

> Full-stack AI study assistant powered by **Groq** (llama-3.3-70b) — 10× faster than OpenAI, free tier.

---

## ⚡ Quick Start

```bash
# 1. Install
npm install

# 2. Get free API key → https://console.groq.com
cp .env.example .env
# Edit .env → add GROQ_API_KEY

# 3. Run
npm start
# Open: http://localhost:3000
```

---

## ✨ Features

### 7 AI Tools
- 📄 **Summary** — structured summaries with key points & terms
- 🃏 **Flashcards** — spaced-repetition with Know/Again
- 🎯 **Quiz** — MCQs with instant feedback & explanations
- 💬 **Ask Doubt** — step-by-step AI tutor answers
- 🧠 **Mind Map** — animated canvas visualization, save PNG
- 📖 **Vocabulary** — definitions, examples, memory tips
- ✏️ **Fill in Blank** — cloze deletion active recall

### Design & UX
- 5 themes: Midnight, Aurora, Obsidian, Paper, Neon
- Animated particle background + mesh blobs
- Glassmorphism cards with shimmer effects
- Scroll-reveal animations on every element
- Typewriter effect on answers
- Animated ring timer for Pomodoro

### Productivity
- ⏱️ **Pomodoro Timer** — animated SVG ring, session log
- 📅 **Study Planner** — day-by-day AI schedule
- 📊 **Progress** — bar charts + 28-day heatmap
- 🏆 **Achievements** — 15 badges (Common/Rare/Legendary)
- ⚡ **XP System** — 6 levels from Freshman to Professor
- 🔥 **Streak Tracker** — daily study habit

### Power Features
- ⌘ **Command Palette** (Ctrl+K)
- 🤖 **AI Chat** — floating assistant bubble
- 🎙️ **Voice Input** — Web Speech API
- 📄 **PDF Upload** — drag & drop extraction
- 🌙 **Focus Mode** — fullscreen distraction-free timer
- 📱 **PWA** — installable as mobile/desktop app
- 🔄 **Notes Sync** — shared across all AI tools

---

## 📁 Structure

```
studyai/
├── server.js           ← Express + Groq backend (11 routes)
├── package.json
├── .env                ← Your API key
└── public/
    ├── index.html      ← Complete SPA (single file)
    ├── manifest.json   ← PWA manifest
    ├── sw.js           ← Service worker
    └── icon.svg        ← App icon
```

---

## 🔌 API Routes

| POST | Description |
|------|-------------|
| `/api/summarize` | Structured summary |
| `/api/flashcards` | Flashcard set |
| `/api/quiz` | MCQ quiz |
| `/api/doubt` | Question answer |
| `/api/mindmap` | Mind map data |
| `/api/planner` | Study schedule |
| `/api/vocab` | Vocabulary extraction |
| `/api/fillblank` | Fill-in-blank exercises |
| `/api/chat` | Chat messages |
| `/api/upload-pdf` | PDF text extraction |

---

## 🛠️ Stack

| Layer | Tech |
|-------|------|
| AI | Groq — llama-3.3-70b-versatile |
| Backend | Node.js + Express |
| Frontend | Vanilla HTML/CSS/JS (zero frameworks) |
| Fonts | Bricolage Grotesque + DM Sans + Space Grotesk |
| Storage | localStorage |
| Offline | Service Worker PWA |
