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

// ---- Load from localStorage ----
function loadPrompts() {
  try {
    const stored = localStorage.getItem('promptshare_data');
    if (stored) prompts = JSON.parse(stored);
  } catch (e) {
    prompts = [];
  }
}

// ---- Save to localStorage ----
function savePrompts() {
  localStorage.setItem('promptshare_data', JSON.stringify(prompts));
}

// ---- Generate ID ----
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ---- Format date ----
function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---- Esc HTML ----
function escHtml(str) {
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
  toast._timeout = setTimeout(() => toast.classList.remove('toast--visible'), 2500);
}

// ==========================================
//  ROUTING
// ==========================================

function navigate() {
  const hash = location.hash || '#browse';

  // Detail route: #/prompt/ID
  const detailMatch = hash.match(/^#\/prompt\/(.+)$/);
  if (detailMatch) {
    const id = detailMatch[1];
    const prompt = prompts.find(p => p.id === id);
    if (prompt) {
      showDetail(prompt);
      return;
    }
    // If not found, fall back to browse
    location.hash = '#browse';
    return;
  }

  // Default: show browse view
  showBrowse();
}

function showBrowse() {
  viewDetail.classList.add('view--hidden');
  viewBrowse.classList.remove('view--hidden');
  document.title = 'PromptShare — Share Prompts Publicly';
  renderGrid();
  // Scroll to browse section if hash is #browse
  if (location.hash === '#browse') {
    setTimeout(() => {
      document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }
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

  // Scroll to top of detail
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
//  RENDER GRID (browse view)
// ==========================================

function renderGrid() {
  const query = searchInput.value.toLowerCase().trim();
  const cat = filterSelect.value;

  let filtered = prompts;

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
    grid.innerHTML = `
      <div class="prompt-grid__empty">
        <span class="prompt-grid__empty-icon">${prompts.length === 0 ? '📝' : '🔍'}</span>
        <p>${prompts.length === 0 ? 'No prompts yet. Be the first to share one!' : 'No prompts match your search.'}</p>
      </div>
    `;
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

function copyDetail() {
  const id = location.hash.match(/^#\/prompt\/(.+)$/)[1];
  const p = prompts.find(x => x.id === id);
  if (!p) return;
  navigator.clipboard.writeText(p.content).then(() => {
    showToast('📋 Copied to clipboard!');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = p.content;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('📋 Copied!');
  });
}

function shareDetail() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    showToast('🔗 Link copied! Share it anywhere.');
  }).catch(() => {
    showToast(`🔗 ${url}`);
  });
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

  if (!title || !category || !content) return;

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

  // Show success, hide form
  form.style.display = 'none';
  formSuccess.style.display = 'block';

  renderGrid();
  showToast('🌟 Prompt shared successfully!');
});

// Reset form after sharing
formSuccess.addEventListener('click', () => {
  form.reset();
  form.style.display = 'block';
  formSuccess.style.display = 'none';
});

// ---- Filter events ----
searchInput.addEventListener('input', renderGrid);
filterSelect.addEventListener('change', renderGrid);

// ---- Listen for hash changes ----
window.addEventListener('hashchange', navigate);

// ---- Init ----
loadPrompts();
navigate();
