(function () {
  "use strict";

  var tabs = document.querySelector("[data-story-language-tabs]");
  var emptyState = document.querySelector("[data-story-language-empty]");
  var cards = Array.from(document.querySelectorAll(".story-entry-card[data-story-language]"));

  if (!tabs || !emptyState || !cards.length) {
    return;
  }

  var buttons = Array.from(tabs.querySelectorAll("[data-story-language-tab]"));
  if (!buttons.length) {
    return;
  }

  function normalizeLanguage(value) {
    if (typeof value !== "string") {
      return "";
    }
    var language = value.trim().toLowerCase();
    return language === "english" || language === "bengali" ? language : "";
  }

  function getEmptyMessage(language) {
    if (language === "english") {
      return "No English stories published yet.";
    }
    if (language === "bengali") {
      return "No Bengali stories published yet.";
    }
    return "No stories in this language yet.";
  }

  function setTabState(language) {
    buttons.forEach(function (button) {
      var tabLanguage = normalizeLanguage(button.getAttribute("data-story-language-tab"));
      var isActive = tabLanguage === language;
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      button.tabIndex = isActive ? 0 : -1;
    });
  }

  function filterStories(language) {
    var activeLanguage = normalizeLanguage(language) || "english";
    var visibleCount = 0;

    cards.forEach(function (card) {
      var cardLanguage = normalizeLanguage(card.getAttribute("data-story-language"));
      var shouldShow = cardLanguage === activeLanguage;
      card.hidden = !shouldShow;
      if (shouldShow) {
        visibleCount += 1;
      }
    });

    emptyState.textContent = getEmptyMessage(activeLanguage);
    emptyState.hidden = visibleCount > 0;
    setTabState(activeLanguage);
  }

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      var language = normalizeLanguage(button.getAttribute("data-story-language-tab"));
      filterStories(language);
    });
  });

  var defaultLanguage = normalizeLanguage(tabs.getAttribute("data-default-language")) || "english";
  filterStories(defaultLanguage);
})();
