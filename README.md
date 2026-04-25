# PromptShare

A public prompt-sharing website — **anyone on the internet can see and share prompts**.

## 🆕 Now with Backend API!

Prompts are stored on the server, not just your browser. Everyone sees the same prompts.

## Quick Deploy

### Option 1: Render (Free, recommended)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Set:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Click **Deploy**
6. Your site is live at `https://your-app.onrender.com`

### Option 2: Fly.io

```bash
fly launch
fly deploy
```

### Option 3: Railway

1. Push to GitHub
2. Go to [railway.app](https://railway.app)
3. Deploy from GitHub repo

## Local Development

```bash
npm install
node server.js
# Open http://localhost:3000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/prompts` | List all prompts |
| `GET` | `/api/prompts/:id` | Get single prompt |
| `POST` | `/api/prompts` | Create a prompt |

## Tech Stack

- **Frontend**: HTML + CSS + Vanilla JS
- **Backend**: Node.js + Express
- **Storage**: JSON file
- **Hosting**: Any Node.js host (Render, Fly.io, Railway)
