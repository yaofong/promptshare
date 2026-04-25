# PromptShare

A public prompt-sharing website — **anyone on the internet can see and share prompts**.

Powered by **Cloudflare Workers + KV** for global, always-on, zero-cost hosting.

## 🚀 One-Command Deploy

```bash
npm install
npx wrangler deploy
```

That's it. Your site goes live at `https://promptshare.<your-subdomain>.workers.dev`.

### Prerequisites

1. A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
2. Create a KV namespace:
   ```bash
   npx wrangler kv:namespace create PROMPTSHARE_KV
   ```
3. Copy the `id` from the output and paste it into `wrangler.toml`:
   ```toml
   [[kv_namespaces]]
   binding = "PROMPTSHARE_KV"
   id = "YOUR_PRODUCTION_ID"
   ```

## 🏃 Local Development

```bash
npm install
npx wrangler dev
# Open http://localhost:8787
```

## 📡 API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/prompts` | List all prompts (lightweight, no content) |
| `GET` | `/api/prompts/:id` | Get single prompt (full content) |
| `POST` | `/api/prompts` | Create a prompt |

### POST body

```json
{
  "title": "Code Review Assistant",
  "category": "coding",
  "author": "Jane",
  "content": "You are a senior code reviewer...",
  "description": "Reviews pull requests"
}
```

## 🏗️ Architecture

```
Browser → Cloudflare Worker (Hono)
            ├── /api/*      → KV (persistent storage)
            └── /*          → Static assets (HTML/CSS/JS)
```

- **Hono** — lightweight web framework for Workers
- **Workers KV** — globally distributed key-value storage
- **Static assets** — served by wrangler `[assets]` config
- **Free tier**: 100K req/day, 1GB KV storage — more than enough

## 💰 Cost

**$0/month** on Cloudflare's free tier for any reasonable usage.
