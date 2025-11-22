(function () {
  // Create MIXED A1 data automatically from all A1 topics
  const allTopics = window.__TOPICS_REGISTRY__ || [];

  // Filter only A1 topics
  const a1Topics = allTopics.filter(t => t.level === "A1");

  // Flatten all A1 items into a single list
  let mixedItems = [];
  a1Topics.forEach(topic => {
    if (topic.items && Array.isArray(topic.items)) {
      mixedItems = mixedItems.concat(topic.items);
    }
  });

  // Shuffle (Fisher–Yates)
  for (let i = mixedItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mixedItems[i], mixedItems[j]] = [mixedItems[j], mixedItems[i]];
  }

  // Assign new sequential IDs for the mixed topic
  mixedItems = mixedItems.map((item, index) => ({
    ...item,
    id: index + 1,
    topic: "mixed"
  }));

  // Create global mixed topic object
  window.A1Mixed = {
    level: "A1",
    topic: "mixed",
    label: "A1 – Mixed Review",
    items: mixedItems
  };

  // Register into global topic registry
  if (!window.__TOPICS_REGISTRY__) window.__TOPICS_REGISTRY__ = [];
  window.__TOPICS_REGISTRY__.push(window.A1Mixed);

  console.log("A1-Mixed loaded:", window.A1Mixed);
})();