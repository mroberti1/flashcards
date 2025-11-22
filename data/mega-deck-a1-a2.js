(function () {
  const decks = [
    window.A1People,
    window.A1Food,
    window.A2People,
    window.A2Food
  ].filter(Boolean);

  const allItems = decks.flatMap(d => d.items || []);

  const merged = allItems.map((it, idx) => ({
    ...it,
    id: idx + 1,
    topic: "mega-a1-a2"
  }));

  window.MegaDeckA1A2 = {
    level: "A1+A2",
    topic: "mega-a1-a2",
    label: "Mega Deck – A1 + A2",
    items: merged
  };
})();