const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'prompts.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve static frontend
app.use(express.static(path.join(__dirname)));

// ---- Data helpers ----

function loadPrompts() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    console.error('Error loading prompts:', e.message);
  }
  return [];
}

function savePrompts(prompts) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(prompts, null, 2), 'utf-8');
}

// ---- API Routes ----

// GET /api/prompts — list all prompts (public)
app.get('/api/prompts', (req, res) => {
  const prompts = loadPrompts();
  // Sort newest first
  prompts.sort((a, b) => b.createdAt - a.createdAt);
  res.json(prompts);
});

// GET /api/prompts/:id — get single prompt (public)
app.get('/api/prompts/:id', (req, res) => {
  const prompts = loadPrompts();
  const prompt = prompts.find(p => p.id === req.params.id);
  if (!prompt) {
    return res.status(404).json({ error: 'Prompt not found' });
  }
  res.json(prompt);
});

// POST /api/prompts — create new prompt (public)
app.post('/api/prompts', (req, res) => {
  const { title, category, author, content, description } = req.body;

  // Validate
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (!category) {
    return res.status(400).json({ error: 'Category is required' });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const prompt = {
    id: crypto.randomBytes(12).toString('hex'),
    title: title.trim(),
    category,
    author: (author || '').trim() || 'Anonymous',
    content: content.trim(),
    description: (description || '').trim(),
    createdAt: Date.now(),
  };

  const prompts = loadPrompts();
  prompts.unshift(prompt);
  savePrompts(prompts);

  console.log(`[PromptShare] New: "${prompt.title}" by ${prompt.author}`);
  res.status(201).json(prompt);
});

// ---- Error handling ----
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// ---- Start ----
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 PromptShare server running at http://localhost:${PORT}`);
  console.log(`📁 Data stored at: ${DATA_FILE}`);
});
