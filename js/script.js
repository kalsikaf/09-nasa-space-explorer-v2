/* =========================================================
   NASA Space Explorer – APOD Gallery
   Uses class-provided APOD mirror feed (JSON array of entries)
   Keys: date, title, explanation, media_type, url, (hdurl), (thumbnail_url)
   ========================================================= */

const FEED_URL = window.APOD_FEED_URL; // set in index.html
const getBtn = document.getElementById('getImageBtn');
const gallery = document.getElementById('gallery');
const placeholder = document.getElementById('placeholder');
const startDateEl = document.getElementById('startDate');
const endDateEl = document.getElementById('endDate');
const factEl = document.getElementById('spaceFact');

/* ---------- Random “Did You Know?” facts (extra credit) ---------- */
const SPACE_FACTS = [
  "Jupiter is so massive it accounts for about 70% of all planetary mass in our solar system.",
  "Neutron stars can spin hundreds of times per second—faster than a kitchen blender.",
  "Space is not completely empty—there’s about one atom per cubic centimeter in interstellar space.",
  "A day on Venus is longer than its year due to its slow rotation.",
  "The Milky Way and Andromeda are on a collision course and will merge in ~4–5 billion years.",
  "Saturn could theoretically float in water—it’s less dense than liquid water.",
  "The James Webb Space Telescope observes mostly in infrared to see through cosmic dust.",
  "There are more trees on Earth than stars in the Milky Way… but not more than stars in the observable universe."
];
function showRandomFact() {
  const idx = Math.floor(Math.random() * SPACE_FACTS.length);
  factEl.textContent = `💡 Did you know? ${SPACE_FACTS[idx]}`;
}
showRandomFact();

/* ---------- Helpers ---------- */
const parseISO = (s) => new Date(s + "T00:00:00Z");
function withinRange(dateISO, startISO, endISO) {
  const d = parseISO(dateISO);
  if (startISO && d < parseISO(startISO)) return false;
  if (endISO && d > parseISO(endISO)) return false;
  return true;
}
function prettyDate(iso) {
  const d = parseISO(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ---------- Loading UI ---------- */
function showLoading() {
  gallery.innerHTML = `
    <div class="loading" role="status" aria-live="polite">
      <span>🔄 Loading space photos…</span>
    </div>
  `;
}
function clearLoading() {
  // no-op; renderCards will replace gallery content
}

/* ---------- Render ---------- */
function renderCards(items) {
  if (!items.length) {
    gallery.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">🛰️</div>
        <p>No results for that date range. Try widening your search.</p>
      </div>
    `;
    return;
  }

  const html = items.map((item, idx) => {
    const isVideo = item.media_type === 'video';
    const thumb = chooseThumb(item);
    const badge = isVideo ? `<span class="badge">Video</span>` : `<span class="badge">Image</span>`;
    const safeTitle = escapeHtml(item.title ?? "Untitled");
    const dateStr = prettyDate(item.date);

    return `
      <article class="card" tabindex="0" data-index="${idx}" aria-label="${safeTitle} — ${dateStr}">
        <div class="thumb-wrap">
          ${badge}
          <img class="thumb" src="${thumb}" alt="${safeTitle}" loading="lazy" />
        </div>
        <div class="card-body">
          <div class="title">${safeTitle}</div>
          <div class="meta">${dateStr}</div>
        </div>
      </article>
    `;
  }).join('');

  gallery.innerHTML = html;

  // Click & keyboard to open modal
  gallery.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => openModal(items[Number(card.dataset.index)]));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(items[Number(card.dataset.index)]);
      }
    });
  });
}

/* ---------- Choose thumbnail for videos/images ---------- */
function chooseThumb(item) {
  if (item.media_type === 'image') {
    return item.url || item.hdurl || '';
  }
  // Video: try explicit thumbnail_url if present; else derive YouTube thumbnail; fallback to placeholder frame
  if (item.thumbnail_url) return item.thumbnail_url;

  const url = item.url || '';
  const ytId = extractYouTubeId(url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;

  // Fallback: a very simple generated placeholder (transparent PNG data URL could be used; here just return URL)
  return url;
}
function extractYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
  } catch { /* ignore */ }
  return null;
}

/* ---------- Fetch, filter, sort ---------- */
async function fetchAPOD() {
  const res = await fetch(FEED_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch APOD feed: ${res.status}`);
  const data = await res.json();
  // Expect an array; if object with 'results', handle gracefully
  return Array.isArray(data) ? data : (data.results || []);
}

async function loadGallery() {
  const startISO = startDateEl.value || null;
  const endISO = endDateEl.value || null;

  showLoading();

  try {
    const all = await fetchAPOD();

    const filtered = all
      .filter(item => item.date && withinRange(item.date, startISO, endISO))
      .sort((a, b) => parseISO(b.date) - parseISO(a.date)); // newest first

    renderCards(filtered);
  } catch (err) {
    console.error(err);
    gallery.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">🚧</div>
        <p>Oops—couldn’t load the gallery right now. Please try again.</p>
      </div>
    `;
  } finally {
    clearLoading();
  }
}

/* ---------- Modal logic ---------- */
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const modalMediaWrap = document.getElementById('modalMediaWrap');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalDesc = document.getElementById('modalDesc');

function openModal(item) {
  const safeTitle = escapeHtml(item.title ?? "Untitled");
  modalTitle.textContent = safeTitle;
  modalDate.textContent = prettyDate(item.date ?? "");
  modalDesc.textContent = item.explanation ?? "";

  // Media: image or video embed / link (extra credit)
  modalMediaWrap.innerHTML = '';
  if (item.media_type === 'image') {
    const src = item.hdurl || item.url;
    const img = document.createElement('img');
    img.src = src;
    img.alt = safeTitle;
    modalMediaWrap.appendChild(img);
  } else if (item.media_type === 'video') {
    const url = item.url || '';
    const ytId = extractYouTubeId(url);
    if (ytId) {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${ytId}`;
      iframe.title = safeTitle;
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.style.aspectRatio = '16 / 9';
      modalMediaWrap.appendChild(iframe);
    } else {
      // Non-YouTube video: show thumbnail if present + link
      const thumb = chooseThumb(item);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = 'Open video';
      if (thumb) {
        const img = document.createElement('img');
        img.src = thumb;
        img.alt = `${safeTitle} (video thumbnail)`;
        modalMediaWrap.appendChild(img);
      }
      const p = document.createElement('p');
      p.style.padding = '12px 16px';
      p.appendChild(a);
      modalMediaWrap.appendChild(p);
    }
  }

  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  modalClose.focus();
}
function closeModal() {
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target.hasAttribute('data-close-modal')) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal();
});

/* ---------- Events ---------- */
getBtn.addEventListener('click', () => {
  if (placeholder) placeholder.remove();
  loadGallery();
});

/* ---------- Defaults ---------- */
/* Pre-fill dates with a recent 14-day window to make testing instant */
(function presetDates() {
  const today = new Date();
  const endISO = today.toISOString().slice(0, 10);
  const start = new Date(today);
  start.setDate(start.getDate() - 13);
  const startISO = start.toISOString().slice(0, 10);
  startDateEl.value = startISO;
  endDateEl.value = endISO;
})();

/* ---------- Misc ---------- */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])
  );
}