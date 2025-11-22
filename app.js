/* ============================================================
   app.js — CLEAN + DYNAMIC + UI ENGLISH
   - Theme toggle (auto + saved)
   - Topics registry (A1/A2/Random/Mega)
   - Flashcards SRS
   - Stats v2 (dynamic totals)
============================================================ */

console.log("✅ app.js loaded");

/* ============================================================
   THEME (Dark/Light) + optional click sound
============================================================ */
const THEME_KEY = "theme_preference_v1";

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("dark", isDark);
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

  // if system changes (only if user didn't lock preference)
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
    const savedNow = localStorage.getItem(THEME_KEY);
    if (!savedNow) {
      applyTheme(e.matches ? "dark" : "light");
    }
  });
})();

const themeBtn = document.getElementById("theme-toggle");
let clickSound = null;
try { clickSound = new Audio("sounds/toggle.mp3"); } catch {}

function playClick() {
  if (!clickSound) return;
  clickSound.currentTime = 0;
  clickSound.play().catch(() => {});
}

if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    const isDark = document.documentElement.classList.contains("dark");
    applyTheme(isDark ? "light" : "dark");
    playClick();
  });
}

/* ============================================================
   TOPICS REGISTRY (automatic)
   Any file that sets window.<Something> = { level, topic, label?, items }
   should be registered here to show on Topics + Stats.
============================================================ */
const __TOPICS_REGISTRY__ = [];
window.__TOPICS_REGISTRY__ = __TOPICS_REGISTRY__;

function registerTopic(obj, fallbackLabel) {
  if (!obj || !obj.items || !Array.isArray(obj.items)) return;

  // normalize
  const level = obj.level || "A1";
  const topic = obj.topic || "unknown";
  const label = obj.label || fallbackLabel || `${level.toUpperCase()} - ${topic}`;

  // avoid duplicates
  const exists = __TOPICS_REGISTRY__.some(t => t.level === level && t.topic === topic);
  if (exists) return;

  __TOPICS_REGISTRY__.push({
    level,
    topic,
    label,
    items: obj.items
  });
}

// Register known globals if they exist
registerTopic(window.A1People, "A1 - People");
registerTopic(window.A1Food, "A1 - Food");
registerTopic(window.A2People, "A2 - People");
registerTopic(window.A2Food, "A2 - Food");
registerTopic(window.A1Random, "A1 Random (Daily)");
registerTopic(window.MegaDeckA1A2, "Mega Deck A1 + A2");

// sort nice in UI
__TOPICS_REGISTRY__.sort((a,b) => (a.level + a.topic).localeCompare(b.level + b.topic));


/* ============================================================
   GLOBAL STATE
============================================================ */
let currentTopic = "people";  // default
let currentLevel = "A1";      // default
let currentIndex = 0;

const STATS_KEY = "flashcards_stats_v2"; // unified stats key
let stats = {}; // { topicName: {learned, reviewed} }

let forcedReviewOnly = false;


/* ============================================================
   STATS: LOAD / SAVE
============================================================ */
function loadStats() {
  try {
    stats = JSON.parse(localStorage.getItem(STATS_KEY) || "{}");
    if (!stats || typeof stats !== "object") stats = {};
  } catch {
    stats = {};
  }
}
function saveStats() {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}
loadStats();

function ensureTopicStats(topic) {
  if (!stats[topic]) stats[topic] = { learned: 0, reviewed: 0 };
  return stats[topic];
}


/* ============================================================
   HELPERS
============================================================ */
function getTopicObject(level, topic) {
  return __TOPICS_REGISTRY__.find(t => t.level === level && t.topic === topic);
}

function getCurrentItems() {
  const obj = getTopicObject(currentLevel, currentTopic);
  return obj ? obj.items : [];
}

function updateFlashcardsTitle() {
  const h2 = document.getElementById("flashcards-title");
  if (!h2) return;

  const obj = getTopicObject(currentLevel, currentTopic);
  h2.textContent = obj ? `Flashcards — ${obj.label}` : "Flashcards";
}


/* ============================================================
   SRS
============================================================ */
function getFutureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function markAsLearned(item) {
  item.status = "learned";
  item.nextReview = getFutureDate(7);
  const s = ensureTopicStats(currentTopicKey());
  s.learned += 1;
  saveStats();
}

function markAsReview(item) {
  item.status = "review";
  item.nextReview = getFutureDate(2);
  const s = ensureTopicStats(currentTopicKey());
  s.reviewed += 1;
  saveStats();
}

function currentTopicKey() {
  // unique by level+topic so A1 people and A2 people don't clash
  return `${currentLevel}:${currentTopic}`;
}


/* ============================================================
   SWIPE
============================================================ */
function addSwipe(card, item) {
  let startX = 0;
  let currentX = 0;
  const threshold = 70;
  let isDragging = false;

  function setTransform(x) {
    card.style.transform = `translateX(${x}px) rotate(${x / 20}deg)`;
  }

  function resetPosition() {
    card.style.transition = "transform 0.2s ease";
    setTransform(0);
    setTimeout(() => card.style.transition = "", 200);
  }

  function finishSwipe() {
    if (currentX > threshold) {
      markAsLearned(item);
      card.style.transition = "transform 0.25s ease";
      setTransform(320);
      setTimeout(showNextCard, 260);
    } else if (currentX < -threshold) {
      markAsReview(item);
      card.style.transition = "transform 0.25s ease";
      setTransform(-320);
      setTimeout(showNextCard, 260);
    } else {
      resetPosition();
    }
    currentX = 0;
    isDragging = false;
  }

  // touch
  card.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
    isDragging = true;
  });
  card.addEventListener("touchmove", e => {
    if (!isDragging) return;
    currentX = e.touches[0].clientX - startX;
    setTransform(currentX);
  });
  card.addEventListener("touchend", () => {
    if (!isDragging) return;
    finishSwipe();
  });

  // mouse
  card.addEventListener("mousedown", e => {
    startX = e.clientX;
    isDragging = true;
  });
  window.addEventListener("mousemove", e => {
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
   NEXT CARD
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


/* ============================================================
   EMPTY MESSAGE
============================================================ */
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
    showEmptyMessage("No words marked for review in this topic.");
    return;
  }

  if (currentIndex >= items.length) currentIndex = 0;

  const item = items[currentIndex];
  updateFlashcardsTitle();

  // ===== PROGRESS =====
  const key = currentTopicKey();
  const s = stats[key] || { learned: 0, reviewed: 0 };
  const totalItems = allItems.length;
  const learned = s.learned || 0;
  const reviewed = s.reviewed || 0;
  const reviewCount = allItems.filter(i => i.status === "review").length;
  const totalActions = learned + reviewed;

  const progressPercent = totalItems ? Math.round((learned / totalItems) * 100) : 0;
  const accuracyPercent = totalActions ? Math.round((learned / totalActions) * 100) : 0;

  const progress = document.createElement("div");
  progress.classList.add("flashcard-progress");
  progress.innerHTML = `
    <div class="progress-bar">
      <div class="progress-bar-fill" style="width:${progressPercent}%;"></div>
    </div>
    <p class="progress-text">
      Learned: <strong>${learned}</strong> / <strong>${totalItems}</strong> (${progressPercent}%)
    </p>
    <p class="progress-text">
      Accuracy: <strong>${accuracyPercent}%</strong> (Learned / (Review + Learned))
    </p>
    <p class="progress-text">
      In REVIEW: <strong>${reviewCount}</strong>
    </p>
  `;
  container.appendChild(progress);

  // ===== CARD =====
  const card = document.createElement("div");
  card.classList.add("flashcard");
  card.setAttribute("data-id", item.id);

  card.innerHTML = `
    <div class="flashcard-face flashcard-front">
      <span class="flashcard-number">#${item.id}</span>
      <p class="flashcard-label">Front</p>
      <p class="flashcard-word">${item.word}</p>
      <p class="flashcard-hint">Tap to see the translation</p>
    </div>
    <div class="flashcard-face flashcard-back">
      <span class="flashcard-number">#${item.id}</span>
      <p class="flashcard-label">Back</p>
      <p class="flashcard-word">${item.translation}</p>
      <p class="flashcard-example">
        ${item.exampleEn} <br />
        <span class="example-pt">${item.examplePt}</span>
      </p>
    </div>
  `;

  addSwipe(card, item);
  container.appendChild(card);

  card.addEventListener("click", () => {
    card.classList.toggle("flipped");
  });

  // ===== ACTION BUTTONS =====
  const actions = document.createElement("div");
  actions.classList.add("flashcard-actions");

  const btnReview = document.createElement("button");
  btnReview.classList.add("card-btn", "card-btn-left");
  btnReview.textContent = "⟵ Review";

  const btnLearned = document.createElement("button");
  btnLearned.classList.add("card-btn", "card-btn-right");
  btnLearned.textContent = "Learned ⟶";

  btnReview.addEventListener("click", () => {
    markAsReview(item);
    showNextCard();
  });

  btnLearned.addEventListener("click", () => {
    markAsLearned(item);
    showNextCard();
  });

  actions.appendChild(btnReview);
  actions.appendChild(btnLearned);
  container.appendChild(actions);

  // ===== RESET BUTTON =====
  const resetWrapper = document.createElement("div");
  resetWrapper.classList.add("flashcard-reset-wrapper");

  const btnReset = document.createElement("button");
  btnReset.classList.add("card-btn-reset");
  btnReset.textContent = "Reset progress for this topic";

  btnReset.addEventListener("click", () => {
    allItems.forEach(i => {
      i.status = "new";
      i.nextReview = null;
    });
    stats[key] = { learned: 0, reviewed: 0 };
    forcedReviewOnly = false;
    currentIndex = 0;
    saveStats();
    renderFlashcards();
  });

  resetWrapper.appendChild(btnReset);
  container.appendChild(resetWrapper);
}


/* ============================================================
   UI / NAVIGATION (index only)
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
  topicSelect.addEventListener("change", () => {
    const [level, topic] = topicSelect.value.split(":");
    currentLevel = level;
    currentTopic = topic;
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

// Load topic by URL (?tema=food&level=A1)
(function initFromURL() {
  const params = new URLSearchParams(window.location.search);
  const temaURL = params.get("tema");
  const levelURL = params.get("level");

  if (temaURL) currentTopic = temaURL;
  if (levelURL) currentLevel = levelURL;

  if (temaURL || levelURL) {
    renderFlashcards();
    showSection(sectionFlashcards);
  }
})();

// Initial render if flashcards section visible
if (sectionFlashcards && !sectionFlashcards.classList.contains("hidden")) {
  renderFlashcards();
}