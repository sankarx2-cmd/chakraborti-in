(function () {
  "use strict";

  var cards = document.querySelectorAll(".story-entry-card[data-story-id]");
  if (!cards.length) {
    return;
  }

  function getApiOrigin() {
    var protocol = window.location && window.location.protocol ? window.location.protocol : "https:";
    var host = window.location && window.location.hostname ? window.location.hostname : "";
    if (host.indexOf("www.") === 0) {
      return protocol + "//" + host.slice(4);
    }
    return window.location && window.location.origin ? window.location.origin : "";
  }

  var apiOrigin = getApiOrigin();

  function applyLikeCount(card, likes) {
    var indicator = card.querySelector("[data-story-like-indicator]");
    var countEl = card.querySelector("[data-story-like-count]");
    if (!indicator || !countEl) {
      return;
    }

    var safeCount = Number.isFinite(likes) && likes > 0 ? likes : 0;
    countEl.textContent = String(safeCount);
    indicator.classList.toggle("has-likes", safeCount > 0);
    indicator.setAttribute("aria-label", safeCount === 1 ? "1 like" : safeCount + " likes");
  }

  async function loadLikeCounts() {
    var ids = Array.from(cards)
      .map(function (card) {
        return card.getAttribute("data-story-id");
      })
      .filter(Boolean);

    if (!ids.length) {
      return;
    }

    var response = await fetch(apiOrigin + "/api/stories?ids=" + encodeURIComponent(ids.join(",")), {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("Unable to load story like counts");
    }

    var data = await response.json();
    var likeMap = {};

    if (data && Array.isArray(data.stories)) {
      data.stories.forEach(function (entry) {
        if (!entry || typeof entry.storyId !== "string") {
          return;
        }
        var count = Number.parseInt(entry.likeCount, 10);
        likeMap[entry.storyId] = Number.isFinite(count) && count > 0 ? count : 0;
      });
    }

    cards.forEach(function (card) {
      var storyId = card.getAttribute("data-story-id") || "";
      applyLikeCount(card, likeMap[storyId] || 0);
    });
  }

  cards.forEach(function (card) {
    applyLikeCount(card, 0);
  });

  loadLikeCounts().catch(function () {
    cards.forEach(function (card) {
      applyLikeCount(card, 0);
    });
  });
})();
