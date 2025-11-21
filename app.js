/* ======================================
   ESTADO GLOBAL & LOG INICIAL
====================================== */

console.log("✅ app.js carregado");

let currentTopic = "people"; // tema atual (people, food, etc.)
let currentIndex = 0;        // índice atual dentro da lista

// stats simples por tema
let stats = {
  people: { reviewed: 0, learned: 0 },
  food: { reviewed: 0, learned: 0 }
};

const STATS_STORAGE_KEY = "flashcards_stats_v1";

// modos de revisão
// forcedReviewOnly = true → só mostra palavras com status "review"
let forcedReviewOnly = false;


/* ======================================
   🌗 TEMA DARK/LIGHT + SOM DE CLIQUE
====================================== */

const THEME_KEY = "theme_preference_v1";

// aplica tema e salva preferências
function applyTheme(theme) {
  const html = document.documentElement;
  const isDark = theme === "dark";
  html.classList.toggle("dark", isDark);
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
}

// pega preferência salva ou do sistema
(function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "dark" || savedTheme === "light") {
    applyTheme(savedTheme);
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
  }
})();

const themeBtn = document.getElementById("theme-toggle");

// som de clique (opcional)
let clickSound = null;
try {
  clickSound = new Audio("sounds/toggle.mp3");
} catch (e) {
  console.warn("Não foi possível carregar o som do toggle:", e);
}

function playClick() {
  if (!clickSound) return;
  clickSound.currentTime = 0;
  clickSound.play().catch(() => {
    // evita erro se o navegador bloquear autoplay
  });
}

function handleThemeToggle() {
  const isDark = document.documentElement.classList.contains("dark");
  applyTheme(isDark ? "light" : "dark");
  playClick();
}

if (themeBtn) {
  themeBtn.addEventListener("click", handleThemeToggle);
}


/* ======================================
   STATS: LOAD / SAVE
====================================== */

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;

    stats = {
      people: { reviewed: 0, learned: 0, ...(parsed.people || {}) },
      food: { reviewed: 0, learned: 0, ...(parsed.food || {}) }
    };
  } catch (e) {
    console.warn("Erro ao carregar stats:", e);
  }
}

function saveStats() {
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn("Erro ao salvar stats:", e);
  }
}

loadStats();


/* ======================================
   HELPERS: ITENS, TÍTULO
====================================== */

function getCurrentItems() {
  // A1People e A1Food vêm dos arquivos data/A1-people.js e data/A1-food.js
  switch (currentTopic) {
    case "people":
      return (typeof A1People !== "undefined") ? A1People.items : [];
    case "food":
      return (typeof A1Food !== "undefined") ? A1Food.items : [];
    default:
      return (typeof A1People !== "undefined") ? A1People.items : [];
  }
}

function updateFlashcardsTitle() {
  const titleEl = document.getElementById("flashcards-title");
  if (!titleEl) return;

  const topicNames = {
    people: "Pessoas",
    food: "Comida e bebida"
  };
  const label = topicNames[currentTopic] || "Pessoas";
  titleEl.textContent = `FlashCards – ${label}`;
}


/* ======================================
   SRS: MARCAR APRENDIDA / REVER
====================================== */

function getFutureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function markAsLearned(item) {
  item.status = "learned";
  item.nextReview = getFutureDate(7);
  console.log(`Aprendida: ${item.word} | próxima revisão: ${item.nextReview}`);
}

function markAsReview(item) {
  item.status = "review";
  item.nextReview = getFutureDate(2);
  console.log(`Rever: ${item.word} | próxima revisão: ${item.nextReview}`);
}


/* ======================================
   SWIPE (TOUCH + MOUSE)
====================================== */

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
    setTimeout(() => {
      card.style.transition = "";
    }, 200);
  }

  function finishSwipe() {
    if (currentX > threshold) {
      // direita = aprendida
      markAsLearned(item);
      const s = stats[currentTopic];
      if (s) s.learned = (s.learned || 0) + 1;
      saveStats();

      card.style.transition = "transform 0.25s ease";
      setTransform(320);
      setTimeout(() => {
        showNextCard();
      }, 260);
    } else if (currentX < -threshold) {
      // esquerda = rever
      markAsReview(item);
      const s = stats[currentTopic];
      if (s) s.reviewed = (s.reviewed || 0) + 1;
      saveStats();

      card.style.transition = "transform 0.25s ease";
      setTransform(-320);
      setTimeout(() => {
        showNextCard();
      }, 260);
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
   PRÓXIMO CARD (SEQUÊNCIA 1,2,3...)
====================================== */

function showNextCard() {
  const allItems = getCurrentItems();

  let list;
  if (forcedReviewOnly) {
    list = allItems.filter(i => i.status === "review");
  } else {
    list = allItems; // mostra todos em sequência
  }

  if (!list.length) {
    renderFlashcards(); // deixa o render cuidar da mensagem
    return;
  }

  currentIndex = (currentIndex + 1) % list.length;
  renderFlashcards();
}


/* ======================================
   MENSAGEM: SEM ITENS NO MODO ATUAL
====================================== */

function showEmptyMessage(msg) {
  const container = document.querySelector(".flashcard-container");
  if (!container) return;
  container.innerHTML = `<p>${msg}</p>`;
}


/* ======================================
   RENDERIZAR FLASHCARDS
====================================== */

function renderFlashcards() {
  const container = document.querySelector(".flashcard-container");
  if (!container) return;

  container.innerHTML = "";

  const allItems = getCurrentItems();
  if (!allItems.length) {
    showEmptyMessage("Não há palavras neste tema.");
    return;
  }

  let items;
  if (forcedReviewOnly) {
    items = allItems.filter(i => i.status === "review");
    if (!items.length) {
      showEmptyMessage("Não há palavras marcadas como REVER neste tema.");
      return;
    }
  } else {
    items = allItems;
  }

  if (currentIndex >= items.length) currentIndex = 0;

  const item = items[currentIndex];
  updateFlashcardsTitle();

  // ===== STATS / CONTADORES =====
  const currentStats = stats[currentTopic] || { reviewed: 0, learned: 0 };
  const totalItems = allItems.length;
  const learned = currentStats.learned || 0;
  const reviewed = currentStats.reviewed || 0;
  const reviewCount = allItems.filter(i => i.status === "review").length;
  const totalActions = learned + reviewed;

  const progressPercent = totalItems ? Math.round((learned / totalItems) * 100) : 0;
  const accuracyPercent = totalActions ? Math.round((learned / totalActions) * 100) : 0;

  const progress = document.createElement("div");
  progress.classList.add("flashcard-progress");
  progress.innerHTML = `
    <div class="progress-bar">
      <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
    </div>
    <p class="progress-text">
      Aprendidas: <strong>${learned}</strong> de <strong>${totalItems}</strong> (${progressPercent}%)
    </p>
    <p class="progress-text">
      Precisão: <strong>${accuracyPercent}%</strong> (Aprendidas / (Rever + Aprendidas))
    </p>
    <p class="progress-text">
      Em REVER: <strong>${reviewCount}</strong>
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
      <p class="flashcard-label">Frente</p>
      <p class="flashcard-word">${item.word}</p>
      <p class="flashcard-hint">Clique para ver a tradução</p>
    </div>
    <div class="flashcard-face flashcard-back">
      <span class="flashcard-number">#${item.id}</span>
      <p class="flashcard-label">Verso</p>
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

  // ===== BOTÕES REVER / APRENDIDA =====
  const actions = document.createElement("div");
  actions.classList.add("flashcard-actions");

  const btnReview = document.createElement("button");
  btnReview.classList.add("card-btn", "card-btn-left");
  btnReview.textContent = "⟵ Rever";

  const btnLearned = document.createElement("button");
  btnLearned.classList.add("card-btn", "card-btn-right");
  btnLearned.textContent = "Aprendida ⟶";

  btnReview.addEventListener("click", () => {
    markAsReview(item);
    const s = stats[currentTopic];
    if (s) s.reviewed = (s.reviewed || 0) + 1;
    saveStats();
    showNextCard();
  });

  btnLearned.addEventListener("click", () => {
    markAsLearned(item);
    const s = stats[currentTopic];
    if (s) s.learned = (s.learned || 0) + 1;
    saveStats();
    showNextCard();
  });

  actions.appendChild(btnReview);
  actions.appendChild(btnLearned);
  container.appendChild(actions);

  // ===== BOTÃO RESET =====
  const resetWrapper = document.createElement("div");
  resetWrapper.classList.add("flashcard-reset-wrapper");

  const btnReset = document.createElement("button");
  btnReset.classList.add("card-btn-reset");
  btnReset.textContent = "Resetar progresso deste tema";

  btnReset.addEventListener("click", () => {
    const all = getCurrentItems();
    all.forEach(i => {
      i.status = "new";
      i.nextReview = null;
    });
    if (stats[currentTopic]) {
      stats[currentTopic].reviewed = 0;
      stats[currentTopic].learned = 0;
    }
    forcedReviewOnly = false;
    currentIndex = 0;
    saveStats();
    renderFlashcards();
  });

  resetWrapper.appendChild(btnReset);
  container.appendChild(resetWrapper);
}


/* ======================================
   BOTÕES / SEÇÕES
====================================== */

const btnFlashcards   = document.getElementById("btn-flashcards");
const btnExercicios   = document.getElementById("btn-exercicios");
const sectionFlashcards = document.getElementById("section-flashcards");
const sectionExercicios = document.getElementById("section-exercicios");
const topicSelect     = document.getElementById("topic-select");
const btnReviewMode   = document.getElementById("btn-review-mode");

function mostrarSection(section) {
  if (!sectionFlashcards || !sectionExercicios) return;

  sectionFlashcards.classList.add("hidden");
  sectionExercicios.classList.add("hidden");

  section.classList.remove("hidden");

  window.scrollTo({
    top: section.offsetTop - 20,
    behavior: "smooth"
  });
}

if (btnFlashcards) {
  btnFlashcards.addEventListener("click", () => {
    forcedReviewOnly = false;
    currentIndex = 0;
    renderFlashcards();
    mostrarSection(sectionFlashcards);
  });
}

if (btnExercicios) {
  btnExercicios.addEventListener("click", () => {
    mostrarSection(sectionExercicios);
  });
}

if (topicSelect) {
  topicSelect.addEventListener("change", () => {
    currentTopic = topicSelect.value; // ex: "people" ou "food"
    forcedReviewOnly = false;
    currentIndex = 0;
    renderFlashcards();
  });
}

if (btnReviewMode) {
  btnReviewMode.addEventListener("click", () => {
    forcedReviewOnly = !forcedReviewOnly;
    currentIndex = 0;

    if (forcedReviewOnly) {
      btnReviewMode.classList.add("active");
    } else {
      btnReviewMode.classList.remove("active");
    }

    renderFlashcards();
  });
}

// ===== CARREGAR TEMA VIA URL =====
// Ex: index.html?tema=food
const params = new URLSearchParams(window.location.search);
const temaURL = params.get("tema");

if (temaURL) {
  currentTopic = temaURL;   // ex: "people"
  renderFlashcards();
  mostrarSection(sectionFlashcards);
}