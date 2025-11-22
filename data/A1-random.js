(function () {
  function dateSeed() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function seededRandom(seedStr) {
    // mulberry32-like seed from string
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return function () {
      h += 0x6D2B79F5;
      let t = Math.imul(h ^ (h >>> 15), 1 | h);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleWithSeed(arr, seedStr) {
    const rand = seededRandom(seedStr);
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const people = (window.A1People && window.A1People.items) ? window.A1People.items : [];
  const food   = (window.A1Food && window.A1Food.items) ? window.A1Food.items : [];

  const all = [...people, ...food].map((it, idx) => ({
    ...it,
    id: idx + 1,
    level: "A1",
    topic: "random-a1"
  }));

  const seed = dateSeed();
  const shuffled = shuffleWithSeed(all, seed);

  window.A1Random = {
    level: "A1",
    topic: "random-a1",
    label: "A1 – Random (Daily)",
    seed,
    items: shuffled
  };
})();