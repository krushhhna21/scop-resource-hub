// admin.js - Enhanced with new sections
const API = '../backend/api';

async function api(action, params = {}, method = 'GET', formData = null) {
  const url = new URL(API, location.href);
  if (method === 'GET') {
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url, { credentials: 'include' });
    return res.json();
  } else {
    const opts = { method, credentials: 'include' };
    if (formData) {
      formData.append('action', action);
      opts.body = formData;
    } else {
      opts.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
      const usp = new URLSearchParams({ action, ...params });
      opts.body = usp.toString();
    }
    const res = await fetch(API, opts);
    return res.json();
  }
}

async function ensureAuth() {
  const me = await api('admin_me');
  if (!me.authenticated) location.href = 'admin-login.html';
  return me;
}

async function fillSubjects() {
  const select = document.getElementById('subjectSelect');
  select.innerHTML = '<option value="">Loading...</option>';
  const list = await api('list_all_subjects');
  select.innerHTML = '<option value="">Select subject</option>';
  list.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.year_name} — ${s.name}`;
    select.appendChild(opt);
  });
}

async function renderStats() {
  const s = await api('admin_stats');
  const ctx = document.getElementById('chart').getContext('2d');
  const labels = s.top_resources.map(r => r.title);
  const data = s.top_resources.map(r => Number(r.views_30d));
  new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Views (30d)', data }] },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
  document.getElementById('statsSummary').textContent =
    `Total resources: ${s.total_resources} • Views (30d): ${s.total_views_30d}`;
}

function resRow(r) {
  const url = r.external_url ? r.external_url : (r.file_path ? ('../' + r.file_path) : '#');
  const icon = r.resource_type === 'book' ? 'menu_book' : 
               r.resource_type === 'question' ? 'quiz' : 
               'description';
  return `
    <div class="resource-item" data-id="${r.id}">
      <div>
        <div class="resource-title">
          <span class="material-icons" style="font-size: 1.1em; vertical-align: middle;">${icon}</span>
          ${r.title}
        </div>
        <div class="resource-desc">${r.year_name} — ${r.subject_name}</div>
      </div>
      <div class="actions">
        <a class="btn ghost" href="${url}" target="_blank" rel="noopener">Open</a>
        <button class="btn" data-del="${r.id}">Delete</button>
      </div>
    </div>
  `;
}

async function renderResources(query = '') {
  const table = document.getElementById('resTable');
  table.innerHTML = '<p class="muted">Loading...</p>';
  const list = await api('admin_list_resources', query ? { q: query } : {});
  if (!list.length) {
    table.innerHTML = '<p class="muted">No resources found.</p>';
    return;
  }
  
  // Group resources by type
  const grouped = list.reduce((acc, r) => {
    const type = r.resource_type || 'resource';
    if (!acc[type]) acc[type] = [];
    acc[type].push(r);
    return acc;
  }, {});

  // Render each group with a header
  table.innerHTML = Object.entries(grouped).map(([type, items]) => `
    <h3 class="resource-group-title">${type.charAt(0).toUpperCase() + type.slice(1)}s</h3>
    ${items.map(resRow).join('')}
  `).join('');
  table.querySelectorAll('button[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-del');
      if (!confirm('Delete this resource?')) return;
      const res = await api('admin_delete_resource', { resource_id: id }, 'POST');
      if (res && res.success) renderResources(document.getElementById('search').value.trim());
      else alert(res.error || 'Delete failed');
    });
  });

  // Update the table to show resource type
  table.querySelectorAll('.resource-desc').forEach(desc => {
    const r = list.find(r => r.id === desc.closest('.resource-item').dataset.id);
    if (r && r.resource_type) {
      desc.textContent = `${r.year_name} — ${r.subject_name} (${r.resource_type})`;
    }
  });
}

async function main() {
  await ensureAuth();
  await fillSubjects();
  await renderStats();
  await renderResources();

  const form = document.getElementById('uploadForm');
  const msg = document.getElementById('uploadMsg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = 'Uploading...';
    const fd = new FormData(form);
    const res = await api('admin_create_resource', {}, 'POST', fd);
    if (res && res.success) {
      msg.textContent = 'Uploaded successfully.';
      form.reset();
      await renderResources();
    } else {
      msg.textContent = (res && res.error) ? res.error : 'Upload failed.';
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await api('admin_logout');
    location.href = 'admin-login.html';
  });

  const search = document.getElementById('search');
  const refresh = document.getElementById('refresh');
  search.addEventListener('input', () => renderResources(search.value.trim()));
  refresh.addEventListener('click', () => renderResources(search.value.trim()));
}

main();
