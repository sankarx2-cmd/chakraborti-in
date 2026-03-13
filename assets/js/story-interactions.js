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
  var commentsList = document.getElementById("comments-list");
  var emptyComments = document.getElementById("comments-empty");
  var feedback = document.getElementById("comment-feedback");

  if (
    !likeButton ||
    !likeCountEl ||
    !commentForm ||
    !nameInput ||
    !commentInput ||
    !commentsList ||
    !emptyComments ||
    !feedback
  ) {
    return;
  }

  var likeCountKey = "chakraborti_story_" + storyId + "_likes";
  var likedKey = "chakraborti_story_" + storyId + "_liked";
  var commentsKey = "chakraborti_story_" + storyId + "_comments";

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

  function readLikeCount() {
    var raw = safeGet(likeCountKey, "0");
    var parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return parsed;
  }

  function readLiked() {
    return safeGet(likedKey, "0") === "1";
  }

  function writeLikeCount(count) {
    safeSet(likeCountKey, String(count));
  }

  function writeLiked(liked) {
    safeSet(likedKey, liked ? "1" : "0");
  }

  function likeLabel(count) {
    return count === 1 ? "1 like" : count + " likes";
  }

  function refreshLikeUi() {
    var count = readLikeCount();
    var liked = readLiked();

    likeButton.classList.toggle("is-liked", liked);
    likeButton.setAttribute("aria-pressed", liked ? "true" : "false");
    likeButton.textContent = liked ? "👍 Liked" : "👍 Like";
    likeCountEl.textContent = likeLabel(count);
  }

  function readComments() {
    var raw = safeGet(commentsKey, "[]");
    try {
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .filter(function (entry) {
          return (
            entry &&
            typeof entry.name === "string" &&
            typeof entry.comment === "string" &&
            typeof entry.createdAt === "string"
          );
        })
        .slice(0, 200);
    } catch (err) {
      return [];
    }
  }

  function writeComments(comments) {
    safeSet(commentsKey, JSON.stringify(comments));
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

  function renderComments() {
    var comments = readComments();
    commentsList.innerHTML = "";

    if (comments.length === 0) {
      emptyComments.hidden = false;
      return;
    }

    emptyComments.hidden = true;

    comments.forEach(function (entry) {
      var item = document.createElement("article");
      item.className = "comment-item";

      var meta = document.createElement("div");
      meta.className = "comment-meta";

      var author = document.createElement("strong");
      author.className = "comment-author";
      author.textContent = entry.name;

      var time = document.createElement("time");
      time.className = "comment-time";
      time.dateTime = entry.createdAt;
      time.textContent = formatTimestamp(entry.createdAt);

      var text = document.createElement("p");
      text.className = "comment-text";
      text.textContent = entry.comment;

      meta.appendChild(author);
      meta.appendChild(time);
      item.appendChild(meta);
      item.appendChild(text);
      commentsList.appendChild(item);
    });
  }

  likeButton.addEventListener("click", function () {
    var count = readLikeCount();
    var liked = readLiked();

    if (liked) {
      count = Math.max(0, count - 1);
    } else {
      count += 1;
    }

    writeLikeCount(count);
    writeLiked(!liked);
    refreshLikeUi();
  });

  commentForm.addEventListener("submit", function (event) {
    event.preventDefault();

    var name = nameInput.value.trim();
    var comment = commentInput.value.trim();

    if (!name || !comment) {
      feedback.textContent = "Please enter both your name and comment.";
      return;
    }

    var comments = readComments();
    comments.unshift({
      name: name,
      comment: comment,
      createdAt: new Date().toISOString()
    });

    writeComments(comments);
    commentInput.value = "";
    feedback.textContent = "Thanks! Your comment has been added.";
    renderComments();
    commentInput.focus();
  });

  refreshLikeUi();
  renderComments();
})();
