CREATE TABLE IF NOT EXISTS story_likes (
  story_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (story_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_story_likes_story_id ON story_likes (story_id);

CREATE TABLE IF NOT EXISTS story_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id TEXT NOT NULL,
  commenter_name TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_story_comments_story_id_id ON story_comments (story_id, id DESC);
