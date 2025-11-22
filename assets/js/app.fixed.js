document.addEventListener('DOMContentLoaded', () => {
  try { console.log('[ui] build=20251107'); } catch(_) {}
  // Scroll reveal helper for subtle animations
  function addScrollReveal(root = document) {
    try {
      const items = Array.from(root.querySelectorAll('[data-scroll], .feature-card, .year-btn, .subject-btn, .resource-card, .lib-nav-btn, .card'));
      if (items.length === 0) return;

      // Assign data-scroll to elements that don't have it
      items.forEach((el, idx) => {
        if (!el.hasAttribute('data-scroll')) {
          const isGridItem = el.classList.contains('feature-card') || el.classList.contains('resource-card') || el.classList.contains('year-btn') || el.classList.contains('subject-btn');
          el.setAttribute('data-scroll', isGridItem ? (idx % 2 === 0 ? 'left' : 'right') : 'up');
        }
      });

      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('scroll-visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      items.forEach(el => io.observe(el));
    } catch (e) {
      console.warn('Scroll reveal unavailable:', e);
    }
  }

  // Decide API base dynamically so it works whether the site is served from /, /public, or /frontend
  const metaApi = document.querySelector('meta[name="api-base"]')?.content;
  const API_BASE = metaApi || (() => {
    const path = window.location.pathname || '/';
    const m = path.match(/\/(public|frontend)\//);
    if (m) {
      const idx = path.indexOf(`/${m[1]}/`);
      const prefix = path.slice(0, idx);
      return prefix + '/backend/api/index.php';
    }
    const lastSlash = path.lastIndexOf('/');
    const dir = lastSlash >= 0 ? path.slice(0, lastSlash + 1) : '/';
    return dir + 'backend/api/index.php';
  })();

  console.log('API_BASE determined as:', API_BASE);
  // Cache DOM elements
  const yearSpan = document.querySelector('#year');
  const menuButton = document.getElementById('menuButton');
  const menuContent = document.getElementById('menuContent');
  const librarySections = document.querySelectorAll('.library-section');

  // Micro-interactions: gentle float for logo
  const brandLogoImg = document.querySelector('.brand-logo img');
  if (brandLogoImg) {
    brandLogoImg.classList.add('animate-gentle-float');
  }

  // Floating Action Button (Back to Top)
  const fab = document.getElementById('backToTopFab');
  if (fab) {
    const onScroll = () => {
      const show = window.scrollY > 300;
      fab.style.opacity = show ? '1' : '0';
      fab.style.pointerEvents = show ? 'auto' : 'none';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    fab.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // Set current year in footer
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // UI label mapping: map internal slugs to user-facing labels
  function uiLabel(type) {
    const map = {
      journals: 'Article Publication',
      publications: 'Research Publications'
    };
    return map[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : '');
  }

  // Fetch an admin-managed PYQ link for a specific year (or global fallback)
  // Uses the dedicated pyq_links table managed via admin dashboard
  async function getPyqLink(yearId) {
    try {
      const res = await fetch(`${API_BASE}?action=get_pyq_link&year_id=${encodeURIComponent(yearId || '')}`, { credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json();
      return (data && data.link_url) ? data.link_url : null;
    } catch (e) {
      console.warn('getPyqLink failed for year', yearId, e);
      return null;
    }
  }

  // Initialize menu if elements exist
  if (menuButton && menuContent) {
    // Accessibility label fallback
    if (!menuButton.getAttribute('aria-label')) menuButton.setAttribute('aria-label', 'Open main menu');
    // Show first-day (or once-per-day) attraction prompt
    (function initMenuPrompt(){
      try {
        const PREF_KEY = 'menu_prompt_last_seen';
        const last = localStorage.getItem(PREF_KEY);
        const today = new Date().toISOString().slice(0,10); // YYYY-MM-DD
        const shouldShow = !last || last !== today;
        if (!shouldShow) return; // already shown today
        // Mark as shown immediately to avoid duplicates in multi-load scenarios
        localStorage.setItem(PREF_KEY, today);
        // Add attraction class to button
        menuButton.classList.add('attract');
        // Build prompt element
        const prompt = document.createElement('div');
        prompt.className = 'menu-prompt';
        prompt.setAttribute('role','status');
        prompt.setAttribute('aria-live','polite');
        prompt.innerHTML = '<span class="finger">👉</span><span>Click me</span>';
        document.body.appendChild(prompt);
        // Auto dismiss after 8s
        const dismiss = () => {
          prompt.style.transition = 'opacity .4s ease, transform .4s ease';
          prompt.style.opacity = '0';
          prompt.style.transform = 'translateY(-4px) scale(.96)';
          setTimeout(()=>{ prompt.remove(); menuButton.classList.remove('attract'); }, 420);
        };
        setTimeout(dismiss, 8000);
        // Dismiss on interaction
        menuButton.addEventListener('click', dismiss, { once: true });
        prompt.addEventListener('click', () => { menuButton.click(); dismiss(); });
        // Respect reduced motion: remove bob animation
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){
          prompt.style.animation = 'menu-prompt-in .45s cubic-bezier(.2,.8,.2,1) forwards';
        }
      } catch(e){ console.warn('Menu prompt init error:', e); }
    })();
    // ensure overlay exists
    let overlay = document.querySelector('.overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'overlay';
      document.body.appendChild(overlay);
    }

    const openMenu = () => {
      menuContent.classList.add('active');
      overlay.classList.add('active');
      // focus first item for accessibility
      const firstItem = menuContent.querySelector('.menu-item');
      if (firstItem) firstItem.focus?.();
    };
    const closeMenu = () => {
      menuContent.classList.remove('active');
      overlay.classList.remove('active');
      menuButton.focus?.();
    };

    // Toggle menu
    menuButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (menuContent.classList.contains('active')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (!menuContent.classList.contains('active')) return;
      if (!menuContent.contains(e.target) && !menuButton.contains(e.target)) closeMenu();
    });

    // Close via overlay click
    overlay.addEventListener('click', () => { if (menuContent.classList.contains('active')) closeMenu(); });

    // Close on Escape
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && menuContent.classList.contains('active')) {
        ev.stopPropagation();
        closeMenu();
      }
    });

    // Handle menu items
    menuContent.addEventListener('click', function(e) {
      const menuItem = e.target.closest('.menu-item[data-library]');
      if (!menuItem) return;

      if (menuItem.getAttribute('href') === 'admin-login.html') {
        return;
      }

      e.preventDefault();
      const libraryType = menuItem.dataset.library;
      location.hash = '#' + new URLSearchParams({ type: libraryType }).toString();
  closeMenu();
      
      // Add smooth scroll animation to content area
      setTimeout(() => {
        const contentArea = document.querySelector('.library-sections');
        if (contentArea) {
          contentArea.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 100); // Small delay to ensure content is loaded
    });
  }

  // Tilt interaction for feature cards (desktop only)
  (function initFeatureTilt() {
    // Exclude cards inside the slideshow to avoid transform conflicts
    const cards = Array.from(document.querySelectorAll('.feature-card'))
      .filter(card => !card.closest('.features-grid.slideshow'));
    if (cards.length === 0) return;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return; // respect reduced motion

    const onMove = (e) => {
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2); // -1..1
      const dy = (e.clientY - cy) / (rect.height / 2); // -1..1
      const rotateX = (+dy * 4).toFixed(2);
      const rotateY = (-dx * 4).toFixed(2);
      el.style.transform = `translateY(-6px) translateZ(12px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };
    const onLeave = (e) => {
      e.currentTarget.style.transform = '';
    };

    cards.forEach(card => {
      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
      card.addEventListener('touchstart', () => {}, { passive: true });
    });
  })();

  // Feature slideshow (3 cards) with center focus and side previews
  (function initFeatureSlider() {
    const grid = document.querySelector('.features-grid.slideshow');
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll('.feature-card'));
    if (cards.length < 2) return; // only run for 2+ cards

    // Respect reduced motion preferences
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    // Height helper - define BEFORE it's used
    const updateGridHeight = () => {
      const heights = cards.map(c => c.offsetHeight || 0);
      const maxH = Math.max(...heights, 0);
      if (maxH > 0) grid.style.height = maxH + 'px';
    };

    let idx = 0;
    const applyPositions = () => {
      cards.forEach(c => c.classList.remove('left', 'center', 'right', 'out'));
      const left = (idx + cards.length - 1) % cards.length;
      const center = idx % cards.length;
      const right = (idx + 1) % cards.length;
      cards[left].classList.add('left');
      cards[center].classList.add('center');
      cards[right].classList.add('right');
      // Others (if >3) go out
      cards.forEach((c, i) => {
        if (i !== left && i !== center && i !== right) c.classList.add('out');
      });

      // Auto-size grid height to tallest card
      updateGridHeight();
    };

    applyPositions();

    let timer = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => { idx = (idx + 1) % cards.length; applyPositions(); }, 5000);
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };

    // Pause on hover/touch
    grid.addEventListener('mouseenter', stop);
    grid.addEventListener('mouseleave', start);
    grid.addEventListener('touchstart', stop, { passive: true });
    grid.addEventListener('touchend', start, { passive: true });

    // Pause when tab is hidden to save CPU, resume when visible
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    });

    window.addEventListener('resize', () => {
      // debounce via rAF
      requestAnimationFrame(updateGridHeight);
    });

    start();
    // Initial height set after layout
    requestAnimationFrame(updateGridHeight);
  })();

  

  // Parallax: update --parallax-y on hero as user scrolls (lightweight, raf throttled)
  (function initParallax() {
    const hero = document.querySelector('.hero-section');
    if (!hero) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        // distance scrolled relative to hero height, clamped
        const rect = hero.getBoundingClientRect();
        const viewportH = window.innerHeight || document.documentElement.clientHeight;
        const visible = 1 - Math.min(Math.max((rect.top + rect.height) / (viewportH + rect.height), 0), 1);
        // scale value for subtle effect
        const offset = Math.round(visible * 40); // max ~40px shift
        hero.style.setProperty('--parallax-y', `${offset}px`);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    // initial set
    onScroll();
  })();

  // Hero slideshow rotation (every 5s) with glass shine tracking
  (function initHeroSlideshow(){
    const slides = Array.from(document.querySelectorAll('.hero-slideshow .hero-slide'));
    if (slides.length <= 1) return;
    let i = 0; let prev = 0; let timer;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function activate(idx){
      // mark previous as leaving for graceful out animation
      slides.forEach((s)=> s.classList.remove('leaving'));
      slides.forEach((s,j)=>{
        if (j === prev && j !== idx) {
          s.classList.remove('active');
          // trigger leaving animation
          s.classList.add('leaving');
          // cleanup after transition
          setTimeout(()=>{ s.classList.remove('leaving'); }, 900);
        }
      });
      slides.forEach((s,j)=>{ s.classList.toggle('active', j===idx); });
      prev = idx;
    }
    function next(){ i = (i+1) % slides.length; activate(i); }
  function start(){ if (prefersReduced) return; timer = setInterval(next, 4000); }
    function stop(){ if (timer){ clearInterval(timer); timer=null; } }
    // Pause on interaction
    const root = document.querySelector('.hero-slideshow');
    if (root){ root.addEventListener('mouseenter', stop); root.addEventListener('mouseleave', start); root.addEventListener('touchstart', stop, {passive:true}); root.addEventListener('touchend', start, {passive:true}); }
    // Shine effect based on cursor position
    function onMove(e){
      const glass = e.target.closest('.hero-glass');
      if(!glass) return;
      const r = glass.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width)*100;
      const y = ((e.clientY - r.top) / r.height)*100;
      glass.style.setProperty('--shine-x', x+'%');
      glass.style.setProperty('--shine-y', y+'%');
    }
    document.addEventListener('mousemove', onMove);
    activate(i); start();
    document.addEventListener('visibilitychange', ()=>{ if(document.hidden) stop(); else start(); });
  })();

  // Make hero slideshow CTA links (href="#type=...") reliably switch sections
  document.addEventListener('click', (e) => {
    const a = e.target.closest('.hero-slideshow a[href^="#type="]');
    if (!a) return;
    e.preventDefault();
    const hash = a.getAttribute('href');
    if (!hash) return;
    if (location.hash !== hash) {
      location.hash = hash;
    }
    // Immediately render the target section and scroll into view
    try { handleHashChange(); } catch(_) {}
  });

  // Show sections
  function showLibrary(type) {
    // Hide all sections
    librarySections.forEach(section => {
      section.style.display = 'none';
      section.classList.remove('active');
    });

    // Show selected section
    const current = document.getElementById(`${type}-library`);
    if (current) {
      current.style.display = 'block';
      setTimeout(() => current.classList.add('active'), 0);
      // Initialize scroll reveal for the visible section
      addScrollReveal(current);

      // Load content if needed
      // If a simple page content exists for this section, render it and skip structured loaders
      const simplePageTargets = ['journals', 'publications', 'career'];
      if (simplePageTargets.includes(type)) {
        renderSimplePage(type);
        return;
      }

      if (['books', 'questions', 'resources', 'important-questions'].includes(type)) {
        const params = new URLSearchParams(location.hash.slice(1));
        const year = params.get('year');
        const subject = params.get('subject');
        const system = params.get('system');
        if (subject) {
          loadResources(type, year, subject);
        } else if (year) {
          // Skip subjects for questions - load all resources for the year
          if (type === 'questions') {
            loadQuestionsByYear(type, year);
          } else {
            loadSubjects(type, year);
          }
        } else if (type === 'questions' && system) {
          loadQuestionsBySystem(type, system);
        } else {
          loadYears(type);
        }
      } else if (type === 'directory') {
        loadDirectory();
      } else if (type === 'vacancies') {
        loadVacancies();
      }
      
      // Add smooth scroll animation to the active section
      setTimeout(() => {
        current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest' 
        });
      }, 50); // Small delay to ensure content is rendered
    }

    // Update menu states
    document.querySelectorAll('.menu-item[data-library]').forEach(item => {
      item.classList.toggle('active', item.dataset.library === type);
    });
  }

  // Render simple page content editable by admin (journals, career)
  async function renderSimplePage(slug) {
    // For resource-based pages (journals, publications, career), load resources instead of static content
    const resourceTypes = ['journals', 'publications', 'career'];
    if (resourceTypes.includes(slug)) {
      await loadGeneralResources(slug);
      return;
    }
    
    // For other simple pages, load static content
    const container = document.getElementById(`${slug}-content`);
    if (!container) return;
    container.innerHTML = `
      <div class="card" style="padding:1.25rem;">
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    `;
    try {
      const res = await fetch(`${API_BASE}?action=get_page_content&slug=${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = await res.json();
      const html = (data && data.html) ? data.html : '<p class="muted">Content for this section will be displayed here.</p>';
      container.innerHTML = `<div class="card" style="padding:1.25rem;">${html}</div>`;
    } catch (e) {
      console.error('Simple page load error:', e);
      container.innerHTML = `<div class="card" style="padding:1.25rem;"><p class="error">Failed to load content.</p></div>`;
    }
  }

  // Load general resources (journals, publications, career) that don't require year/subject selection
  async function loadGeneralResources(type) {
    const content = document.getElementById(`${type}-content`);
    if (!content) return;

    content.innerHTML = `
      <div class="section-header">
        <h2>${uiLabel(type)}</h2>
        <p class="muted">Access to latest pharmaceutical research and ${uiLabel(type).toLowerCase()}</p>
      </div>
      <div class="grid resource-cards-grid">
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading ${uiLabel(type).toLowerCase()}...</p>
        </div>
      </div>
    `;

    const grid = content.querySelector('.grid');
    if (!grid) return;

    try {
      const resourceType = mapResourceType(type);
      const url = `${API_BASE}?action=list_resources_by_type&resource_type=${encodeURIComponent(resourceType)}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`Failed to fetch ${type} (${response.status})`);
      }
      const resources = await response.json();

      if (!resources || resources.length === 0) {
        grid.innerHTML = `<div class="empty-state">
          <p>No ${uiLabel(type).toLowerCase()} available yet.</p>
          <small class="muted">Check back later for new content.</small>
        </div>`;
        return;
      }

      grid.innerHTML = resources.map(resource => createResourceCard(resource)).join('');
    } catch (error) {
      console.error(`Error loading ${type}:`, error);
      grid.innerHTML = `<div class="error-state">
        <p>Failed to load content.</p>
        <small class="muted">${error.message}</small>
      </div>`;
    }
  }

  // Create a resource card HTML element
  function createResourceCard(r) {
    const resolveLink = (resource) => {
      if (resource.external_url) return resource.external_url;
      if (resource.file_path) {
        if (/^https?:\/\//i.test(resource.file_path)) return resource.file_path;
        return resource.file_path.startsWith('/') ? resource.file_path : '/' + resource.file_path;
      }
      return null;
    };

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

    const link = resolveLink(r);
    const fileType = getFileType(r);
    const cardColor = r.card_color || '#0ea5e9';

    const thumbnailHtml = r.thumbnail_path 
      ? `<img src="${r.thumbnail_path}" alt="${r.title}" class="resource-card-thumbnail">` 
      : `<span class="material-icons resource-card-icon">${getIcon(fileType)}</span>`;

    return `
      <div class="resource-card">
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
      </div>
    `;
  }

  function loadYears(type) {
    const content = document.getElementById(`${type}-content`);
    if (!content) return;

    // Special UI for case studies: show systems instead of years
    if (type === 'questions') {
      content.innerHTML = `
        <div class="section-header">
          <h2>Select System</h2>
          <p class="muted">Pick a body system to view case studies</p>
        </div>
        <div class="grid"></div>
      `;

      const systems = [
        { key: 'gastrointestinal', label: 'Gastrointestinal system', idx: 1, icon: '🍽️' },
        { key: 'nervous', label: 'Nervous system', idx: 2, icon: '🧠' },
        { key: 'haematological', label: 'Haematological system', idx: 3, icon: '🩸' },
        { key: 'infectious', label: 'Infectious disease', idx: 4, icon: '🦠' },
        { key: 'renal', label: 'Renal system', idx: 5, icon: '🧪' },
        { key: 'musculoskeletal', label: 'Musculoskeletal system', idx: 6, icon: '🦴' }
      ];

      const grid = content.querySelector('.grid');
      systems.forEach((s, i) => {
        const btn = document.createElement('button');
        btn.className = 'year-btn';
        btn.setAttribute('data-scroll', i % 2 === 0 ? 'left' : 'right');
        btn.dataset.system = s.key;
        btn.dataset.yearId = s.idx; // mapped index for backend
        btn.innerHTML = `
          <div class="year-icon">${s.icon}</div>
          <div class="content">
            <div class="title">${s.label}</div>
          </div>
          <div class="arrow">→</div>
        `;
        btn.addEventListener('click', () => {
          // Route with system param; we'll map to year on load
          location.hash = '#' + new URLSearchParams({ type, system: s.key }).toString();
        });
        grid.appendChild(btn);
      });
      addScrollReveal(grid);
      return;
    }

    content.innerHTML = `
      <div class="section-header">
        <h2>Select Year</h2>
        <p class="muted">Choose your Pharm D year to continue</p>
      </div>
      <div class="grid"></div>
    `;

    const grid = content.querySelector('.grid');
    if (!grid) return;

    // Create year buttons
    for (let i = 1; i <= 6; i++) {
      const btn = document.createElement('button');
      btn.className = 'year-btn';
      btn.setAttribute('data-scroll', i % 2 === 0 ? 'right' : 'left');
      btn.dataset.yearId = i;
      btn.innerHTML = `
        <div class="year-icon">${i}</div>
        <div class="content">
          <div class="title">Pharm D - ${i}${
            i === 1 ? 'st' : 
            i === 2 ? 'nd' : 
            i === 3 ? 'rd' : 'th'
          } Year</div>
        </div>
        <div class="arrow">→</div>
      `;

      btn.addEventListener('click', () => {
        location.hash = '#' + new URLSearchParams({
          type: type,
          year: i
        }).toString();
      });
      grid.appendChild(btn);
    }
    // Animate in
    addScrollReveal(grid);
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
        <p class="muted">Choose a subject to view ${uiLabel(type).toLowerCase()}</p>
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
        btn.setAttribute('data-scroll', Math.random() > 0.5 ? 'left' : 'right');
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
      // Reveal animation for new buttons
      addScrollReveal(grid);

      // Append a "View PYQ" button at the bottom for all subject-based sections
      // Admin-managed link from dedicated pyq_links table
      const ctaWrap = document.createElement('div');
      ctaWrap.className = 'actions';
      ctaWrap.style.cssText = 'margin-top:1rem; display:flex; justify-content:center;';
      const btn = document.createElement('a');
      btn.className = 'btn';
      btn.textContent = 'View PYQ';
      btn.setAttribute('aria-label', 'View Previous Year Questions');
      btn.href = '#';
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        // Fetch year-specific or global PYQ link
        const link = await getPyqLink(year);
        if (!link) {
          // Fallback: route to internal questions section by year if no admin link configured
          location.hash = '#' + new URLSearchParams({ type: 'questions', year: year }).toString();
          return;
        }
        if (/^https?:\/\//i.test(link)) {
          window.open(link, '_blank', 'noopener');
        } else if (link.startsWith('#')) {
          // Allow admin to supply internal hash directly
          location.hash = link.slice(1);
        } else {
          // Treat as relative path
          window.open(link, '_blank', 'noopener');
        }
      });
      ctaWrap.appendChild(btn);
      // Insert after the grid of subjects
      content.appendChild(ctaWrap);

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
        <h2>${uiLabel(type)} Resources</h2>
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
        item.setAttribute('data-scroll', Math.random() > 0.5 ? 'left' : 'right');
        
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
      // Reveal animation for resource cards
      addScrollReveal(grid);
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
      'questions': 'Case Studies',
      'important-questions': 'Important Questions'
    };
    const descriptions = {
  'questions': 'All case studies for the selected year',
      'important-questions': 'Important questions for the selected year'
    };

    // Show loading state with back controls
    content.innerHTML = `
      <div class="actions" style="margin-bottom:1rem;display:flex;gap:.5rem;flex-wrap:wrap;">
        <button class="btn ghost" id="backToYears">&larr; Back to Years</button>
      </div>
      <div class="section-header">
        <h2>${titles[type] || 'Questions'}</h2>
        <p class="muted">${descriptions[type] || 'All case studies for the selected year'}</p>
      </div>
      <div class="grid">
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading ${type === 'important-questions' ? 'important questions' : 'case studies'}...</p>
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
        const itemType = type === 'important-questions' ? 'important questions' : 'case studies';
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
        item.setAttribute('data-scroll', Math.random() > 0.5 ? 'left' : 'right');
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
      // Reveal animation for question items
      addScrollReveal(grid);
    } catch (error) {
      console.error('Error loading questions:', error);
      grid.innerHTML = `<p class="error">Failed to load ${type === 'important-questions' ? 'important questions' : 'case studies'}. ${error?.message || ''}</p>`;
    }
  }

  // Map system -> year index and render via year loader to reuse backend
  function mapSystemToYear(systemKey) {
    const map = {
      'gastrointestinal': 1,
      'nervous': 2,
      'haematological': 3,
      'infectious': 4,
      'renal': 5,
      'musculoskeletal': 6
    };
    return map[systemKey] || null;
  }

  async function loadQuestionsBySystem(type, systemKey) {
    const yearIdx = mapSystemToYear(systemKey);
    const content = document.getElementById(`${type}-content`);
    if (!content) return;
    if (!yearIdx) {
      content.innerHTML = `<p class="error">Unknown system.</p>`;
      return;
    }
    // Reuse year-based loader
    await loadQuestionsByYear(type, yearIdx);
    // Update header to include system label
    const labelMap = {
      'gastrointestinal': 'Gastrointestinal system',
      'nervous': 'Nervous system',
      'haematological': 'Haematological system',
      'infectious': 'Infectious disease',
      'renal': 'Renal system',
      'musculoskeletal': 'Musculoskeletal system'
    };
    const hdr = content.querySelector('.section-header h2');
    if (hdr) hdr.textContent = `Case Studies — ${labelMap[systemKey] || 'System'}`;
    const back = content.querySelector('#backToYears');
    if (back) back.textContent = '← Back to Systems';
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
  
  // Home Tabs: accessibility-friendly tab interface for Home / About / Contact / News
  function initHomeTabs() {
    const root = document.querySelector('.home-tabs');
    if (!root) return;
    const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
    // Panels may live outside the nav (top fixed bar). Query document globally.
    const panels = Array.from(document.querySelectorAll('.home-tab-panel'));

    function activate(panelId) {
      tabs.forEach(t => {
        const controls = t.getAttribute('aria-controls');
        const sel = controls === panelId;
        t.classList.toggle('active', sel);
        t.setAttribute('aria-selected', sel ? 'true' : 'false');
        t.tabIndex = sel ? 0 : -1;
      });
      panels.forEach(p => {
        const show = p.id === panelId;
        p.hidden = !show;
        p.classList.toggle('active', show);
      });
    }

    function scrollToPanel(panelId) {
      const panel = document.getElementById(panelId);
      if (!panel) return;
      // Delay to ensure visibility state updated before measuring
      requestAnimationFrame(() => {
        const offset = 90; // compensate for fixed nav height
        const top = panel.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top < 0 ? 0 : top, behavior: 'smooth' });
        panel.classList.add('panel-flash');
        setTimeout(() => panel.classList.remove('panel-flash'), 800);
      });
    }

    // Keyboard navigation (ArrowLeft/ArrowRight/Home/End)
    tabs.forEach((t, idx) => {
      t.addEventListener('click', () => activate(t.getAttribute('aria-controls')));
      t.addEventListener('keydown', e => {
        if (!['ArrowRight','ArrowLeft','Home','End'].includes(e.key)) return;
        e.preventDefault();
        const current = tabs.indexOf(document.activeElement);
        if (e.key === 'ArrowRight') tabs[(current + 1) % tabs.length].focus();
        else if (e.key === 'ArrowLeft') tabs[(current - 1 + tabs.length) % tabs.length].focus();
        else if (e.key === 'Home') tabs[0].focus();
        else if (e.key === 'End') tabs[tabs.length - 1].focus();
      });
    });

    // Utilities
    function escapeHtml(str){
      return String(str||'').replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    }

    // News loader
    async function loadNewsItems() {
      const container = document.querySelector('#newsList');
      const emptyState = document.querySelector('#newsEmpty');
      if (!container) return;
      container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading news...</p></div>';
      try {
        const res = await fetch(`${API_BASE}?action=list_news`);
        if (!res.ok) throw new Error('Failed ('+res.status+')');
        const items = await res.json();
        if (!Array.isArray(items) || !items.length){
          container.innerHTML = '';
          if (emptyState) emptyState.style.display = 'block';
          return;
        }
        if (emptyState) emptyState.style.display = 'none';
        container.innerHTML = items.map(n => {
          const title = escapeHtml(n.title);
          const body = escapeHtml(n.body || '');
          const created = escapeHtml((n.published_at || n.created_at || '').slice(0,10));
          const shortBody = body.length > 220 ? body.slice(0,220) + '…' : body;
          return `
            <article class="news-item card" data-scroll="up" tabindex="0">
              <h3 style="margin:0 0 .5rem;">${title}</h3>
              <p style="margin:0 0 .75rem;" class="muted" data-full="${body}">${shortBody}</p>
              ${created ? `<div style="font-size:.75rem;color:#666;">${created}</div>` : ''}
            </article>
          `;
        }).join('');
        try { addScrollReveal(container); } catch(_) {}
        // Expand on click if truncated
        container.addEventListener('click', e => {
          const p = e.target.closest('p[data-full]');
          if (!p) return;
          if (p.textContent.endsWith('…')) {
            p.textContent = p.getAttribute('data-full');
          }
        });
      } catch(err){
        console.error('News load error', err);
        container.innerHTML = '<p class="error">Failed to load news.</p>';
      }
    }

    // Contact form wiring
    function wireContactForm(){
      const form = document.querySelector('#contactForm');
      if (!form) return;
      const statusEl = document.querySelector('#contactStatus');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = (form.elements['name']?.value || '').trim();
        const email = (form.elements['email']?.value || '').trim();
        const subject = (form.elements['subject']?.value || '').trim();
        const message = (form.elements['message']?.value || '').trim();
        if (!name || !message){
          if (statusEl){ statusEl.textContent = 'Please provide your name and message.'; statusEl.className = 'muted error'; }
          return;
        }
        if (statusEl){ statusEl.textContent = 'Sending...'; statusEl.className = 'muted'; }
        const fd = new FormData();
        fd.set('name', name);
        fd.set('email', email);
        fd.set('subject', subject);
        fd.set('message', message);
        try {
          const res = await fetch(`${API_BASE}?action=submit_contact`, { method: 'POST', body: fd });
          const data = await res.json().catch(()=>({}));
          if (!res.ok) throw new Error(data.error || ('Failed ('+res.status+')'));
          if (statusEl){ statusEl.textContent = 'Message sent. Thank you!'; statusEl.className = 'muted success'; }
          form.reset();
        } catch(err){
          console.error('Contact submit failed', err);
          if (statusEl){ statusEl.textContent = err.message || 'Failed to send.'; statusEl.className = 'muted error'; }
        }
      });
    }

    // Initial state
    activate('home-pane');
    // Lazy-load news only if its tab becomes active (performance) but load once if already requested
    let newsLoaded = false;
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('aria-controls');
        activate(id);
        if (id === 'news-pane' && !newsLoaded) { newsLoaded = true; loadNewsItems(); }
        if (id === 'contact-pane') { wireContactForm(); }
        scrollToPanel(id);
      });
    });
    // Pre-wire contact form & load news if hash indicates news
    wireContactForm();
    if (location.hash.includes('news-pane')) { newsLoaded = true; loadNewsItems(); }
  }

  // Initialize tabs before initial library hash render
  initHomeTabs();

  // Initial render of library hash-based sections
  handleHashChange();
});

// Directory loader with explicit logging & fallback to hosting path
async function loadDirectory() {
  const container = document.getElementById('directory-content');
  if (!container) return;
  const metaBase = document.querySelector('meta[name="api-base"]')?.content;
  // Try relative (local dev) and absolute (hosting) variants
  const candidates = [];
  if (typeof API_BASE !== 'undefined' && API_BASE) candidates.push(API_BASE);
  if (metaBase) candidates.push(metaBase);
  candidates.push('backend/api/index.php');
  // Hosting canonical path
  if (location.hostname && !location.hostname.match(/localhost|127\.0\.0\.1/)) {
    candidates.push('/api/index.php');
  }
  // De-duplicate
  const apiCandidates = [...new Set(candidates)];

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
  // Quiet production: no directory debug logs rendered or printed
  function log() { /* no-op */ }
  log('api candidates', apiCandidates);

  async function tryFetch(base, params) {
    const url = `${base}${base.includes('?') ? '&' : '?'}action=list_students&${params.toString()}`;
    log('fetch attempt', { url });
    try {
      const res = await fetch(url, { credentials: 'include' });
      log('response status', { url, status: res.status });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch (e) { log('json parse fail', { snippet: text.slice(0,120) }); return null; }
      if (!Array.isArray(parsed)) { log('not array payload', { type: typeof parsed }); return null; }
      log('parsed ok', { count: parsed.length });
      return parsed;
    } catch (e) {
      log('fetch error', { base, message: e.message });
      return null;
    }
  }

  const fetchAndRender = async () => {
    const q = container.querySelector('#dirSearch').value.trim();
    const b = container.querySelector('#dirBatch').value.trim();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (b) params.set('batch', b);

    grid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading...</p></div>';
    for (const base of apiCandidates) {
      const items = await tryFetch(base, params);
      if (items && items.length >= 0) { // accept empty array as success
        if (!items.length) {
          grid.innerHTML = '<div class="empty-state"><p>No students found.</p></div>';
        } else {
          // Primary: template HTML render (no debug banner)
          grid.innerHTML = items.map(s => `
            <div class="card" data-scroll="up" style="display:flex;gap:.75rem;align-items:center;">
              <img src="${s.avatar_url || 'assets/images/logo.jpeg'}" alt="Avatar" style="width:48px;height:48px;border-radius:50%;object-fit:cover;" />
              <div style="flex:1;">
                <div class="dir-name" style="font-weight:600;">${s.display_name || 'Student'}</div>
                <div class="muted" style="font-size:.85rem;">${[s.course||'Pharm D', s.batch_year ? `Year ${s.batch_year}` : ''].filter(Boolean).join(' • ')}</div>
                <div style="margin-top:.25rem;display:flex;gap:.5rem;flex-wrap:wrap;">
                  ${s.linkedin_url ? `<a class="btn small ghost" target="_blank" rel="noopener" href="${s.linkedin_url}">LinkedIn</a>` : ''}
                  ${s.instagram_url ? `<a class="btn small ghost" target="_blank" rel="noopener" href="${s.instagram_url}">Instagram</a>` : ''}
                  ${s.twitter_url ? `<a class="btn small ghost" target="_blank" rel="noopener" href="${s.twitter_url}">Twitter</a>` : ''}
                </div>
              </div>
            </div>
          `).join('');
          // Fallback: if something prevented HTML from rendering, build DOM nodes
          if (!grid.querySelector('.card')) {
            const frag = document.createDocumentFragment();
            items.forEach(s => {
              const wrap = document.createElement('div');
              wrap.className = 'card';
              wrap.setAttribute('data-scroll','up');
              wrap.style.cssText = 'display:flex;gap:.75rem;align-items:center;';
              const img = document.createElement('img');
              img.src = s.avatar_url || 'assets/images/logo.jpeg';
              img.alt = 'Avatar';
              img.style.cssText = 'width:48px;height:48px;border-radius:50%;object-fit:cover;';
              const right = document.createElement('div');
              right.style.flex = '1';
              const name = document.createElement('div');
              name.className = 'dir-name';
              name.style.fontWeight = '600';
              name.textContent = s.display_name || 'Student';
              const meta = document.createElement('div');
              meta.className = 'muted';
              meta.style.fontSize = '.85rem';
              const parts = [];
              parts.push(s.course || 'Pharm D');
              if (s.batch_year) parts.push(`Year ${s.batch_year}`);
              meta.textContent = parts.filter(Boolean).join(' • ');
              right.appendChild(name); right.appendChild(meta);
              wrap.appendChild(img); wrap.appendChild(right);
              frag.appendChild(wrap);
            });
            grid.replaceChildren(frag);
          }
          // Ultra‑resilient second-pass: verify after paint; if still no cards, inject minimalist text list
          setTimeout(() => {
            try {
              const cardsNow = grid.querySelectorAll('.card');
              if (!cardsNow.length) {
                log('second-pass fallback engaged (no .card elements after timeout)');
                const simple = document.createElement('div');
                simple.style.cssText='grid-column:1/-1;padding:8px 10px;border:1px dashed #ccc;border-radius:8px;font-size:.8rem;background:#fff;';
                simple.innerHTML = '<strong>Directory</strong><br>' + items.map(s=> (s.display_name||'Student') + (s.batch_year?` (Year ${s.batch_year})`: '')).join('<br>');
                grid.appendChild(simple);
              } else {
                log('cards present after initial render', { count: cardsNow.length, innerHTMLLength: grid.innerHTML.length });
              }
            } catch(err){ log('second-pass error', { message: err.message }); }
          }, 120);
          // No debug metrics in production
          try { if (typeof addScrollReveal === 'function') { addScrollReveal(grid); } } catch(_) {}
          // If scroll reveal helper isn't in scope (closure), force visibility so opacity:0 rule doesn't hide cards
          if (typeof addScrollReveal !== 'function') {
            grid.querySelectorAll('[data-scroll]').forEach(el => el.classList.add('scroll-visible'));
          }
        }
        return; // done after first successful base
      }
    }
    grid.innerHTML = '<div class="error-state"><p>Failed to load directory from all endpoints.</p></div>';
  };
  container.querySelector('#dirLoad').addEventListener('click', fetchAndRender);
  fetchAndRender();
}

// Vacancies loader with multi-endpoint fallback & debug
async function loadVacancies() {
  const container = document.getElementById('vacancies-content');
  if (!container) return;
  const metaBase = document.querySelector('meta[name="api-base"]')?.content;
  const candidates = [];
  if (typeof API_BASE !== 'undefined' && API_BASE) candidates.push(API_BASE);
  if (metaBase) candidates.push(metaBase);
  candidates.push('backend/api/index.php');
  if (location.hostname && !location.hostname.match(/localhost|127\.0\.0\.1/)) {
    candidates.push('/api/index.php');
  }
  const apiCandidates = [...new Set(candidates)];

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
  // Quiet production: no vacancy debug logs rendered or printed
  function log() { /* no-op */ }
  log('api candidates', apiCandidates);

  async function tryFetch(base, params) {
    const url = `${base}${base.includes('?') ? '&' : '?'}action=list_vacancies&${params.toString()}`;
    log('fetch attempt', { url });
    try {
      const res = await fetch(url, { credentials: 'include' });
      log('response status', { url, status: res.status });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch (e) { log('json parse fail', { snippet: text.slice(0,120) }); return null; }
      if (!Array.isArray(parsed)) { log('not array payload', { type: typeof parsed }); return null; }
      log('parsed ok', { count: parsed.length });
      return parsed;
    } catch (e) { log('fetch error', { base, message: e.message }); return null; }
  }

  const fetchAndRender = async () => {
    const q = container.querySelector('#vacSearch').value.trim();
    const c = container.querySelector('#vacCategory').value.trim();
    const b = container.querySelector('#vacBatch').value.trim();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (c) params.set('category', c);
    if (b) params.set('batch', b);
    grid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading...</p></div>';
    for (const base of apiCandidates) {
      const items = await tryFetch(base, params);
      if (items && items.length >= 0) {
        if (!items.length) {
          grid.innerHTML = '<div class="empty-state"><p>No vacancies right now.</p></div>';
        } else {
          grid.innerHTML = items.map(v => `
            <div class="card" data-scroll="up" style="padding:1rem;">
              <div style="display:flex;justify-content:space-between;gap:.5rem;align-items:flex-start;">
                <div>
                  <div style="font-weight:700;">${v.title}</div>
                  <div class="muted" style="font-size:.9rem;">${v.company || ''}${v.location ? ' • ' + v.location : ''}</div>
                  ${v.category ? `<div class="muted" style="margin-top:.25rem;">Category: ${v.category}</div>` : ''}
                </div>
                ${v.application_link ? `<a class="btn small" target="_blank" rel="noopener" href="${v.application_link}">Apply</a>` : ''}
              </div>
              ${v.description ? `<p style=\"margin-top:.5rem;\">${v.description}</p>` : ''}
              ${v.posted_by_name ? `<div class=\"muted\" style=\"margin-top:.25rem;font-size:.85rem;\">Posted by ${v.posted_by_name}</div>` : ''}
            </div>
          `).join('');
          try { if (typeof addScrollReveal === 'function') { addScrollReveal(grid); } } catch(_) {}
          if (typeof addScrollReveal !== 'function') {
            grid.querySelectorAll('[data-scroll]').forEach(el => el.classList.add('scroll-visible'));
          }
        }
        return;
      }
    }
    grid.innerHTML = '<div class="error-state"><p>Failed to load vacancies from all endpoints.</p></div>';
  };
  container.querySelector('#vacLoad').addEventListener('click', fetchAndRender);
  fetchAndRender();
}

// Discussions removed by request
