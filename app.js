/* ============================================================
   GLOBAL STATE + TOPICS REGISTRY (DYNAMIC)
============================================================ */

console.log("✅ app.js loaded");

let currentTopic = "people";
let currentIndex = 0;
let forcedReviewOnly = false;

const STATS_KEY = "flashcards_stats_v2";
const THEME_KEY = "theme_preference_v1";

let stats = {}; // { topic: { learned, reviewed } }

// Registry shared across pages (index/topics/stats)
window.__TOPICS_REGISTRY__ = [];

/** Register a topic dataset safely */
function registerTopic(dataset) {
  if (!dataset || !dataset.topic || !Array.isArray(dataset.items)) return;
  window.__TOPICS_REGISTRY__.push({
    topic: dataset.topic,
    level: dataset.level || "A1",
    label: dataset.label || dataset.topic,
    items: dataset.items
  });
}

// Auto-register available datasets
registerTopic(window.A1People);
registerTopic(window.A1Food);

// If more datasets exist later, you just add:
// registerTopic(window.A1House); etc.

/* ============================================================
   THEME (DARK/LIGHT + CLICK SOUND)
============================================================ */

function applyTheme(theme) {
  const html = document.documentElement;
  const isDark = theme === "dark";
  html.classList.toggle("dark", isDark);
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
}

(function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") {
    applyTheme(saved);
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
  }

  // react to OS theme change
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    const savedNow = localStorage.getItem(THEME_KEY);
    if (!savedNow) applyTheme(e.matches ? "dark" : "light");
  });
})();

const themeBtn = document.getElementById("theme-toggle");
let clickSound = null;

try {
  clickSound = new Audio("sounds/toggle.mp3");
} catch (_) {}

function playClick() {
  if (!clickSound) return;
  clickSound.currentTime = 0;
  clickSound.play().catch(() => {});
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  applyTheme(isDark ? "light" : "dark");
  playClick();
}

if (themeBtn) {
  themeBtn.addEventListener("click", toggleTheme);
}

/* ============================================================
   STATS LOAD / SAVE (DYNAMIC BY TOPIC)
============================================================ */

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    stats = (parsed && typeof parsed === "object") ? parsed : {};
  } catch {
    stats = {};
  }
}

function saveStats() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

function ensureTopicStats(topic) {
  if (!stats[topic]) stats[topic] = { learned: 0, reviewed: 0 };
  return stats[topic];
}

loadStats();

/* ============================================================
   HELPERS
============================================================ */

function getCurrentDataset() {
  return window.__TOPICS_REGISTRY__.find(t => t.topic === currentTopic)
      || window.__TOPICS_REGISTRY__[0];
}

function getCurrentItems() {
  const d = getCurrentDataset();
  return d ? d.items : [];
}

function updateFlashcardsTitle() {
  const titleEl = document.getElementById("flashcards-title");
  if (!titleEl) return;
  const d = getCurrentDataset();
  titleEl.textContent = d ? `Flashcards – ${d.label}` : "Flashcards";
}

/* ============================================================
   SRS ACTIONS
============================================================ */

function getFutureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function markLearned(item) {
  item.status = "learned";
  item.nextReview = getFutureDate(7);
  ensureTopicStats(currentTopic).learned += 1;
  saveStats();
}

function markReview(item) {
  item.status = "review";
  item.nextReview = getFutureDate(2);
  ensureTopicStats(currentTopic).reviewed += 1;
  saveStats();
}

/* ============================================================
   SWIPE (TOUCH + MOUSE)
============================================================ */

function addSwipe(card, item) {
  let startX = 0;
  let currentX = 0;
  let isDragging = false;
  const threshold = 70;

  function setTransform(x) {
    card.style.transform = `translateX(${x}px) rotate(${x / 20}deg)`;
  }

  function resetPosition() {
    card.style.transition = "transform 0.2s ease";
    setTransform(0);
    setTimeout(() => (card.style.transition = ""), 200);
  }

  function finishSwipe() {
    if (currentX > threshold) {
      markLearned(item);
      card.style.transition = "transform 0.25s ease";
      setTransform(320);
      setTimeout(showNextCard, 260);
    } else if (currentX < -threshold) {
      markReview(item);
      card.style.transition = "transform 0.25s ease";
      setTransform(-320);
      setTimeout(showNextCard, 260);
    } else {
      resetPosition();
    }

    currentX = 0;
    isDragging = false;
  }

  // Touch
  card.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    isDragging = true;
  });

  card.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    currentX = e.touches[0].clientX - startX;
    setTransform(currentX);
  });

  card.addEventListener("touchend", () => {
    if (!isDragging) return;
    finishSwipe();
  });

  // Mouse
  card.addEventListener("mousedown", (e) => {
    startX = e.clientX;
    isDragging = true;
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    currentX = e.clientX - startX;
    setTransform(currentX);
  });

  window.addEventListener("mouseup", () => {
    if (!isDragging) return;
    finishSwipe();
  });
}

/* ============================================================
   FLOW
============================================================ */

function showNextCard() {
  const allItems = getCurrentItems();

  const list = forcedReviewOnly
    ? allItems.filter(i => i.status === "review")
    : allItems;

  if (!list.length) {
    renderFlashcards();
    return;
  }

  currentIndex = (currentIndex + 1) % list.length;
  renderFlashcards();
}

function showEmptyMessage(msg) {
  const container = document.querySelector(".flashcard-container");
  if (!container) return;
  container.innerHTML = `<p>${msg}</p>`;
}

/* ============================================================
   RENDER FLASHCARDS
============================================================ */

function renderFlashcards() {
  const container = document.querySelector(".flashcard-container");
  if (!container) return;

  container.innerHTML = "";

  const allItems = getCurrentItems();
  if (!allItems.length) {
    showEmptyMessage("No words in this topic yet.");
    return;
  }

  const items = forcedReviewOnly
    ? allItems.filter(i => i.status === "review")
    : allItems;

  if (!items.length) {
    showEmptyMessage("No words marked as REVIEW in this topic.");
    return;
  }

  if (currentIndex >= items.length) currentIndex = 0;

  const item = items[currentIndex];
  updateFlashcardsTitle();

  const s = ensureTopicStats(currentTopic);
  const total = allItems.length;
  const learned = s.learned || 0;
  const reviewed = s.reviewed || 0;
  const reviewCount = allItems.filter(i => i.status === "review").length;
  const actionsTotal = learned + reviewed;

  const progressPercent = total ? Math.round((learned / total) * 100) : 0;
  const accuracyPercent = actionsTotal ? Math.round((learned / actionsTotal) * 100) : 0;

  const progress = document.createElement("div");
  progress.className = "flashcard-progress";
  progress.innerHTML = `
    <div class="progress-bar">
      <div class="progress-bar-fill" style="width:${progressPercent}%;"></div>
    </div>
    <p class="progress-text">
      Learned: <strong>${learned}</strong> / <strong>${total}</strong> (${progressPercent}%)
    </p>
    <p class="progress-text">
      Accuracy: <strong>${accuracyPercent}%</strong>
    </p>
    <p class="progress-text">
      In REVIEW: <strong>${reviewCount}</strong>
    </p>
  `;
  container.appendChild(progress);

  const card = document.createElement("div");
  card.className = "flashcard";
  card.dataset.id = item.id;

  card.innerHTML = `
    <div class="flashcard-face flashcard-front">
      <span class="flashcard-number">#${item.id}</span>
      <p class="flashcard-label">Front</p>
      <p class="flashcard-word">${item.word}</p>
      <p class="flashcard-hint">Tap to see translation</p>
    </div>
    <div class="flashcard-face flashcard-back">
      <span class="flashcard-number">#${item.id}</span>
      <p class="flashcard-label">Back</p>
      <p class="flashcard-word">${item.translation}</p>
      <p class="flashcard-example">
        ${item.exampleEn}<br />
        <span class="example-pt">${item.examplePt}</span>
      </p>
    </div>
  `;

  addSwipe(card, item);
  container.appendChild(card);

  card.addEventListener("click", () => {
    card.classList.toggle("flipped");
  });

  const actions = document.createElement("div");
  actions.className = "flashcard-actions";

  const btnReview = document.createElement("button");
  btnReview.className = "card-btn card-btn-left";
  btnReview.textContent = "⟵ Review";

  const btnLearned = document.createElement("button");
  btnLearned.className = "card-btn card-btn-right";
  btnLearned.textContent = "Learned ⟶";

  btnReview.addEventListener("click", () => {
    markReview(item);
    showNextCard();
  });

  btnLearned.addEventListener("click", () => {
    markLearned(item);
    showNextCard();
  });

  actions.append(btnReview, btnLearned);
  container.appendChild(actions);

  // reset
  const resetWrapper = document.createElement("div");
  resetWrapper.className = "flashcard-reset-wrapper";

  const btnReset = document.createElement("button");
  btnReset.className = "card-btn-reset";
  btnReset.textContent = "Reset progress for this topic";

  btnReset.addEventListener("click", () => {
    allItems.forEach(i => {
      i.status = "new";
      i.nextReview = null;
    });
    stats[currentTopic] = { learned: 0, reviewed: 0 };
    forcedReviewOnly = false;
    currentIndex = 0;
    saveStats();
    renderFlashcards();
  });

  resetWrapper.appendChild(btnReset);
  container.appendChild(resetWrapper);
}

/* ============================================================
   UI BUTTONS / SECTIONS (HOME PAGE)
============================================================ */

const btnFlashcards = document.getElementById("btn-flashcards");
const btnExercises  = document.getElementById("btn-exercises");
const sectionFlashcards = document.getElementById("section-flashcards");
const sectionExercises  = document.getElementById("section-exercises");
const topicSelect = document.getElementById("topic-select");
const btnReviewMode = document.getElementById("btn-review-mode");

function showSection(section) {
  if (!sectionFlashcards || !sectionExercises) return;
  sectionFlashcards.classList.add("hidden");
  sectionExercises.classList.add("hidden");

  section.classList.remove("hidden");
  window.scrollTo({ top: section.offsetTop - 20, behavior: "smooth" });
}

if (btnFlashcards) {
  btnFlashcards.addEventListener("click", () => {
    forcedReviewOnly = false;
    currentIndex = 0;
    renderFlashcards();
    showSection(sectionFlashcards);
  });
}

if (btnExercises) {
  btnExercises.addEventListener("click", () => showSection(sectionExercises));
}

if (topicSelect) {
  // fill select dynamically
  topicSelect.innerHTML = window.__TOPICS_REGISTRY__.map(t =>
    `<option value="${t.topic}">${t.label}</option>`
  ).join("");

  topicSelect.addEventListener("change", () => {
    currentTopic = topicSelect.value;
    forcedReviewOnly = false;
    currentIndex = 0;
    renderFlashcards();
  });
}

if (btnReviewMode) {
  btnReviewMode.addEventListener("click", () => {
    forcedReviewOnly = !forcedReviewOnly;
    btnReviewMode.classList.toggle("active", forcedReviewOnly);
    currentIndex = 0;
    renderFlashcards();
  });
}

// load topic from URL (?tema=people)
const params = new URLSearchParams(window.location.search);
const topicFromUrl = params.get("tema");
if (topicFromUrl) {
  currentTopic = topicFromUrl;
  renderFlashcards();
  if (sectionFlashcards) showSection(sectionFlashcards);
}