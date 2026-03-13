(function () {
  "use strict";

  var storyId = document.body && document.body.dataset ? document.body.dataset.storyId : "";
  if (!storyId) {
    return;
  }

  var likeButton = document.getElementById("like-button");
  var likeCountEl = document.getElementById("like-count");
  var commentForm = document.getElementById("comment-form");
  var nameInput = document.getElementById("commenter-name");
  var commentInput = document.getElementById("comment-text");
  var challengeLabel = document.getElementById("comment-challenge-label");
  var challengeInput = document.getElementById("comment-challenge-answer");
  var challengeRefresh = document.getElementById("comment-challenge-refresh");
  var commentsList = document.getElementById("comments-list");
  var emptyComments = document.getElementById("comments-empty");
  var feedback = document.getElementById("comment-feedback");

  if (
    !likeButton ||
    !likeCountEl ||
    !commentForm ||
    !nameInput ||
    !commentInput ||
    !challengeLabel ||
    !challengeInput ||
    !challengeRefresh ||
    !commentsList ||
    !emptyComments ||
    !feedback
  ) {
    return;
  }

  var apiBase = "/api/story/" + encodeURIComponent(storyId);
  var deviceIdKey = "chakraborti_story_device_id_v1";
  var currentChallengeAnswer = 0;
  var state = {
    likeCount: 0,
    likedByDevice: false
  };

  function safeGet(key, fallback) {
    try {
      var value = window.localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (err) {
      return fallback;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (err) {
      return false;
    }
  }

  function generateDeviceId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "dev_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
  }

  function normalizeDeviceId(raw) {
    if (typeof raw !== "string") {
      return "";
    }
    var cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120);
    return cleaned.length >= 8 ? cleaned : "";
  }

  function getDeviceId() {
    var existing = normalizeDeviceId(safeGet(deviceIdKey, ""));
    if (existing) {
      return existing;
    }

    var fresh = normalizeDeviceId(generateDeviceId());
    if (!fresh) {
      fresh = "dev_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
    }
    safeSet(deviceIdKey, fresh);
    return fresh;
  }

  function likeLabel(count) {
    return count === 1 ? "1 like" : count + " likes";
  }

  function toCount(value) {
    var parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return parsed;
  }

  function refreshLikeUi() {
    likeButton.classList.toggle("is-liked", state.likedByDevice);
    likeButton.setAttribute("aria-pressed", state.likedByDevice ? "true" : "false");
    likeButton.textContent = state.likedByDevice ? "👍 Liked" : "👍 Like";
    likeCountEl.textContent = likeLabel(state.likeCount);
  }

  function formatTimestamp(iso) {
    var date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function setNewChallenge() {
    var left = randomInt(2, 9);
    var right = randomInt(1, 8);
    currentChallengeAnswer = left + right;
    challengeLabel.textContent = "Human check: " + left + " + " + right + " = ?";
    challengeInput.value = "";
  }

  function renderComments(comments) {
    var safeComments = Array.isArray(comments) ? comments : [];
    commentsList.innerHTML = "";

    if (safeComments.length === 0) {
      emptyComments.hidden = false;
      return;
    }

    emptyComments.hidden = true;

    safeComments.forEach(function (entry) {
      var item = document.createElement("article");
      item.className = "comment-item";

      var meta = document.createElement("div");
      meta.className = "comment-meta";

      var author = document.createElement("strong");
      author.className = "comment-author";
      author.textContent = typeof entry.name === "string" ? entry.name : "Anonymous";

      var time = document.createElement("time");
      time.className = "comment-time";
      time.dateTime = typeof entry.createdAt === "string" ? entry.createdAt : "";
      time.textContent = formatTimestamp(entry.createdAt);

      var text = document.createElement("p");
      text.className = "comment-text";
      text.textContent = typeof entry.comment === "string" ? entry.comment : "";

      meta.appendChild(author);
      meta.appendChild(time);
      item.appendChild(meta);
      item.appendChild(text);
      commentsList.appendChild(item);
    });
  }

  async function parseJsonResponse(response) {
    var text = await response.text();
    if (!text) {
      return {};
    }
    try {
      return JSON.parse(text);
    } catch (err) {
      throw new Error("Invalid server response");
    }
  }

  async function fetchJson(path, options) {
    var response = await fetch(path, options || {});
    var data = await parseJsonResponse(response);
    if (!response.ok) {
      var serverMessage = data && typeof data.error === "string" ? data.error : "";
      throw new Error(serverMessage || "Request failed");
    }
    return data;
  }

  async function loadStoryState() {
    var data = await fetchJson(apiBase + "?deviceId=" + encodeURIComponent(deviceId), {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

    state.likeCount = toCount(data.likeCount);
    state.likedByDevice = Boolean(data.likedByDevice);
    refreshLikeUi();
    renderComments(data.comments);
  }

  async function setLike(nextLikeState) {
    var data = await fetchJson(apiBase + "/like", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        deviceId: deviceId,
        like: nextLikeState
      })
    });

    state.likeCount = toCount(data.likeCount);
    state.likedByDevice = Boolean(data.likedByDevice);
    refreshLikeUi();
  }

  likeButton.addEventListener("click", async function () {
    likeButton.disabled = true;
    try {
      await setLike(!state.likedByDevice);
      feedback.textContent = "";
    } catch (err) {
      feedback.textContent = "Unable to update like right now. Please try again.";
    } finally {
      likeButton.disabled = false;
    }
  });

  commentForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    var name = nameInput.value.trim();
    var comment = commentInput.value.trim();
    var challengeValue = Number.parseInt(challengeInput.value.trim(), 10);

    if (!name || !comment) {
      feedback.textContent = "Please enter both your name and comment.";
      return;
    }

    if (!Number.isFinite(challengeValue) || challengeValue !== currentChallengeAnswer) {
      feedback.textContent = "Please solve the human check correctly.";
      setNewChallenge();
      challengeInput.focus();
      return;
    }

    var submitButton = commentForm.querySelector("button[type='submit']");
    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      await fetchJson(apiBase + "/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          name: name,
          comment: comment
        })
      });

      nameInput.value = "";
      commentInput.value = "";
      setNewChallenge();

      try {
        await loadStoryState();
        feedback.textContent = "Thanks! Your comment has been added.";
      } catch (refreshErr) {
        feedback.textContent = "Comment saved. Please refresh to load the latest comments.";
      }

      nameInput.focus();
    } catch (err) {
      feedback.textContent = err && err.message ? err.message : "Unable to post comment right now.";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });

  challengeRefresh.addEventListener("click", function () {
    setNewChallenge();
    challengeInput.focus();
  });

  var deviceId = getDeviceId();
  setNewChallenge();
  loadStoryState().catch(function () {
    refreshLikeUi();
    renderComments([]);
    feedback.textContent = "Could not load likes and comments from the server.";
  });
})();
