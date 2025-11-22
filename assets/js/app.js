// @ts-nocheck
// Deprecated shim: this legacy app.js is superseded by assets/js/app.fixed.js
// Keeping a tiny, no-op loader to avoid IDE error noise and accidental includes.
(function(){
  try { if (window.__APP_FIXED_OK__) return; } catch(_) {}
  try {
    var s = document.createElement('script');
    s.src = 'assets/js/app.fixed.js?v=' + Date.now();
    document.head.appendChild(s);
  } catch (_) {}
})();
  if (c) params.set('category', c);
  if (b) params.set('batch', b);
  try {
  const res = await fetch(`${apiBase}?action=list_vacancies&${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const items = await res.json();
      if (!items || items.length === 0) { grid.innerHTML = '<div class="empty-state"><p>No vacancies right now.</p></div>'; return; }
      grid.innerHTML = items.map(v => `
        <div class="card" style="padding:1rem;">
          <div style="display:flex;justify-content:space-between;gap:.5rem;align-items:flex-start;">
            <div>
              <div style="font-weight:700;">${v.title}</div>
              <div class="muted" style="font-size:.9rem;">${v.company || ''}${v.location ? ' • ' + v.location : ''}</div>
              ${v.category ? `<div class="muted" style="margin-top:.25rem;">Category: ${v.category}</div>` : ''}
            </div>
            ${v.application_link ? `<a class="btn small" target="_blank" rel="noopener" href="${v.application_link}">Apply</a>` : ''}
          // Clean, minimal shim for legacy inclusions.
          // Purpose: If old templates still reference `assets/js/app.js`, this file
          // will dynamically load the maintained `app.fixed.js` and provide a safe fallback
          // without executing deprecated or broken logic that previously lived here.

          (function () {
            const FIXED_SRC = 'assets/js/app.fixed.js';

            function alreadyLoaded() {
              return !!window.__MAIN_APP_INITIALIZED__;
            }

            function hasFixedTag() {
              return document.querySelector('script[data-app-fixed]');
            }

            function injectFixedScript(callback) {
              if (alreadyLoaded()) {
                callback && callback();
                return;
              }
              const existing = hasFixedTag();
              if (existing) {
                existing.addEventListener('load', () => callback && callback());
                return;
              }
              const s = document.createElement('script');
              s.src = FIXED_SRC + '?v=' + Date.now();
              s.async = true;
              s.dataset.appFixed = 'true';
              s.onload = () => callback && callback();
              document.head.appendChild(s);
            }

            function legacyMenuFallback() {
              const btn = document.getElementById('menuButton');
              const panel = document.getElementById('menuContent');
              if (!btn || !panel) return;
              if (panel.classList.contains('js-initialized')) return; // prevent double bind
              panel.classList.add('js-initialized');
              let open = false;
              function toggle(force) {
                open = typeof force === 'boolean' ? force : !open;
                panel.classList.toggle('show', open);
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');
              }
              btn.addEventListener('click', () => toggle());
              document.addEventListener('click', e => {
                if (!panel.contains(e.target) && e.target !== btn) toggle(false);
              });
              document.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
            }

            function init() {
              injectFixedScript(() => {
                if (!alreadyLoaded()) {
                  // Fallback only if the main app did not set its flag.
                  console.warn('[legacy-shim] app.fixed.js did not initialize flag; applying minimal menu fallback.');
                  legacyMenuFallback();
                }
              });
            }

            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', init);
            } else {
              init();
            }

            // Expose manual trigger for very old inline handlers
            window.__loadAppFixed = init;
          })();

          // Developer Notice:
          // This file was sanitized on 2025-11-21 to remove a large block of
          // unreachable / broken legacy code (dangling async fetch calls, duplicated
          // menu & slideshow logic). All active UI logic now resides in `app.fixed.js`.
          // If additional legacy behaviors are required, port them intentionally rather
          // than re‑adding removed fragments.

      btn.addEventListener('click', () => {
        location.hash = '#' + new URLSearchParams({
          type: type,
          year: i
        }).toString();
      });
      grid.appendChild(btn);
    }
  }

  async function loadSubjects(type, year) {
    const content = document.getElementById(`${type}-content`);
    if (!content) return;

    // Show loading state
    content.innerHTML = `
      <div class="actions" style="margin-bottom:1rem;">
        <button class="btn ghost" id="backToYears">&larr; Back to Years</button>
      </div>
      <div class="section-header">
        <h2>Select Subject</h2>
        <p class="muted">Choose a subject to view ${type}</p>
      </div>
      <div class="grid">
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading subjects...</p>
        </div>
      </div>
    `;

    // Add back button handler
    content.querySelector('#backToYears').addEventListener('click', () => {
      location.hash = '#' + new URLSearchParams({ type }).toString();
    });

    const grid = content.querySelector('.grid');
    if (!grid) return;

    try {
      // Build URL using the dynamic API base
      const url = `${API_BASE}?action=list_subjects&year_id=${encodeURIComponent(year)}`;
      // Fetch subjects from API
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`Failed to fetch subjects (${response.status}) at ${url}`);
      }
      const subjects = await response.json();
      
      // Clear loading state
      grid.innerHTML = '';

      // Subject emoji mapping
      const emojiMap = {
        'Human Anatomy and Physiology': '❤️',
        'Medicinal Biochemistry': '🧪',
        'Pharmaceutical Inorganic Chemistry': '⚗️',
        'Pharmaceutics': '💊',
        'Pathophysiology': '🩺',
        'Pharmaceutical Microbiology': '🦠',
        'Pharmaceutical Organic Chemistry': '🧫',
        'Clinical Pharmacy': '🏥',
        'Pharmacology': '💉',
        'Pharmacy Practice': '🏪',
        'Pharmacognosy': '🌿',
        'Community Pharmacy': '🏬',
        'Hospital Pharmacy': '🏨',
        'Biostatistics': '📊',
        'Pharmaceutical Biotechnology': '🧬',
        'Pharmacotherapeutics': '💊',
        'Clinical Research': '🔬',
        'Pharmacovigilance': '🛡️',
        'Clinical Toxicology': '☠️',
        'Pharmaceutical Analysis': '📏'
      };

      if (subjects.length === 0) {
        grid.innerHTML = '<p class="muted">No subjects found for this year.</p>';
        return;
      }

      // Create subject buttons
      subjects.forEach(subject => {
        const btn = document.createElement('button');
        btn.className = 'subject-btn';
        btn.dataset.subjectId = subject.id;
        btn.innerHTML = `
          <div style="font-size:1.5rem;display:inline-block;margin-right:0.5rem;vertical-align:middle;">
            ${emojiMap[subject.name] || '📚'}
          </div>
          <span>${subject.name}</span>
        `;

        btn.addEventListener('click', () => {
          location.hash = '#' + new URLSearchParams({
            type,
            year,
            subject: subject.id
          }).toString();
        });

        grid.appendChild(btn);
      });

    } catch (error) {
      console.error('Error loading subjects:', error);
      grid.innerHTML = `
        <p class="error">Failed to load subjects. ${error?.message || ''}</p>
      `;
    }
  }

  function mapResourceType(type) {
    switch (type) {
      case 'books': return 'book';
      case 'journals': return 'journal';
      case 'publications': return 'publication';
      case 'questions': return 'question';
  case 'important-questions': return 'important-question';
      case 'career': return 'career';
      case 'resources': return 'resource';
      default: return 'resource';
    }
  }

  async function loadResources(type, year, subjectId) {
    const content = document.getElementById(`${type}-content`);
    if (!content) return;

    // Show loading state with back controls
    content.innerHTML = `
      <div class="actions" style="margin-bottom:1rem;display:flex;gap:.5rem;flex-wrap:wrap;">
        <button class="btn ghost" id="backToSubjects">&larr; Back to Subjects</button>
        <button class="btn ghost" id="backToYears">&larr; Back to Years</button>
      </div>
      <div class="section-header">
        <h2>${type.charAt(0).toUpperCase() + type.slice(1)} Resources</h2>
        <p class="muted">Browse resources for the selected subject</p>
      </div>
      <div class="grid resource-cards-grid">
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading resources...</p>
        </div>
      </div>
    `;

    // Back button handlers
    content.querySelector('#backToSubjects').addEventListener('click', () => {
      location.hash = '#' + new URLSearchParams({ type, year }).toString();
    });
    content.querySelector('#backToYears').addEventListener('click', () => {
      location.hash = '#' + new URLSearchParams({ type }).toString();
    });

    const grid = content.querySelector('.grid');
    if (!grid) return;

    try {
      const resourceType = mapResourceType(type);
      const url = `${API_BASE}?action=list_resources&subject_id=${encodeURIComponent(subjectId)}&resource_type=${encodeURIComponent(resourceType)}`;
      console.log('Loading resources with URL:', url);
      console.log('Type:', type, 'Year:', year, 'Subject ID:', subjectId, 'Resource Type:', resourceType);
      
      const response = await fetch(url, { credentials: 'include' });
      console.log('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch resources (${response.status}) at ${url}`);
      }
      const resources = await response.json();
      console.log('Resources received:', resources);

      grid.innerHTML = '';

      if (!resources || resources.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 2rem;"><p class="muted">No resources found for this subject.</p></div>';
        return;
      }

      const resolveLink = (r) => {
        if (r.external_url) return r.external_url;
        if (r.file_path) {
          if (/^https?:\/\//i.test(r.file_path)) return r.file_path;
          return r.file_path.startsWith('/') ? r.file_path : '/' + r.file_path;
        }
        return null;
      };

      resources.forEach(r => {
        const link = resolveLink(r);
        const item = document.createElement('div');
        item.className = 'resource-card';
        
        // Determine file type for styling
        const getFileType = (resource) => {
          if (resource.external_url) return 'external';
          if (!resource.file_path) return 'default';
          const ext = resource.file_path.split('.').pop().toLowerCase();
          if (['pdf'].includes(ext)) return 'pdf';
          if (['doc', 'docx'].includes(ext)) return 'doc';
          if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
          if (['mp4', 'avi', 'mov'].includes(ext)) return 'video';
          return 'default';
        };
        
        const fileType = getFileType(r);
        const cardColor = r.card_color || '#0ea5e9';
        
        // Format file size
        const formatFileSize = (bytes) => {
          if (!bytes) return '';
          const sizes = ['B', 'KB', 'MB', 'GB'];
          if (bytes === 0) return '0 B';
          const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
          return Math.round(bytes / Math.pow(1024, i) * 10) / 10 + ' ' + sizes[i];
        };
        
        // Get icon based on file type
        const getIcon = (type) => {
          const icons = {
            pdf: 'picture_as_pdf',
            doc: 'description',
            image: 'image',
            video: 'video_library',
            external: 'link',
            default: 'insert_drive_file'
          };
          return icons[type] || icons.default;
        };
        
        const thumbnailHtml = r.thumbnail_path 
          ? `<img src="${r.thumbnail_path}" alt="${r.title}" class="resource-card-thumbnail">` 
          : `<span class="material-icons resource-card-icon">${getIcon(fileType)}</span>`;
        
        item.innerHTML = `
          <div class="resource-card-header ${r.thumbnail_path ? 'has-thumbnail' : 'no-thumbnail'}" 
               data-type="${fileType}" 
               style="${!r.thumbnail_path ? `background: linear-gradient(135deg, ${cardColor}, ${cardColor}CC)` : ''}">
            ${thumbnailHtml}
            <div class="resource-card-type">${fileType === 'external' ? 'Link' : (r.resource_type || 'File')}</div>
          </div>
          <div class="resource-card-body">
            <h3 class="resource-card-title">${r.title}</h3>
            <p class="resource-card-description">${r.description || 'No description available'}</p>
            <div class="resource-card-footer">
              ${link ? `
                <a href="${link}" target="_blank" rel="noopener" class="resource-card-download">
                  <span class="material-icons" style="font-size: 1rem;">download</span>
                  ${fileType === 'external' ? 'Open Link' : 'Download'}
                </a>
              ` : '<span class="muted">No link available</span>'}
              ${r.file_size ? `<span class="resource-card-size">${formatFileSize(r.file_size)}</span>` : ''}
            </div>
          </div>
        `;
        grid.appendChild(item);
      });
    } catch (error) {
      console.error('Error loading resources:', error);
      grid.innerHTML = `<p class="error">Failed to load resources. ${error?.message || ''}</p>`;
    }
  }

  // Load questions directly by year (skip subjects)
  async function loadQuestionsByYear(type, year) {
    const content = document.getElementById(`${type}-content`);
    if (!content) return;

    const titles = {
      'questions': 'Previous Year Questions',
  'important-questions': 'Important Questions'
    };
    const descriptions = {
      'questions': 'All question papers for the selected year',
  'important-questions': 'Important questions for the selected year'
    };

    // Show loading state with back controls
    content.innerHTML = `
      <div class="actions" style="margin-bottom:1rem;display:flex;gap:.5rem;flex-wrap:wrap;">
        <button class="btn ghost" id="backToYears">&larr; Back to Years</button>
      </div>
      <div class="section-header">
        <h2>${titles[type] || 'Questions'}</h2>
        <p class="muted">${descriptions[type] || 'All questions for the selected year'}</p>
      </div>
      <div class="grid">
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading ${type === 'important-questions' ? 'important questions' : 'questions'}...</p>
        </div>
      </div>
    `;

    // Back button handler
    content.querySelector('#backToYears').addEventListener('click', () => {
      location.hash = '#' + new URLSearchParams({ type }).toString();
    });

    const grid = content.querySelector('.grid');
    if (!grid) return;

    try {
      // Load questions directly by year with correct resource type
      const resourceType = mapResourceType(type);
      const resourcesUrl = `${API_BASE}?action=list_resources_by_year&year_id=${year}&resource_type=${resourceType}`;
      console.log('Loading questions with URL:', resourcesUrl);
      console.log('Resource type mapped from', type, 'to', resourceType);
      
      const resourcesResponse = await fetch(resourcesUrl, { credentials: 'include' });
      console.log('Response status:', resourcesResponse.status, resourcesResponse.statusText);
      
      if (!resourcesResponse.ok) {
        throw new Error(`Failed to fetch resources (${resourcesResponse.status})`);
      }
      const questions = await resourcesResponse.json();
      console.log('Questions received:', questions);

      grid.innerHTML = '';

      if (questions.length === 0) {
  const itemType = type === 'important-questions' ? 'important questions' : 'question papers';
        grid.innerHTML = `<p class="muted">No ${itemType} found for this year.</p>`;
        return;
      }

      const resolveLink = (r) => {
        if (r.external_url) return r.external_url;
        if (r.file_path) {
          if (/^https?:\/\//i.test(r.file_path)) return r.file_path;
          return r.file_path.startsWith('/') ? r.file_path : '/' + r.file_path;
        }
        return null;
      };

      questions.forEach(r => {
        const link = resolveLink(r);
        const item = document.createElement('div');
        item.className = 'card';
        item.style.padding = '1rem';
        item.innerHTML = `
          <div class="title" style="font-weight:600;margin-bottom:.25rem;">${r.title}</div>
          ${r.subject_name ? `<div class="muted" style="margin-bottom:.25rem;font-size:0.875rem;">Subject: ${r.subject_name}</div>` : ''}
          <div class="muted" style="margin-bottom:.75rem;">${r.description || ''}</div>
          <div class="actions" style="display:flex;gap:.5rem;">
            ${link ? `<a class="btn" href="${link}" target="_blank" rel="noopener">View</a>` : '<span class="muted">No link</span>'}
          </div>
        `;
        grid.appendChild(item);
      });
    } catch (error) {
      console.error('Error loading questions:', error);
      grid.innerHTML = `<p class="error">Failed to load questions. ${error?.message || ''}</p>`;
    }
  }

  // Load career opportunities directly
  async function loadCareerOpportunities() {
    const content = document.getElementById('career-content');
    if (!content) return;

    content.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <div>Loading career opportunities...</div>
      </div>
    `;

    try {
      const response = await fetch(`${API_BASE}?action=list_resources&resource_type=career`);
      const careers = await response.json();

      const careerGrid = document.getElementById('careerGrid');
      if (!careerGrid) return;

      if (careers && careers.length > 0) {
        careerGrid.innerHTML = careers.map(career => `
          <div class="resource-card career-card">
            <div class="resource-header">
              <h3>${career.title}</h3>
              <div class="company">${career.company_name || 'Company'}</div>
            </div>
            <div class="resource-meta">
              <span class="location">📍 ${career.location || 'Location not specified'}</span>
              <span class="deadline">📅 Apply by: ${career.deadline_date || 'No deadline specified'}</span>
            </div>
            <div class="resource-content">
              <p class="job-description">${career.description || 'No description available'}</p>
              ${career.requirements ? `<div class="requirements"><strong>Requirements:</strong> ${career.requirements}</div>` : ''}
              ${career.salary_range ? `<div class="salary"><strong>Salary:</strong> ${career.salary_range}</div>` : ''}
            </div>
            <div class="resource-actions">
              ${career.application_link ? 
                `<a href="${career.application_link}" target="_blank" class="btn primary" rel="noopener noreferrer">Apply Now</a>` : 
                '<span class="btn disabled">Application link not available</span>'
              }
            </div>
          </div>
        `).join('');
      } else {
        careerGrid.innerHTML = `
          <div class="no-resources">
            <div class="icon">💼</div>
            <h3>No Career Opportunities Available</h3>
            <p>Check back later for new job openings and career opportunities.</p>
          </div>
        `;
      }

      content.innerHTML = `<div id="careerGrid" class="grid">${careerGrid.innerHTML}</div>`;
    } catch (error) {
      console.error('Error loading career opportunities:', error);
      content.innerHTML = `
        <div class="error-state">
          <div class="icon">⚠️</div>
          <h3>Failed to Load Career Opportunities</h3>
          <p>Please try again later or contact support if the problem persists.</p>
        </div>
      `;
    }
  }

  // Handle hash changes
  function handleHashChange() {
    const params = new URLSearchParams(location.hash.slice(1));
    showLibrary(params.get('type') || 'home');
  }

  // Set up hash change listener
  window.addEventListener('hashchange', handleHashChange);
  
  // Initial render
  handleHashChange();
});

// Directory loader
async function loadDirectory() {
  const container = document.getElementById('directory-content');
  if (!container) return;
  const apiBase = document.querySelector('meta[name="api-base"]')?.content || 'backend/api/index.php';
  container.innerHTML = `
    <div class="actions" style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem;">
      <input id="dirSearch" class="input" placeholder="Search name..." style="flex:1;min-width:220px;" />
      <input id="dirBatch" class="input" placeholder="Batch year (optional)" style="width:180px;" />
      <button id="dirLoad" class="btn">Search</button>
    </div>
    <div class="grid" id="dirGrid">
      <div class="loading"><div class="spinner"></div><p>Loading directory...</p></div>
    </div>
  `;
  const grid = container.querySelector('#dirGrid');
  const fetchAndRender = async () => {
    const q = container.querySelector('#dirSearch').value.trim();
    const b = container.querySelector('#dirBatch').value.trim();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (b) params.set('batch', b);
    try {
      const res = await fetch(`${apiBase}?action=list_students&${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = await res.json();
      if (!items || items.length === 0) { grid.innerHTML = '<div class="empty-state"><p>No students found.</p></div>'; return; }
      grid.innerHTML = items.map(s => `
        <div class="card" style="display:flex;gap:.75rem;align-items:center;padding:1rem;">
          <img src="${s.avatar_url || 'assets/images/logo.jpeg'}" alt="Avatar" style="width:48px;height:48px;border-radius:50%;object-fit:cover;" />
          <div style="flex:1;">
            <div style="font-weight:600;">${s.display_name || 'Student'}</div>
            <div class="muted" style="font-size:.85rem;">${s.batch_year ? `Batch ${s.batch_year}` : ''}</div>
            <div style="margin-top:.25rem;display:flex;gap:.5rem;flex-wrap:wrap;">
              ${s.linkedin_url ? `<a class="btn small ghost" target="_blank" rel="noopener" href="${s.linkedin_url}">LinkedIn</a>` : ''}
              ${s.instagram_url ? `<a class="btn small ghost" target="_blank" rel="noopener" href="${s.instagram_url}">Instagram</a>` : ''}
              ${s.twitter_url ? `<a class="btn small ghost" target="_blank" rel="noopener" href="${s.twitter_url}">Twitter</a>` : ''}
            </div>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.error('Directory load failed', e);
      grid.innerHTML = `<div class="error-state"><p>Failed to load directory</p><small class="muted">${e.message}</small></div>`;
    }
  };
  container.querySelector('#dirLoad').addEventListener('click', fetchAndRender);
  fetchAndRender();
}

// Vacancies loader
async function loadVacancies() {
  const container = document.getElementById('vacancies-content');
  if (!container) return;
  const apiBase = document.querySelector('meta[name="api-base"]')?.content || 'backend/api/index.php';
  container.innerHTML = `
    <div class="actions" style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem;">
      <input id="vacSearch" class="input" placeholder="Search title/company/location..." style="flex:1;min-width:240px;" />
      <input id="vacCategory" class="input" placeholder="Category (e.g., internship, job)" style="width:200px;" />
      <input id="vacBatch" class="input" placeholder="Batch year filter" style="width:160px;" />
      <button id="vacLoad" class="btn">Search</button>
    </div>
    <div class="grid" id="vacGrid">
      <div class="loading"><div class="spinner"></div><p>Loading vacancies...</p></div>
    </div>
  `;
  const grid = container.querySelector('#vacGrid');
  const fetchAndRender = async () => {
    const q = container.querySelector('#vacSearch').value.trim();
    const c = container.querySelector('#vacCategory').value.trim();
    const b = container.querySelector('#vacBatch').value.trim();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (c) params.set('category', c);
    if (b) params.set('batch', b);
    try {
      const res = await fetch(`${apiBase}?action=list_vacancies&${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = await res.json();
      if (!items || items.length === 0) { grid.innerHTML = '<div class="empty-state"><p>No vacancies right now.</p></div>'; return; }
      grid.innerHTML = items.map(v => `
        <div class="card" style="padding:1rem;">
          <div style="display:flex;justify-content:space-between;gap:.5rem;align-items:flex-start;">
            <div>
              <div style="font-weight:700;">${v.title}</div>
              <div class="muted" style="font-size:.9rem;">${v.company || ''}${v.location ? ' • ' + v.location : ''}</div>
              ${v.category ? `<div class="muted" style="margin-top:.25rem;">Category: ${v.category}</div>` : ''}
            </div>
            ${v.application_link ? `<a class="btn small" target="_blank" rel="noopener" href="${v.application_link}">Apply</a>` : ''}
          </div>
          ${v.description ? `<p style="margin-top:.5rem;">${v.description}</p>` : ''}
          ${v.posted_by_name ? `<div class="muted" style="margin-top:.25rem;font-size:.85rem;">Posted by ${v.posted_by_name}</div>` : ''}
        </div>
      `).join('');
    } catch (e) {
      console.error('Vacancies load failed', e);
      grid.innerHTML = `<div class=\"error-state\"><p>Failed to load vacancies</p><small class=\"muted\">${e.message}</small></div>`;
    }
  };
  container.querySelector('#vacLoad').addEventListener('click', fetchAndRender);
  fetchAndRender();
}

// Discussions feature removed