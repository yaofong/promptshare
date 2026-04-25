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

// ---- Render cards ----
function render() {
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
    <div class="prompt-card" data-id="${p.id}">
      <div class="prompt-card__header">
        <h3 class="prompt-card__title">${escHtml(p.title)}</h3>
        <span class="prompt-card__category">${getCategoryEmoji(p.category)} ${p.category}</span>
      </div>
      ${p.description ? `<p class="prompt-card__desc">${escHtml(p.description)}</p>` : ''}
      <div class="prompt-card__content" id="content-${p.id}">${escHtml(p.content)}</div>
      <div class="prompt-card__footer">
        <div class="prompt-card__meta">
          <span>By ${p.author || 'Anonymous'}</span>
          <span>${formatDate(p.createdAt)}</span>
        </div>
        <div class="prompt-card__actions">
          <button class="prompt-card__action" onclick="toggleExpand('${p.id}')">📖 Expand</button>
          <button class="prompt-card__action" onclick="copyPrompt('${p.id}')">📋 Copy</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ---- Helpers ----
function escHtml(str) {
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

// ---- Toggle expand ----
function toggleExpand(id) {
  const el = document.getElementById(`content-${id}`);
  if (!el) return;
  el.classList.toggle('prompt-card__content--expanded');
  const btn = el.closest('.prompt-card').querySelector('.prompt-card__action:first-child');
  btn.textContent = el.classList.contains('prompt-card__content--expanded') ? '🔺 Collapse' : '📖 Expand';
}

// ---- Copy ----
function copyPrompt(id) {
  const p = prompts.find(x => x.id === id);
  if (!p) return;
  navigator.clipboard.writeText(p.content).then(() => {
    showToast('📋 Copied to clipboard!');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = p.content;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('📋 Copied!');
  });
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

// ---- Form submit ----
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

  render();
  showToast('🌟 Prompt shared successfully!');

  // Scroll to browse
  document.getElementById('browse').scrollIntoView({ behavior: 'smooth' });
});

// ---- Reset form after sharing ----
document.querySelector('.form__success').addEventListener('click', () => {
  form.reset();
  form.style.display = 'block';
  formSuccess.style.display = 'none';
});

// ---- Filter events ----
searchInput.addEventListener('input', render);
filterSelect.addEventListener('change', render);

// ---- Init ----
loadPrompts();
render();
