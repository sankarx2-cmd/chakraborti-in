# Shared Likes and Comments Backend (Cloudflare)

Your website is static on GitHub Pages, so browser-only storage is local to each visitor.
This backend makes likes and comments shared across all computers.

## Files in this folder

- `worker.js`: Cloudflare Worker API (`/api/...`)
- `schema.sql`: D1 database tables

## One-time setup in Cloudflare Dashboard

1. Open Cloudflare dashboard, then go to **Workers & Pages**.
2. Create a new **D1 Database**:
   - Name: `chakraborti-db`
3. Open that D1 database and run SQL from `schema.sql` in the SQL Console.
4. Create a new **Worker** (for example: `chakraborti-api`).
5. Open Worker code editor and replace the default code with contents of `worker.js`.
6. In Worker settings, add a **D1 Binding**:
   - Variable name: `DB`
   - Database: `chakraborti-db`
7. Deploy the Worker.
8. Add Worker routes (Triggers):
   - `chakraborti.in/api/*`
   - `www.chakraborti.in/api/*`
9. In Cloudflare **DNS**, make sure both `@` and `www` records are **Proxied** (orange cloud).
   - If records are DNS-only (grey cloud), requests go directly to GitHub Pages and `/api/*` will not hit Worker.

## Quick test

Open these in browser:

- `https://chakraborti.in/api/health`
- `https://www.chakraborti.in/api/health`

Both should return JSON: `{ "ok": true }`.

If you get GitHub 404 HTML instead of JSON, Worker route or DNS proxy is not set correctly yet.

## After deploying backend

Your existing site pages will automatically start using this API:

- Story cards like count: `GET /api/stories?ids=...`
- Story page data: `GET /api/story/:storyId`
- Like toggle: `POST /api/story/:storyId/like`
- New comment: `POST /api/story/:storyId/comments`
