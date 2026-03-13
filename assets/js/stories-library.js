(function () {
  "use strict";

  var cards = document.querySelectorAll(".story-entry-card[data-story-id]");
  if (!cards.length) {
    return;
  }

  function safeGet(key, fallback) {
    try {
      var value = window.localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (err) {
      return fallback;
    }
  }

  function readLikeCount(storyId) {
    var raw = safeGet("chakraborti_story_" + storyId + "_likes", "0");
    var count = Number.parseInt(raw, 10);
    if (!Number.isFinite(count) || count < 0) {
      return 0;
    }
    return count;
  }

  cards.forEach(function (card) {
    var storyId = card.getAttribute("data-story-id");
    var indicator = card.querySelector("[data-story-like-indicator]");
    var countEl = card.querySelector("[data-story-like-count]");
    if (!storyId || !indicator || !countEl) {
      return;
    }

    var likes = readLikeCount(storyId);
    countEl.textContent = String(likes);
    indicator.classList.toggle("has-likes", likes > 0);
    indicator.setAttribute("aria-label", likes === 1 ? "1 like" : likes + " likes");
  });
})();
