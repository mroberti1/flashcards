/* ======================================
   1) ESTADO GLOBAL
   ====================================== */

// Tema atual e índice atual
let currentTopic = "people";
let currentIndex = 0; // começa no card 0 (id 1)

// Estatísticas por tema (revisadas / aprendidas)
let stats = {
  people: { reviewed: 0, learned: 0 },
  food: { reviewed: 0, learned: 0 }
};

const STATS_STORAGE_KEY = "flashcards_stats_v1";

/* ======================================
   2) DADOS DOS TEMAS
   ====================================== */

const A1People = {
  level: "A1",
  topic: "people",
  items: [
    {
      id: 1,
      level: "A1",
      topic: "people",
      word: "father",
      translation: "pai",
      exampleEn: "My father works in an office.",
      examplePt: "Meu pai trabalha em um escritório.",
      status: "new",
      nextReview: null
    },
    {
      id: 2,
      level: "A1",
      topic: "people",
      word: "mother",
      translation: "mãe",
      exampleEn: "My mother cooks very well.",
      examplePt: "Minha mãe cozinha muito bem.",
      status: "new",
      nextReview: null
    },
    {
      id: 3,
      level: "A1",
      topic: "people",
      word: "brother",
      translation: "irmão",
      exampleEn: "My brother plays soccer.",
      examplePt: "Meu irmão joga futebol.",
      status: "new",
      nextReview: null
    },
    {
      id: 4,
      level: "A1",
      topic: "people",
      word: "sister",
      translation: "irmã",
      exampleEn: "My sister studies English every day.",
      examplePt: "Minha irmã estuda inglês todos os dias.",
      status: "new",
      nextReview: null
    },
    {
      id: 5,
      level: "A1",
      topic: "people",
      word: "friend",
      translation: "amigo",
      exampleEn: "He is my best friend.",
      examplePt: "Ele é meu melhor amigo.",
      status: "new",
      nextReview: null
    },
    {
      id: 6,
      level: "A1",
      topic: "people",
      word: "family",
      translation: "família",
      exampleEn: "My family is very big.",
      examplePt: "Minha família é muito grande.",
      status: "new",
      nextReview: null
    },
    {
      id: 7,
      level: "A1",
      topic: "people",
      word: "child",
      translation: "criança",
      exampleEn: "The child is playing in the park.",
      examplePt: "A criança está brincando no parque.",
      status: "new",
      nextReview: null
    },
    {
      id: 8,
      level: "A1",
      topic: "people",
      word: "teacher",
      translation: "professor",
      exampleEn: "The teacher explains everything clearly.",
      examplePt: "O professor explica tudo claramente.",
      status: "new",
      nextReview: null
    },
    {
      id: 9,
      level: "A1",
      topic: "people",
      word: "student",
      translation: "estudante",
      exampleEn: "The student is doing homework.",
      examplePt: "O estudante está fazendo lição de casa.",
      status: "new",
      nextReview: null
    },
    {
      id: 10,
      level: "A1",
      topic: "people",
      word: "neighbor",
      translation: "vizinho",
      exampleEn: "My neighbor is very friendly.",
      examplePt: "Meu vizinho é muito amigável.",
      status: "new",
      nextReview: null
    }
  ]
};

const A1Food = {
  level: "A1",
  topic: "food",
  items: [
    {
      id: 1,
      level: "A1",
      topic: "food",
      word: "apple",
      translation: "maçã",
      exampleEn: "I eat an apple every morning.",
      examplePt: "Eu como uma maçã todas as manhãs.",
      status: "new",
      nextReview: null
    },
    {
      id: 2,
      level: "A1",
      topic: "food",
      word: "bread",
      translation: "pão",
      exampleEn: "She buys fresh bread every day.",
      examplePt: "Ela compra pão fresco todos os dias.",
      status: "new",
      nextReview: null
    },
    {
      id: 3,
      level: "A1",
      topic: "food",
      word: "water",
      translation: "água",
      exampleEn: "I drink water all day.",
      examplePt: "Eu bebo água o dia todo.",
      status: "new",
      nextReview: null
    }
  ]
};

/* ======================================
   3) STATS – LOAD / SAVE
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
   4) HELPERS – ITENS E TÍTULO
   ====================================== */

function getCurrentItems() {
  switch (currentTopic) {
    case "people":
      return A1People.items;
    case "food":
      return A1Food.items;
    default:
      return A1People.items;
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
   5) FUNÇÕES DE SRS (revisão)
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
   6) SWIPE (touch + mouse)
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
      // Direita = aprendida
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
      // Esquerda = revisar
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
   7) PRÓXIMO CARD
   ====================================== */

function showNextCard() {
  const items = getCurrentItems();
  if (!items.length) return;

  currentIndex = (currentIndex + 1) % items.length;
  renderFlashcards();
}

/* ======================================
   8) RENDERIZAR FLASHCARDS
   ====================================== */

function renderFlashcards() {
  const container = document.querySelector(".flashcard-container");
  if (!container) return;

  container.innerHTML = "";

  const items = getCurrentItems();
  if (!items.length) return;

  if (currentIndex >= items.length) {
    currentIndex = 0;
  }

  const item = items[currentIndex];
  updateFlashcardsTitle();

  const currentStats = stats[currentTopic] || { reviewed: 0, learned: 0 };
  const totalItems = items.length;
  const learned = currentStats.learned || 0;
  const reviewed = currentStats.reviewed || 0;
  const totalActions = learned + reviewed;

  const progressPercent = totalItems
    ? Math.round((learned / totalItems) * 100)
    : 0;

  const accuracyPercent = totalActions
    ? Math.round((learned / totalActions) * 100)
    : 0;

  // === BARRA DE PROGRESSO ===
  const progress = document.createElement("div");
  progress.classList.add("flashcard-progress");
  progress.innerHTML = `
    <div class="progress-bar">
      <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
    </div>
    <p class="progress-text">
      Aprendidas: <strong>${learned}</strong> de <strong>${totalItems}</strong>
      (${progressPercent}%)
    </p>
    <p class="progress-text">
      Precisão: <strong>${accuracyPercent}%</strong> 
      (Aprendidas / (Rever + Aprendidas))
    </p>
  `;
  container.appendChild(progress);

  // === CONTADORES SIMPLES ===
  const counters = document.createElement("div");
  counters.classList.add("flashcard-counters");
  counters.innerHTML = `
    <p>🔁 Revisadas: <strong>${reviewed}</strong></p>
    <p>✅ Aprendidas: <strong>${learned}</strong></p>
  `;
  container.appendChild(counters);

  // === CARD PRINCIPAL ===
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

  // clique pra virar
  card.addEventListener("click", () => {
    card.classList.toggle("flipped");
  });

  // === BOTÕES REVER / APRENDIDA ===
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

  // === BOTÃO RESET (SÓ DO TEMA ATUAL) ===
  const resetWrapper = document.createElement("div");
  resetWrapper.classList.add("flashcard-reset-wrapper");

  const btnReset = document.createElement("button");
  btnReset.classList.add("card-btn-reset");
  btnReset.textContent = "Resetar progresso deste tema";

  btnReset.addEventListener("click", () => {
    const allItems = getCurrentItems();
    allItems.forEach((i) => {
      i.status = "new";
      i.nextReview = null;
    });
    if (stats[currentTopic]) {
      stats[currentTopic].reviewed = 0;
      stats[currentTopic].learned = 0;
    }
    saveStats();
    currentIndex = 0;
    renderFlashcards();
  });

  resetWrapper.appendChild(btnReset);
  container.appendChild(resetWrapper);
}

/* ======================================
   9) BOTÕES E SEÇÕES
   ====================================== */

const btnFlashcards = document.getElementById("btn-flashcards");
const btnExercicios = document.getElementById("btn-exercicios");
const sectionFlashcards = document.getElementById("section-flashcards");
const sectionExercicios = document.getElementById("section-exercicios");
const topicSelect = document.getElementById("topic-select");

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
    currentTopic = topicSelect.value; // "people" ou "food"
    currentIndex = 0;
    renderFlashcards();
  });
}
