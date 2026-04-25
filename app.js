/* -------------------------------
   PromptShare — App Logic
   Shared via API (backend) with localStorage fallback
   ------------------------------- */

// ---- Config ----
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `http://${window.location.hostname}:${window.location.port || 3000}`
  : 'https://promptshare.yaofong.workers.dev'; // Shared backend on Cloudflare Workers

const STORAGE_KEY = 'promptshare_prompts';
const CACHE_KEY = 'promptshare_cache';

// ---- State ----
let prompts = [];
let loading = false;

// ---- DOM refs ----
const form = document.getElementById('promptForm');
const formSuccess = document.getElementById('formSuccess');
const grid = document.getElementById('promptGrid');
const searchInput = document.getElementById('searchInput');
const filterSelect = document.getElementById('filterCategory');
const viewBrowse = document.getElementById('viewBrowse');
const viewDetail = document.getElementById('viewDetail');
const detailContent = document.getElementById('detailContent');
const storageStatus = document.getElementById('storageStatus');

// ==========================================
//  API
// ==========================================

async function apiFetchPrompts() {
  const url = `${API_BASE}/api/prompts`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function apiCreatePrompt(data) {
  const url = `${API_BASE}/api/prompts`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

// ==========================================
//  Data Layer
// ==========================================

async function loadPrompts() {
  loading = true;
  updateUI();

  // Try backend API first
  try {
    const data = await apiFetchPrompts();
    if (Array.isArray(data) && data.length > 0) {
      prompts = data;
      // Cache in localStorage for offline fallback
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) {}
      console.log(`[PromptShare] Loaded ${prompts.length} prompts from API`);
      updateStorageBadge();
      loading = false;
      updateUI();
      return;
    }
  } catch (e) {
    console.warn('[PromptShare] API unavailable, trying cache:', e.message);
  }

  // Fallback: localStorage cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        prompts = parsed;
        console.log(`[PromptShare] Loaded ${prompts.length} from cache`);
        updateStorageBadge();
        loading = false;
        updateUI();
        return;
      }
    }
  } catch (e) {}

  // Legacy key
  try {
    const legacy = localStorage.getItem('promptshare_data');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed) && parsed.length > 0) {
        prompts = parsed;
        localStorage.setItem(CACHE_KEY, legacy);
        localStorage.removeItem('promptshare_data');
        console.log(`[PromptShare] Migrated ${prompts.length} from legacy`);
        updateStorageBadge();
        loading = false;
        updateUI();
        return;
      }
    }
  } catch (e) {}

  prompts = [];
  loading = false;
  updateStorageBadge();
  updateUI();
}

async function savePromptToServer(prompt) {
  // Optimistically add locally
  prompts.unshift(prompt);
  updateUI();

  // Save to API
  try {
    const saved = await apiCreatePrompt(prompt);
    // Replace local prompt with server response (has real ID)
    prompts[0] = saved;
    // Update cache
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(prompts)); } catch (e) {}
    console.log('[PromptShare] Saved to API:', saved.id);
    updateStorageBadge();
    return saved;
  } catch (e) {
    console.warn('[PromptShare] API save failed, keeping local:', e.message);
    // Keep local copy
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(prompts)); } catch (e) {}
    updateStorageBadge();
    return prompt;
  }
}

// ==========================================
//  UI Updates
// ==========================================

function updateUI() {
  renderGrid();
  updateStorageBadge();
}

function updateStorageBadge() {
  if (!storageStatus) return;
  const count = prompts.length;
  if (loading) {
    storageStatus.textContent = '⏳ Loading...';
    storageStatus.className = 'storage-badge';
    return;
  }
  if (count > 0) {
    storageStatus.textContent = `🌐 ${count} prompt${count > 1 ? 's' : ''} shared publicly`;
    storageStatus.className = 'storage-badge storage-badge--active';
  } else {
    storageStatus.textContent = '🌐 No prompts yet — be the first!';
    storageStatus.className = 'storage-badge';
  }
}

// ==========================================
//  Helpers
// ==========================================

function genId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  const extra = Math.random().toString(36).slice(2, 5);
  return `${ts}-${rand}${extra}`;
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function escHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getCategoryEmoji(cat) {
  const map = {
    coding: '💻', writing: '✍️', creative: '🎨',
    business: '💼', education: '📚', productivity: '⚡',
    fun: '🎮', other: '📌'
  };
  return map[cat] || '📌';
}

function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('toast--visible');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('toast--visible'), 3000);
}

function copyToClipboard(text, msg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(msg || '📋 Copied!');
    }).catch(() => fallbackCopy(text, msg));
  } else {
    fallbackCopy(text, msg);
  }
}

function fallbackCopy(text, msg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast(msg || '📋 Copied!');
  } catch (e) {
    showToast('⚠️ Copy failed');
  }
  document.body.removeChild(ta);
}

// ==========================================
//  ROUTING
// ==========================================

function navigate() {
  const hash = location.hash || '';

  const detailMatch = hash.match(/^#\/prompt\/(.+)$/);
  if (detailMatch) {
    const id = detailMatch[1];
    const prompt = prompts.find(p => p.id === id);
    if (prompt) {
      showDetail(prompt);
      return;
    }
    location.hash = '#browse';
    return;
  }

  showBrowse();

  if (hash === '#submit') {
    setTimeout(() => {
      document.getElementById('submit')?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  } else if (hash === '#browse') {
    setTimeout(() => {
      document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  }
}

function showBrowse() {
  viewDetail.classList.add('view--hidden');
  viewBrowse.classList.remove('view--hidden');
  document.title = 'PromptShare — Share Prompts Publicly';
  renderGrid();
}

function showDetail(prompt) {
  viewBrowse.classList.add('view--hidden');
  viewDetail.classList.remove('view--hidden');
  document.title = `${escHtml(prompt.title)} — PromptShare`;

  detailContent.innerHTML = `
    <div class="detail__header">
      <h1 class="detail__title">${escHtml(prompt.title)}</h1>
      <div class="detail__meta">
        <span class="detail__meta-item">👤 ${escHtml(prompt.author || 'Anonymous')}</span>
        <span class="detail__meta-item">📅 ${formatDate(prompt.createdAt)}</span>
        <span class="detail__category">${getCategoryEmoji(prompt.category)} ${prompt.category}</span>
      </div>
    </div>
    ${prompt.description ? `<p class="detail__description">${escHtml(prompt.description)}</p>` : ''}
    <div class="detail__content">${escHtml(prompt.content)}</div>
    <div class="detail__actions">
      <button class="btn btn--primary" onclick="copyDetail()">📋 Copy Prompt</button>
      <button class="btn btn--secondary" onclick="shareDetail()">🔗 Share Link</button>
    </div>
  `;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
//  RENDER GRID
// ==========================================

function renderGrid() {
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const cat = filterSelect ? filterSelect.value : 'all';

  let filtered = prompts.slice();

  if (cat && cat !== 'all') {
    filtered = filtered.filter(p => p.category === cat);
  }

  if (query) {
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.content.toLowerCase().includes(query) ||
      (p.description && p.description.toLowerCase().includes(query))
    );
  }

  if (filtered.length === 0) {
    if (prompts.length === 0) {
      grid.innerHTML = `
        <div class="prompt-grid__empty">
          <span class="prompt-grid__empty-icon">📝</span>
          <p class="prompt-grid__empty-text">No prompts shared yet.</p>
          <p style="color:var(--text-muted);font-size:0.875rem;">Be the first to <a href="#submit" style="color:var(--primary)">share one</a>!</p>
        </div>
      `;
    } else {
      grid.innerHTML = `
        <div class="prompt-grid__empty">
          <span class="prompt-grid__empty-icon">🔍</span>
          <p>No prompts match your search.</p>
        </div>
      `;
    }
    return;
  }

  filtered.sort((a, b) => b.createdAt - a.createdAt);

  grid.innerHTML = filtered.map(p => `
    <div class="prompt-card" onclick="openDetail('${p.id}')">
      <div class="prompt-card__header">
        <h3 class="prompt-card__title">${escHtml(p.title)}</h3>
        <span class="prompt-card__category">${getCategoryEmoji(p.category)} ${p.category}</span>
      </div>
      ${p.description ? `<p class="prompt-card__desc">${escHtml(p.description)}</p>` : ''}
      <div class="prompt-card__content">${escHtml(p.content)}</div>
      <div class="prompt-card__footer">
        <div class="prompt-card__meta">
          <span>By ${escHtml(p.author || 'Anonymous')}</span>
          <span>${formatDate(p.createdAt)}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// ==========================================
//  NAVIGATION HELPERS
// ==========================================

function openDetail(id) {
  location.hash = `#/prompt/${id}`;
}

function getCurrentPromptId() {
  const m = location.hash.match(/^#\/prompt\/(.+)$/);
  return m ? m[1] : null;
}

function copyDetail() {
  const id = getCurrentPromptId();
  const p = prompts.find(x => x.id === id);
  if (!p) { showToast('⚠️ Prompt not found'); return; }
  copyToClipboard(p.content);
}

function shareDetail() {
  const url = window.location.href.split('?')[0].split('#')[0] + location.hash;
  copyToClipboard(url, '🔗 Link copied! Share it anywhere.');
}

// ==========================================
//  FORM SUBMIT
// ==========================================

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('title').value.trim();
  const category = document.getElementById('category').value;
  const author = document.getElementById('author').value.trim();
  const content = document.getElementById('content').value.trim();
  const description = document.getElementById('description').value.trim();

  if (!title || !category || !content) {
    showToast('⚠️ Title, category, and prompt are required');
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ Sharing...';

  const prompt = {
    id: genId(),
    title,
    category,
    author: author || 'Anonymous',
    content,
    description,
    createdAt: Date.now(),
  };

  await savePromptToServer(prompt);

  // Show success
  form.style.display = 'none';
  formSuccess.style.display = 'block';
  formSuccess.innerHTML = `
    <div class="form__success-icon">✅</div>
    <h3>Prompt Shared!</h3>
    <p>Your prompt is now visible to everyone visiting the site.</p>
    <p style="margin-top:8px;font-size:0.875rem;color:var(--text-muted)">
      🌐 Shared publicly — anyone on the internet can see it
    </p>
    <button class="btn btn--secondary" style="margin-top:16px" onclick="resetForm()">Submit Another</button>
  `;

  submitBtn.disabled = false;
  submitBtn.textContent = 'Share Prompt 🌟';
  showToast('🌟 Prompt shared with the world!');
});

function resetForm() {
  form.reset();
  form.style.display = 'block';
  formSuccess.style.display = 'none';
  document.getElementById('submit')?.scrollIntoView({ behavior: 'smooth' });
}

// ---- Filter events ----
if (searchInput) searchInput.addEventListener('input', renderGrid);
if (filterSelect) filterSelect.addEventListener('change', renderGrid);

// ---- Listen for hash changes ----
window.addEventListener('hashchange', navigate);

// ---- Init ----
loadPrompts();
