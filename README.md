# PromptShare

A simple, beautiful website for sharing AI prompts publicly.

## Features

- 📝 Submit prompts with title, category, and content
- 🔍 Search and filter prompts by category
- 📋 One-click copy to clipboard
- 🌙 Dark theme, modern design
- 💾 Data stored in your browser (no backend needed)

## How to Deploy

### Option 1: GitHub Pages (Free, Recommended)

1. Create a repo on GitHub
2. Push these files to the repo
3. Go to **Settings → Pages** → select `main` branch
4. Your site is live at `https://yourusername.github.io/repo-name`

### Option 2: Netlify (Drag & Drop)

1. Go to [netlify.com](https://netlify.com)
2. Drag this folder onto the deploy area
3. Done — instant URL

### Option 3: Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import this project
3. Deploy

## Local Preview

```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

## Tech

- Pure HTML + CSS + JavaScript
- No frameworks, no dependencies
- localStorage for data persistence
- Works fully offline
