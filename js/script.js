// Use this URL to fetch NASA APOD JSON data (mirror with many entries).
// If your instructor provided a different endpoint, keep that one.
const apodData = 'https://cdn.jsdelivr.net/gh/GCA-Classroom/apod/data.json';

// Elements
const startInput = document.getElementById('startDate');
const endInput   = document.getElementById('endDate');
const button     = document.getElementById('getImageBtn');
const gallery    = document.getElementById('gallery');
const statusBox  = document.getElementById('status');

// Modal elements
const modal          = document.getElementById('modal');
const modalMedia     = document.getElementById('modalMedia');
const modalTitle     = document.getElementById('modalTitle');
const modalDate      = document.getElementById('modalDate');
const modalExplain   = document.getElementById('modalExplain');
const modalLinks     = document.getElementById('modalLinks');

// Random fact bar
const factBar = document.getElementById('factBar');

// Simple space facts (Extra Credit: Random Fact)
const SPACE_FACTS = [
  "Neutron stars can spin 600 times per second.",
  "Jupiter’s Great Red Spot is a storm at least 300 years old.",
  "A day on Venus is longer than its year.",
  "There are more trees on Earth than stars in the Milky Way (by most estimates).",
  "Saturn could float in water because it’s mostly hydrogen and helium.",
  "Olympus Mons on Mars is ~3× the height of Mount Everest.",
  "If you could travel at light speed, the nearest star (Proxima Centauri) would still be over 4 years away.",
  "Space is not empty—there’s about one atom per cubic centimeter on average.",
  "The Sun accounts for ~99.86% of the Solar System’s mass.",
  "We see galaxies as they were in the past—light takes millions or billions of years to reach us."
];

// Helpers
const fmt = (d) => d.toISOString().slice(0,10);
function clampToToday(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  return d > today ? fmt(today) : fmt(d);
}
function showStatus(message, isLoading = false) {
  statusBox.innerHTML = isLoading
    ? `<div class="loading">🔄 ${message}</div>`
    : (message ? `<div>${message}</div>` : '');
}

function pickRandomFact() {
  const fact = SPACE_FACTS[Math.floor(Math.random() * SPACE_FACTS.length)];
  factBar.textContent = `💡 Did you know? ${fact}`;
}

// Default dates: last 7 days
(function setDefaultDates() {
  const today = new Date();
  const sevenAgo = new Date(); sevenAgo.setDate(today.getDate() - 7);
  endInput.value   = fmt(today);
  startInput.value = fmt(sevenAgo);
  endInput.max = fmt(today);
  startInput.max = fmt(today);
})();

// Accessibility: close modal with ESC or click on backdrop / close button
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal();
});
modal.addEventListener('click', (e) => {
  if (e.target.matches('[data-close]')) closeModal();
});
function openModal() {
  modal.setAttribute('aria-hidden', 'false');
  // Basic focus management
  document.querySelector('.modal-close')?.focus();
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  modal.setAttribute('aria-hidden', 'true');
  modalMedia.innerHTML = '';
  modalTitle.textContent = '';
  modalDate.textContent = '';
  modalExplain.textContent = '';
  modalLinks.innerHTML = '';
  document.body.style.overflow = '';
}

function isWithinRange(dateStr, startStr, endStr) {
  return dateStr >= startStr && dateStr <= endStr;
}

function cardTemplate(item) {
  const isVideo = item.media_type === 'video';
  const thumbSrc = isVideo
    ? // Try to extract a YouTube thumbnail if possible; otherwise fallback to a generic thumbnail
      (item.thumbnail_url || (item.url?.includes('youtube') ? youTubeThumb(item.url) : null))
    : (item.url || item.hdurl);

  const imgAlt = isVideo
    ? `Video thumbnail for ${item.title}`
    : (item.title || 'APOD image');

  return `
    <article class="gallery-item" tabindex="0" role="button" aria-label="Open details for ${escapeHtml(item.title || 'APOD')}">
      <div class="gallery-thumb-wrap">
        ${thumbSrc
          ? `<img src="${thumbSrc}" alt="${escapeHtml(imgAlt)}" loading="lazy" />`
          : `<div style="height:220px;display:flex;align-items:center;justify-content:center;color:#fff;background:#000;">No preview</div>`
        }
        ${isVideo ? `<span class="badge">VIDEO</span>` : ``}
      </div>
      <h3>${escapeHtml(item.title || 'Untitled')}</h3>
      <div class="meta">${escapeHtml(item.date || '')}</div>
    </article>
  `;
}

function youTubeThumb(url) {
  try {
    const u = new URL(url);
    // Support youtu.be or youtube.com/watch?v=
    let id = u.searchParams.get('v');
    if (!id && u.hostname.includes('youtu.be')) {
      id = u.pathname.slice(1);
    }
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  } catch { return null; }
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[m]));
}

function renderGallery(items) {
  if (!items.length) {
    gallery.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">🛰️</div>
        <p>No results for this date range. Try widening your search.</p>
      </div>`;
    return;
  }
  // Sort newest → oldest
  items.sort((a,b) => (a.date < b.date ? 1 : -1));

  gallery.innerHTML = items.map(cardTemplate).join('');

  // Wire up item clicks (open modal)
  const cards = gallery.querySelectorAll('.gallery-item');
  cards.forEach((card, idx) => {
    const item = items[idx];
    const open = () => showInModal(item);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });
}

function showInModal(item) {
  modalMedia.innerHTML = '';
  modalLinks.innerHTML = '';

  const isVideo = item.media_type === 'video';
  if (isVideo && item.url) {
    // Extra Credit: embed YouTube when possible; else show link
    let iframe = '';
    try {
      const u = new URL(item.url);
      if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
        const id = youTubeIdFromUrl(item.url);
        if (id) {
          iframe = `
            <iframe
              src="https://www.youtube.com/embed/${id}"
              title="${escapeHtml(item.title || 'APOD Video')}"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
            ></iframe>`;
        }
      }
    } catch {}
    if (iframe) {
      modalMedia.innerHTML = iframe;
    } else {
      // Fallback: clickable link
      modalMedia.innerHTML = `<div style="height:520px;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;">
        <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="color:#fff;text-decoration:underline;">Open Video</a>
      </div>`;
    }
  } else {
    const largeSrc = item.hdurl || item.url;
    if (largeSrc) {
      const img = document.createElement('img');
      img.src = largeSrc;
      img.alt = item.title || 'APOD image';
      img.loading = 'eager';
      modalMedia.appendChild(img);
    } else {
      modalMedia.innerHTML = `<div style="height:520px;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;">No image available</div>`;
    }
  }

  modalTitle.textContent = item.title || 'Untitled';
  modalDate.textContent  = item.date || '';
  modalExplain.textContent = item.explanation || '';

  // Links (HD, Original, Copyright)
  if (item.hdurl) {
    modalLinks.insertAdjacentHTML('beforeend',
      `<a href="${item.hdurl}" target="_blank" rel="noopener noreferrer">View HD</a>`);
  }
  if (item.url && item.url !== item.hdurl) {
    modalLinks.insertAdjacentHTML('beforeend',
      `<a href="${item.url}" target="_blank" rel="noopener noreferrer">Open Source</a>`);
  }
  if (item.copyright) {
    modalLinks.insertAdjacentHTML('beforeend',
      `<span class="muted" style="align-self:center;">© ${escapeHtml(item.copyright)}</span>`);
  }

  openModal();
}

function youTubeIdFromUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch {}
  return null;
}

// Fetch & display
async function fetchApodRange() {
  const start = clampToToday(startInput.value || startInput.min || startInput.max || '');
  const end   = clampToToday(endInput.value || endInput.max || '');

  if (!start || !end) {
    showStatus('Please select both a start and end date.');
    return;
  }
  if (start > end) {
    showStatus('Start date must be before end date.');
    return;
  }

  showStatus('Loading space photos…', true);
  gallery.innerHTML = '';

  try {
    const res = await fetch(apodData, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Expecting an array of APOD entries (date, title, url, hdurl, explanation, media_type)
    const results = (Array.isArray(data) ? data : [])
      .filter(item => item && item.date && isWithinRange(item.date, start, end));

    renderGallery(results);
    showStatus('');
  } catch (err) {
    console.error(err);
    showStatus('Sorry, we could not load APOD data right now. Please try again.');
  }
}

button.addEventListener('click', fetchApodRange);
pickRandomFact();