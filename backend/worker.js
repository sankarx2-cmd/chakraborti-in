export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      return json(
        {
          error: "Unexpected server error",
          details: error && error.message ? error.message : String(error)
        },
        500
      );
    }
  }
};

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "Content-Type"
};

async function handleRequest(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: JSON_HEADERS });
  }

  if (!env || !env.DB) {
    return json({ error: "D1 database binding DB is missing" }, 500);
  }

  const url = new URL(request.url);
  const path = trimTrailingSlash(url.pathname);

  if (path === "/api/health" && request.method === "GET") {
    return json({ ok: true });
  }

  if (path === "/api/stories" && request.method === "GET") {
    return handleStorySummary(url, env);
  }

  const storyRoute = parseStoryRoute(path);
  if (!storyRoute) {
    return json({ error: "Not found" }, 404);
  }

  const storyId = normalizeStoryId(storyRoute.storyId);
  if (!storyId) {
    return json({ error: "Invalid story id" }, 400);
  }

  if (!storyRoute.action && request.method === "GET") {
    return handleGetStory(storyId, url, env);
  }

  if (storyRoute.action === "like" && request.method === "POST") {
    return handleLike(storyId, request, env);
  }

  if (storyRoute.action === "comments" && request.method === "POST") {
    return handleComment(storyId, request, env);
  }

  return json({ error: "Not found" }, 404);
}

function trimTrailingSlash(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function parseStoryRoute(path) {
  const parts = path.split("/").filter(Boolean);
  if (parts.length < 3 || parts.length > 4 || parts[0] !== "api" || parts[1] !== "story") {
    return null;
  }

  return {
    storyId: parts[2],
    action: parts[3] || ""
  };
}

function normalizeStoryId(value) {
  if (typeof value !== "string") {
    return "";
  }
  const id = value.trim();
  return /^[a-zA-Z0-9_-]{1,64}$/.test(id) ? id : "";
}

function normalizeDeviceId(value) {
  if (typeof value !== "string") {
    return "";
  }
  const id = value.trim();
  return /^[a-zA-Z0-9_-]{8,120}$/.test(id) ? id : "";
}

function normalizeName(value) {
  if (typeof value !== "string") {
    return "";
  }
  const name = value.trim();
  if (!name || name.length > 80) {
    return "";
  }
  return name;
}

function normalizeComment(value) {
  if (typeof value !== "string") {
    return "";
  }
  const comment = value.trim();
  if (!comment || comment.length > 3000) {
    return "";
  }
  return comment;
}

function parseStoryIds(rawIds) {
  if (!rawIds) {
    return [];
  }

  const unique = new Set();
  rawIds
    .split(",")
    .map((item) => normalizeStoryId(item))
    .forEach((id) => {
      if (id) {
        unique.add(id);
      }
    });

  return Array.from(unique).slice(0, 40);
}

function toCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch (error) {
    return null;
  }
}

async function getLikeCount(env, storyId) {
  const row = await env.DB.prepare("SELECT COUNT(*) AS like_count FROM story_likes WHERE story_id = ?")
    .bind(storyId)
    .first();
  return toCount(row && row.like_count);
}

async function getLikedState(env, storyId, deviceId) {
  if (!deviceId) {
    return false;
  }

  const row = await env.DB.prepare(
    "SELECT 1 AS liked FROM story_likes WHERE story_id = ? AND device_id = ? LIMIT 1"
  )
    .bind(storyId, deviceId)
    .first();

  return Boolean(row && row.liked);
}

async function getComments(env, storyId) {
  const result = await env.DB.prepare(
    `SELECT id, commenter_name, comment_text, created_at
     FROM story_comments
     WHERE story_id = ?
     ORDER BY id DESC
     LIMIT 200`
  )
    .bind(storyId)
    .all();

  const rows = result && Array.isArray(result.results) ? result.results : [];
  return rows.map((row) => ({
    id: row.id,
    name: row.commenter_name,
    comment: row.comment_text,
    createdAt: row.created_at
  }));
}

async function handleStorySummary(url, env) {
  const ids = parseStoryIds(url.searchParams.get("ids") || "");
  if (ids.length === 0) {
    return json({ stories: [] });
  }

  const placeholders = ids.map(() => "?").join(", ");
  const result = await env.DB.prepare(
    `SELECT story_id, COUNT(*) AS like_count
     FROM story_likes
     WHERE story_id IN (${placeholders})
     GROUP BY story_id`
  )
    .bind(...ids)
    .all();

  const rows = result && Array.isArray(result.results) ? result.results : [];
  const likeMap = new Map();
  rows.forEach((row) => {
    likeMap.set(row.story_id, toCount(row.like_count));
  });

  const stories = ids.map((storyId) => ({
    storyId,
    likeCount: likeMap.get(storyId) || 0
  }));

  return json({ stories });
}

async function handleGetStory(storyId, url, env) {
  const deviceId = normalizeDeviceId(url.searchParams.get("deviceId") || "");

  const [likeCount, likedByDevice, comments] = await Promise.all([
    getLikeCount(env, storyId),
    getLikedState(env, storyId, deviceId),
    getComments(env, storyId)
  ]);

  return json({
    storyId,
    likeCount,
    likedByDevice,
    comments
  });
}

async function handleLike(storyId, request, env) {
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const deviceId = normalizeDeviceId(body.deviceId);
  if (!deviceId) {
    return json({ error: "Invalid device id" }, 400);
  }

  if (typeof body.like !== "boolean") {
    return json({ error: "Field like must be true or false" }, 400);
  }

  if (body.like) {
    await env.DB.prepare(
      `INSERT INTO story_likes (story_id, device_id)
       VALUES (?, ?)
       ON CONFLICT(story_id, device_id) DO NOTHING`
    )
      .bind(storyId, deviceId)
      .run();
  } else {
    await env.DB.prepare("DELETE FROM story_likes WHERE story_id = ? AND device_id = ?")
      .bind(storyId, deviceId)
      .run();
  }

  const [likeCount, likedByDevice] = await Promise.all([
    getLikeCount(env, storyId),
    getLikedState(env, storyId, deviceId)
  ]);

  return json({
    storyId,
    likeCount,
    likedByDevice
  });
}

async function handleComment(storyId, request, env) {
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const name = normalizeName(body.name);
  const comment = normalizeComment(body.comment);

  if (!name || !comment) {
    return json({ error: "Name and comment are required" }, 400);
  }

  await env.DB.prepare(
    `INSERT INTO story_comments (story_id, commenter_name, comment_text)
     VALUES (?, ?, ?)`
  )
    .bind(storyId, name, comment)
    .run();

  return json({ ok: true });
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS
  });
}
