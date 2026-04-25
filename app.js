/* -------------------------------
   PromptShare — App Logic
   ------------------------------- */

// ---- State ----
let prompts = [];

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

// ---- Storage key ----
const STORAGE_KEY = 'promptshare_prompts';

// ---- Load from localStorage ----
function loadPrompts() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        prompts = parsed;
        console.log(`[PromptShare] Loaded ${prompts.length} prompts from storage`);
        updateStorageBadge();
        return;
      }
    }
    // Try legacy key
    const legacy = localStorage.getItem('promptshare_data');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed) && parsed.length > 0) {
        prompts = parsed;
        localStorage.setItem(STORAGE_KEY, legacy);
        localStorage.removeItem('promptshare_data');
        console.log(`[PromptShare] Migrated ${prompts.length} prompts from legacy key`);
        updateStorageBadge();
        return;
      }
    }
    prompts = [];
    console.log('[PromptShare] No stored prompts found');
  } catch (e) {
    console.error('[PromptShare] Load error:', e);
    prompts = [];
  }
  updateStorageBadge();
}

// ---- Save to localStorage ----
function savePrompts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    console.log(`[PromptShare] Saved ${prompts.length} prompts`);
    updateStorageBadge();
  } catch (e) {
    console.error('[PromptShare] Save error:', e);
    showToast('⚠️ Storage full! Try exporting some prompts.');
  }
}

// ---- Update live badge showing prompt count ----
function updateStorageBadge() {
  if (storageStatus) {
    const count = prompts.length;
    if (count > 0) {
      storageStatus.textContent = `${count} prompt${count > 1 ? 's' : ''} saved 💾`;
      storageStatus.className = 'storage-badge storage-badge--active';
    } else {
      storageStatus.textContent = 'No prompts yet';
      storageStatus.className = 'storage-badge';
    }
  }
}

// ---- Generate ID ----
function genId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  const extra = Math.random().toString(36).slice(2, 5);
  return `${ts}-${rand}${extra}`;
}

// ---- Format date ----
function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ---- Esc HTML ----
function escHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- Category helpers ----
function getCategoryEmoji(cat) {
  const map = {
    coding: '💻', writing: '✍️', creative: '🎨',
    business: '💼', education: '📚', productivity: '⚡',
    fun: '🎮', other: '📌'
  };
  return map[cat] || '📌';
}

// ---- Toast ----
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

// ==========================================
//  ROUTING
// ==========================================

function navigate() {
  const hash = location.hash || '';

  // Detail route: #/prompt/ID
  const detailMatch = hash.match(/^#\/prompt\/(.+)$/);
  if (detailMatch) {
    const id = detailMatch[1];
    const prompt = prompts.find(p => p.id === id);
    if (prompt) {
      showDetail(prompt);
      return;
    }
    // Not found → browse
    location.hash = '#browse';
    return;
  }

  // Show browse view
  showBrowse();

  // Scroll to section if hash matches
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
//  RENDER GRID (browse view)
// ==========================================

function renderGrid() {
  const query = searchInput.value.toLowerCase().trim();
  const cat = filterSelect.value;

  let filtered = prompts.slice(); // copy

  if (cat !== 'all') {
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
          <p class="prompt-grid__empty-text">No prompts yet.</p>
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

  // Sort newest first
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

function copyToClipboard(text, msg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(msg || '📋 Copied to clipboard!');
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
    showToast('⚠️ Could not copy');
  }
  document.body.removeChild(ta);
}

// ==========================================
//  FORM SUBMIT
// ==========================================

form.addEventListener('submit', (e) => {
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

  const prompt = {
    id: genId(),
    title,
    category,
    author: author || 'Anonymous',
    content,
    description,
    createdAt: Date.now(),
  };

  prompts.unshift(prompt);
  savePrompts();

  // Show success
  form.style.display = 'none';
  formSuccess.style.display = 'block';
  formSuccess.innerHTML = `
    <div class="form__success-icon">✅</div>
    <h3>Prompt Shared Successfully!</h3>
    <p>Your prompt is saved and visible below.</p>
    <p style="margin-top:16px;font-size:0.875rem;color:var(--text-muted)">
      💾 Stored in your browser — <strong>reload the page</strong> to verify it persists
    </p>
    <button class="btn btn--secondary" style="margin-top:16px" onclick="resetForm()">Submit Another</button>
  `;

  renderGrid();
  showToast('🌟 Prompt shared!');
});

function resetForm() {
  form.reset();
  form.style.display = 'block';
  formSuccess.style.display = 'none';
  // Scroll to form
  document.getElementById('submit')?.scrollIntoView({ behavior: 'smooth' });
}

// ---- Filter events ----
searchInput.addEventListener('input', renderGrid);
filterSelect.addEventListener('change', renderGrid);

// ---- Listen for hash changes ----
window.addEventListener('hashchange', navigate);

// ---- Re-save on page unload to be safe ----
window.addEventListener('beforeunload', () => {
  if (prompts.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    } catch (e) {}
  }
});

// ---- Init ----
loadPrompts();
navigate();
