/**
 * PromptShare — Cloudflare Worker API (Hono + KV)
 * Static frontend is served automatically by wrangler [assets].
 * 
 * API:
 *   GET  /api/prompts      → list all (lightweight index)
 *   GET  /api/prompts/:id   → single prompt (full content)
 *   POST /api/prompts       → create a prompt
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// CORS for API routes
app.use('/api/*', cors())

// =========================================================================
//  KV Helpers
// =========================================================================

async function listPrompts(env) {
  const raw = await env.PROMPTSHARE_KV.get('prompts:index')
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function getPrompt(env, id) {
  const raw = await env.PROMPTSHARE_KV.get(`prompt:${id}`)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function addPrompt(env, prompt) {
  // Write full prompt under its ID
  await env.PROMPTSHARE_KV.put(`prompt:${prompt.id}`, JSON.stringify(prompt))

  // Update the lightweight index (newest first)
  const index = await listPrompts(env)
  index.unshift({
    id: prompt.id,
    title: prompt.title,
    category: prompt.category,
    author: prompt.author,
    description: prompt.description,
    createdAt: prompt.createdAt,
  })

  // Prune to 10,000 max
  if (index.length > 10000) index.length = 10000

  await env.PROMPTSHARE_KV.put('prompts:index', JSON.stringify(index))
  return prompt
}

// =========================================================================
//  API Routes
// =========================================================================

// GET /api/prompts — list all prompts (no content field)
app.get('/api/prompts', async (c) => {
  const prompts = await listPrompts(c.env)
  return c.json(prompts)
})

// GET /api/prompts/:id — single prompt with full content
app.get('/api/prompts/:id', async (c) => {
  const id = c.req.param('id')
  const prompt = await getPrompt(c.env, id)
  if (!prompt) return c.json({ error: 'Prompt not found' }, 404)
  return c.json(prompt)
})

// POST /api/prompts — create a prompt
app.post('/api/prompts', async (c) => {
  let body
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { title, category, author, content, description } = body

  // Validation
  if (!title?.trim()) return c.json({ error: 'Title is required' }, 400)
  if (!category) return c.json({ error: 'Category is required' }, 400)
  if (!content?.trim()) return c.json({ error: 'Content is required' }, 400)

  // Max 50KB per prompt
  if (content.length > 50000) {
    return c.json({ error: 'Prompt too long (max 50,000 characters)' }, 400)
  }

  const prompt = {
    id: crypto.randomUUID(),
    title: title.trim(),
    category,
    author: (author || '').trim() || 'Anonymous',
    content: content.trim(),
    description: (description || '').trim(),
    createdAt: Date.now(),
  }

  await addPrompt(c.env, prompt)
  return c.json(prompt, 201)
})

// =========================================================================
//  Let [assets] handle static files (don't define catch-all routes)
// =========================================================================

export default app
