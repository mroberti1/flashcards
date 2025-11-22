(function () {
  // ---------- helpers: seeded random ----------
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seededShuffle(array, seedStr) {
    const seedGen = xmur3(seedStr);
    const rand = mulberry32(seedGen());
    const arr = array.slice();

    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---------- build A1 Random Daily ----------
  const allTopics = window.__TOPICS_REGISTRY__ || [];
  const a1Topics = allTopics.filter(t => t.level === "A1");

  let items = [];
  a1Topics.forEach(t => {
    if (Array.isArray(t.items)) items = items.concat(t.items);
  });

  // seed = today (local)
  const todaySeed = new Date().toISOString().split("T")[0];
  let shuffled = seededShuffle(items, todaySeed);

  shuffled = shuffled.map((item, index) => ({
    ...item,
    id: index + 1,
    topic: "a1-random"
  }));

  window.A1Random = {
    level: "A1",
    topic: "a1-random",
    label: "A1 – Random Daily",
    items: shuffled
  };

  if (!window.__TOPICS_REGISTRY__) window.__TOPICS_REGISTRY__ = [];
  window.__TOPICS_REGISTRY__.push(window.A1Random);

  console.log("A1 Random Daily loaded (seed:", todaySeed, ")");
})();