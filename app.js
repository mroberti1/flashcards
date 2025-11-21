/* ======================================
   APP.JS — LIMPO E SEM DUPLICAÇÕES
   Compatível com seu index.html atual
====================================== */

console.log("✅ app.js carregado");

/* ======================================
   1) TEMA DARK/LIGHT (auto + botão)
====================================== */

const THEME_KEY = "theme_preference_v1";

function applyTheme(theme) {
  const html = document.documentElement;
  const isDark = theme === "dark";
  html.classList.toggle("dark", isDark);
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");

  // acessibilidade no botão
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.setAttribute("aria-pressed", String(isDark));
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") {
    applyTheme(saved);
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
  }

  // se o sistema mudar, reflete aqui (a menos que usuário já tenha escolhido manualmente)
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (!savedTheme) applyTheme(e.matches ? "dark" : "light");
  });
}

function setupThemeToggle() {
  const themeBtn = document.getElementById("theme-toggle");
  if (!themeBtn) return;

  themeBtn.addEventListener("click", () => {
    const isDark = document.documentElement.classList.contains("dark");
    applyTheme(isDark ? "light" : "dark");
  });
}

/* ======================================
   2) ESTADO GLOBAL / STATS
====================================== */

let currentTopic = "people";
let currentIndex = 0;

let stats = {}; // vai ser preenchido do storage
const STATS_STORAGE_KEY = "flashcards_stats_v1";

// modo revisão: só status "review"
let forcedReviewOnly = false;

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    stats = raw ? JSON.parse(raw) : {};
  } catch {
    stats = {};
  }
}

function saveStats() {
  localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
}

function ensureTopicStats(topic) {
  if (!stats[topic]) stats[topic] = { reviewed: 0, learned: 0 };
}

/* ======================================
   3) TEMAS (carregados de data/*.js)
====================================== */

// Mapeia os temas disponíveis vindos dos arquivos data/
function getTopicsMap() {
  return {
    people: (typeof A1People !== "undefined") ? A1People.items : [],
    food: (typeof A1Food !== "undefined") ? A1Food.items : [],
    // adicione aqui novos temas futuramente:
    // travel: (typeof A1Travel !== "undefined") ? A1Travel.items : [],
  };
}

function getCurrentItems() {
  const map = getTopicsMap();
  return map[currentTopic] || [];
}

function updateFlashcardsTitle() {
  const titleEl = document.getElementById("flashcards-title");
  if (!titleEl) return;

  const topicNames = {
    people: "Pessoas",
    food: "Comida e bebida"
  };

  titleEl.textContent = `FlashCards – ${topicNames[currentTopic] || currentTopic}`;
}

/* ======================================
   4) SRS: REVER / APRENDIDA
====================================== */

function getFutureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function markAsLearned(item) {
  item.status = "learned";
  item.nextReview = getFutureDate(7);
}

function markAsReview(item) {
  item.status = "review";
  item.nextReview = getFutureDate(2);
}

/* ======================================
   5) SWIPE (TOUCH + MOUSE)
====================================== */

function addSwipe(card, item) {
  let startX = 0;
  let currentX = 0;
  let isDragging = false;
  const threshold = 70;

  function setTransform(x) {
    card.style.transform = `translateX(${x}px) rotate(${x / 20}deg)`;
  }

  function resetPosition() {
    card.style.transition = "transform .2s ease";
    setTransform(0);
    setTimeout(() => (card.style.transition = ""), 200);
  }

  function finishSwipe() {
    if (currentX > threshold) {
      // direita = aprendida
      markAsLearned(item);
      ensureTopicStats(currentTopic);
      stats[currentTopic].learned += 1;
      saveStats();

      card.style.transition = "transform .25s ease";
      setTransform(320);
      setTimeout(showNextCard, 260);

    } else if (currentX < -threshold) {
      // esquerda = rever
      markAsReview(item);
      ensureTopicStats(currentTopic);
      stats[currentTopic].reviewed += 1;
      saveStats();

      card.style.transition = "transform .25s ease";
      setTransform(-320);
      setTimeout(showNextCard, 260);

    } else {
      resetPosition();
    }

    currentX = 0;
    isDragging = false;
  }

  // TOUCH
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

  // MOUSE
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

/* ======================================
   6) PRÓXIMO CARD (sequência 1..N)
====================================== */

function showNextCard() {
  const all = getCurrentItems();
  let list = forcedReviewOnly
    ? all.filter(i => i.status === "review")
    : all;

  if (!list.length) {
    renderFlashcards();
    return;
  }

  currentIndex = (currentIndex + 1) % list.length;
  renderFlashcards();
}

/* ======================================
   7) RENDER
====================================== */

function showEmptyMessage(msg) {
  const container = document.querySelector(".flashcard-container");
  if (container) container.innerHTML = `<p>${msg}</p>`;
}

function renderFlashcards() {
  const container = document.querySelector(".flashcard-container");
  if (!container) return;

  container.innerHTML = "";

  const allItems = getCurrentItems();
  if (!allItems.length) {
    showEmptyMessage("Não há palavras neste tema (arquivo de dados não carregado?).");
    return;
  }

  // lista do modo atual
  const items = forcedReviewOnly
    ? allItems.filter(i => i.status === "review")
    : allItems;

  if (!items.length) {
    showEmptyMessage("Não há palavras marcadas como REVER neste tema.");
    return;
  }

  if (currentIndex >= items.length) currentIndex = 0;

  const item = items[currentIndex];
  updateFlashcardsTitle();

  ensureTopicStats(currentTopic);
  const { learned = 0, reviewed = 0 } = stats[currentTopic];

  const totalItems = allItems.length;
  const reviewCount = allItems.filter(i => i.status === "review").length;
  const totalActions = learned + reviewed;

  const progressPercent = totalItems ? Math.round((learned / totalItems) * 100) : 0;
  const accuracyPercent = totalActions ? Math.round((learned / totalActions) * 100) : 0;

  // ==== PROGRESSO ====
  const progress = document.createElement("div");
  progress.classList.add("flashcard-progress");
  progress.innerHTML = `
    <div class="progress-bar">
      <div class="progress-bar-fill" style="width:${progressPercent}%"></div>
    </div>
    <p class="progress-text">Aprendidas: <strong>${learned}</strong> / ${totalItems} (${progressPercent}%)</p>
    <p class="progress-text">Precisão: <strong>${accuracyPercent}%</strong></p>
    <p class="progress-text">Em REVER: <strong>${reviewCount}</strong></p>
  `;
  container.appendChild(progress);

  // ==== CARD ====
  const card = document.createElement("div");
  card.className = "flashcard";
  card.dataset.id = item.id;

  card.innerHTML = `
    <div class="flashcard-face flashcard-front">
      <span class="flashcard-number">#${item.id}</span>
      <p class="flashcard-label">Frente</p>
      <p class="flashcard-word">${item.word}</p>
      <p class="flashcard-hint">Clique para ver a tradução</p>
    </div>
    <div class="flashcard-face flashcard-back">
      <span class="flashcard-number">#${item.id}</span>
      <p class="flashcard-label">Verso</p>
      <p class="flashcard-word">${item.translation}</p>
      <p class="flashcard-example">
        ${item.exampleEn}<br />
        <span class="example-pt">${item.examplePt}</span>
      </p>
    </div>
  `;

  addSwipe(card, item);
  container.appendChild(card);

  card.addEventListener("click", () => card.classList.toggle("flipped"));

  // ==== BOTÕES ====
  const actions = document.createElement("div");
  actions.className = "flashcard-actions";

  const btnReview = document.createElement("button");
  btnReview.className = "card-btn card-btn-left";
  btnReview.textContent = "⟵ Rever";

  const btnLearned = document.createElement("button");
  btnLearned.className = "card-btn card-btn-right";
  btnLearned.textContent = "Aprendida ⟶";

  btnReview.addEventListener("click", () => {
    markAsReview(item);
    ensureTopicStats(currentTopic);
    stats[currentTopic].reviewed += 1;
    saveStats();
    showNextCard();
  });

  btnLearned.addEventListener("click", () => {
    markAsLearned(item);
    ensureTopicStats(currentTopic);
    stats[currentTopic].learned += 1;
    saveStats();
    showNextCard();
  });

  actions.append(btnReview, btnLearned);
  container.appendChild(actions);

  // ==== RESET ====
  const resetWrapper = document.createElement("div");
  resetWrapper.className = "flashcard-reset-wrapper";

  const btnReset = document.createElement("button");
  btnReset.className = "card-btn-reset";
  btnReset.textContent = "Resetar progresso deste tema";

  btnReset.addEventListener("click", () => {
    allItems.forEach(i => {
      i.status = "new";
      i.nextReview = null;
    });
    stats[currentTopic] = { reviewed: 0, learned: 0 };
    forcedReviewOnly = false;
    currentIndex = 0;
    saveStats();
    renderFlashcards();
  });

  resetWrapper.appendChild(btnReset);
  container.appendChild(resetWrapper);
}

/* ======================================
   8) BOTÕES / SEÇÕES / INIT
====================================== */

function mostrarSection(section) {
  const sectionFlashcards = document.getElementById("section-flashcards");
  const sectionExercicios = document.getElementById("section-exercicios");
  if (!sectionFlashcards || !sectionExercicios) return;

  sectionFlashcards.classList.add("hidden");
  sectionExercicios.classList.add("hidden");
  section.classList.remove("hidden");
}

function setupUI() {
  const btnFlashcards = document.getElementById("btn-flashcards");
  const btnExercicios = document.getElementById("btn-exercicios");
  const sectionFlashcards = document.getElementById("section-flashcards");
  const sectionExercicios = document.getElementById("section-exercicios");
  const topicSelect = document.getElementById("topic-select");
  const btnReviewMode = document.getElementById("btn-review-mode");

  if (btnFlashcards && sectionFlashcards) {
    btnFlashcards.addEventListener("click", () => {
      forcedReviewOnly = false;
      currentIndex = 0;
      renderFlashcards();
      mostrarSection(sectionFlashcards);
    });
  }

  if (btnExercicios && sectionExercicios) {
    btnExercicios.addEventListener("click", () => {
      mostrarSection(sectionExercicios);
    });
  }

  if (topicSelect) {
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
      currentIndex = 0;
      btnReviewMode.classList.toggle("active", forcedReviewOnly);
      renderFlashcards();
    });
  }

  // tema via URL: index.html?tema=food
  const params = new URLSearchParams(window.location.search);
  const temaURL = params.get("tema");
  if (temaURL) currentTopic = temaURL;
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  setupThemeToggle();
  loadStats();
  setupUI();
});