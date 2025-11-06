// Admin Dashboard JavaScript
// Dynamic API base: supports /public or /frontend deployments; can be overridden via <meta name="api-base">
const API = (function() {
    const metaApi = document.querySelector('meta[name="api-base"]')?.content;
    if (metaApi) return metaApi;
    const path = window.location.pathname || '/';
    const m = path.match(/\/(public|frontend)\//);
    if (m) {
        const idx = path.indexOf(`/${m[1]}/`);
        const prefix = path.slice(0, idx + m[0].length);
        return prefix + 'api/index.php';
    }
    const lastSlash = path.lastIndexOf('/');
    const dir = lastSlash >= 0 ? path.slice(0, lastSlash + 1) : '/';
    return dir + 'api/index.php';
})();

// Ensure authentication before dashboard load
async function ensureAuthenticated() {
    try {
        const me = await api('admin_me');
        if (me && me.authenticated) return true;
    } catch (e) {
        // fallthrough to redirect
    }
    // Not authenticated -> redirect to login
    try { window.location.href = 'admin-login.html'; } catch (_) {}
    return false;
}

// Initialize the admin dashboard
document.addEventListener('DOMContentLoaded', async function() {
    const authed = await ensureAuthenticated();
    if (!authed) return; // ensureAuthenticated will redirect
    
    initializeNavigation();
    initializeModals();
    initializeForms();
    initializePagesEditor();
    initializeLogout();
    loadDashboardData();
});

// Initialize logout functionality
function initializeLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            if (confirm('Are you sure you want to logout?')) {
                try {
                    await api('admin_logout', {}, 'POST');
                    window.location.href = 'admin-login.html';
                } catch (error) {
                    console.error('Logout error:', error);
                    window.location.href = 'admin-login.html';
                }
            }
        });
    }
}

// Simple Pages editor (Journals, Publications, Career)
function initializePagesEditor() {
    // Prefill existing content
    const journalsTA = document.getElementById('pageJournals');
    const publicationsTA = document.getElementById('pagePublications');
    const careerTA = document.getElementById('pageCareer');
    if (journalsTA) {
        api('get_page_content', { slug: 'journals' }).then(d => { journalsTA.value = d?.html || ''; }).catch(()=>{});
    }
    if (publicationsTA) {
        api('get_page_content', { slug: 'publications' }).then(d => { publicationsTA.value = d?.html || ''; }).catch(()=>{});
    }
    if (careerTA) {
        api('get_page_content', { slug: 'career' }).then(d => { careerTA.value = d?.html || ''; }).catch(()=>{});
    }

    const saveJ = document.getElementById('savePageJournals');
    if (saveJ) saveJ.addEventListener('click', async (e) => {
        e.preventDefault();
        const html = journalsTA?.value || '';
        try {
            const res = await api('admin_set_page_content', { slug: 'journals', html }, 'POST');
            alert(res?.success ? 'Journals page saved.' : 'Failed to save.');
        } catch(err) { alert('Failed to save Journals page.'); }
    });
    const saveP = document.getElementById('savePagePublications');
    if (saveP) saveP.addEventListener('click', async (e) => {
        e.preventDefault();
        const html = publicationsTA?.value || '';
        try {
            const res = await api('admin_set_page_content', { slug: 'publications', html }, 'POST');
            alert(res?.success ? 'Publications page saved.' : 'Failed to save.');
        } catch(err) { alert('Failed to save Publications page.'); }
    });
    const saveC = document.getElementById('savePageCareer');
    if (saveC) saveC.addEventListener('click', async (e) => {
        e.preventDefault();
        const html = careerTA?.value || '';
        try {
            const res = await api('admin_set_page_content', { slug: 'career', html }, 'POST');
            alert(res?.success ? 'Career page saved.' : 'Failed to save.');
        } catch(err) { alert('Failed to save Career page.'); }
    });
}

// API helper function
async function api(action, params = {}, method = 'GET', formData = null) {
    try {
        if (method === 'GET') {
            const url = new URL(API, location.href);
            url.searchParams.set('action', action);
            Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
                const res = await fetch(url, { credentials: 'include' });
                if (!res.ok) {
                    let err; try { err = await res.json(); } catch (_) {}
                    if (err?.error === 'Unauthorized.' || res.status === 401 || res.status === 403) {
                        window.location.href = 'admin-login.html';
                        throw new Error('Unauthorized');
                    }
                    throw new Error(err?.error || `Request failed (${res.status})`);
                }
                return await res.json();
        } else {
            const url = new URL(API, location.href);
            const opts = { method, credentials: 'include' };
            if (formData) {
                // For FormData, include action in the FormData, not URL
                formData.append('action', action);
                opts.body = formData;
            } else {
                // For JSON, include action in URL query params
                url.searchParams.set('action', action);
                opts.headers = { 'Content-Type': 'application/json' };
                opts.body = JSON.stringify({ action, ...params });
            }
            const res = await fetch(url, opts);
            if (!res.ok) {
                let err; try { err = await res.json(); } catch (_) {}
                if (err?.error === 'Unauthorized.' || res.status === 401 || res.status === 403) {
                    window.location.href = 'admin-login.html';
                    throw new Error('Unauthorized');
                }
                throw new Error(err?.error || `Request failed (${res.status})`);
            }
            return await res.json();
        }
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Navigation functionality
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');
    
    navItems.forEach(nav => {
        nav.addEventListener('click', (e) => {
            e.preventDefault();
            const target = nav.getAttribute('href').substring(1);
            
            // Update active nav
            navItems.forEach(n => n.classList.remove('active'));
            nav.classList.add('active');
            
            // Show target section
            sections.forEach(s => s.classList.remove('active'));
            const targetSection = document.getElementById(target);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });
}

// Modal functionality
function initializeModals() {
    // Add event listeners for modal triggers
    const addBookBtn = document.getElementById('addBookBtn');
    const addJournalBtn = document.getElementById('addJournalBtn');
    const addPublicationBtn = document.getElementById('addPublicationBtn');
    const addCareerBtn = document.getElementById('addCareerBtn');
    const addImportantQuestionBtn = document.getElementById('addImportantQuestionBtn');
    const addQuestionBtn = document.getElementById('addQuestionBtn');
    const addResourceBtn = document.getElementById('addResourceBtn');
    
    if (addBookBtn) addBookBtn.addEventListener('click', () => openModal('bookModal'));
    // Journals, Publications, Career, and Important Questions now use the enhanced resource modal
    if (addJournalBtn) addJournalBtn.addEventListener('click', () => openResourceModal('journal'));
    if (addPublicationBtn) addPublicationBtn.addEventListener('click', () => openResourceModal('publication'));
    if (addCareerBtn) addCareerBtn.addEventListener('click', () => openResourceModal('career'));
    if (addImportantQuestionBtn) addImportantQuestionBtn.addEventListener('click', () => openResourceModal('important-question'));
    if (addQuestionBtn) addQuestionBtn.addEventListener('click', () => openModal('questionModal'));
    if (addResourceBtn) addResourceBtn.addEventListener('click', () => openModal('resourceModal'));
    
    // Close modal functionality
    document.querySelectorAll('.modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            const modalId = closeBtn.getAttribute('data-modal');
            if (modalId) {
                closeModal(modalId);
            } else {
                // Find parent modal
                const modal = closeBtn.closest('.modal');
                if (modal) {
                    closeModal(modal.id);
                }
            }
        });
    });
    
    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        
        // Load year options if needed
        const yearSelect = modal.querySelector('select[name="year_id"]');
        if (yearSelect) {
            loadYearOptions(yearSelect);
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        
        // Reset form
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}

function openResourceModal(resourceType) {
    const modal = document.getElementById('resourceModal');
    if (modal) {
        // Set the resource type in the form
        const resourceTypeSelect = modal.querySelector('#resourceType');
        if (resourceTypeSelect) {
            resourceTypeSelect.value = resourceType;
        }
        
        // Update modal title based on resource type
        const titleElement = modal.querySelector('#resourceModalTitle');
        if (titleElement) {
            const titles = {
                'journal': 'Add New Journal',
                'publication': 'Add New Publication', 
                'career': 'Add New Career Resource',
                'important-question': 'Add New Important Question'
            };
            titleElement.textContent = titles[resourceType] || 'Add New Resource';
        }
        
        // Handle field visibility based on resource type
        toggleResourceFields(resourceType);
        
        // Open the modal
        openModal('resourceModal');
    }
}

// Toggle Year and Subject fields based on resource type
function toggleResourceFields(resourceType) {
    const yearField = document.querySelector('.resource-year-field');
    const subjectField = document.querySelector('.resource-subject-field');
    const yearSelect = document.getElementById('resourceYear');
    const subjectSelect = document.getElementById('resourceSubject');
    
    // Resource types that don't require year/subject
    const generalTypes = ['journal', 'publication', 'career'];
    // Resource types that require only year (subject optional)
    const yearOnlyTypes = ['question'];
    
    if (generalTypes.includes(resourceType)) {
        // Hide fields for general resources
        if (yearField) yearField.classList.add('hidden');
        if (subjectField) subjectField.classList.add('hidden');
        
        // Remove required attribute
        if (yearSelect) yearSelect.removeAttribute('required');
        if (subjectSelect) subjectSelect.removeAttribute('required');
    } else if (yearOnlyTypes.includes(resourceType)) {
        // Show year field only for questions (PYQ)
        if (yearField) yearField.classList.remove('hidden');
        if (subjectField) subjectField.classList.add('hidden');
        
        // Year required, subject optional
        if (yearSelect) yearSelect.setAttribute('required', 'required');
        if (subjectSelect) subjectSelect.removeAttribute('required');
    } else {
        // Show both fields for specific resources (books, important-questions, etc.)
        if (yearField) yearField.classList.remove('hidden');
        if (subjectField) subjectField.classList.remove('hidden');
        
        // Both required
        if (yearSelect) yearSelect.setAttribute('required', 'required');
        if (subjectSelect) subjectSelect.setAttribute('required', 'required');
    }
}

// Form initialization
function initializeForms() {
    // Book form
    const bookForm = document.getElementById('bookForm');
    if (bookForm) {
        const yearSelect = bookForm.querySelector('#bookYear');
        const subjectSelect = bookForm.querySelector('#bookSubject');
        
        if (yearSelect) {
            loadYearOptions(yearSelect);
            yearSelect.addEventListener('change', () => {
                if (yearSelect.value) {
                    loadSubjectOptions(subjectSelect, yearSelect.value);
                } else {
                    subjectSelect.innerHTML = '<option value="">Select Year First</option>';
                }
            });
        }
        
        bookForm.addEventListener('submit', handleBookSubmit);
    }
    
    // Journal form
    const journalForm = document.getElementById('journalForm');
    if (journalForm) {
        journalForm.addEventListener('submit', handleJournalSubmit);
    }
    
    // Publication form removed (managed via Pages)
    
    // Career form
    const careerForm = document.getElementById('careerForm');
    if (careerForm) {
        careerForm.addEventListener('submit', handleCareerSubmit);
    }
    
    // Question form
    const questionForm = document.getElementById('questionForm');
    if (questionForm) {
        const yearSelect = questionForm.querySelector('#questionYear');
        
        if (yearSelect) {
            loadYearOptions(yearSelect);
        }
        
        questionForm.addEventListener('submit', handleQuestionSubmit);
    }
    
    // Resource form
    const resourceForm = document.getElementById('resourceForm');
    if (resourceForm) {
        const yearSelect = resourceForm.querySelector('#resourceYear');
        const subjectSelect = resourceForm.querySelector('#resourceSubject');
        const resourceTypeSelect = resourceForm.querySelector('#resourceType');
        
        if (yearSelect) {
            loadYearOptions(yearSelect);
            yearSelect.addEventListener('change', () => {
                if (yearSelect.value) {
                    loadSubjectOptions(subjectSelect, yearSelect.value);
                } else {
                    subjectSelect.innerHTML = '<option value="">Select Year First</option>';
                }
            });
        }
        
        // Add event listener for resource type changes
        if (resourceTypeSelect) {
            resourceTypeSelect.addEventListener('change', () => {
                toggleResourceFields(resourceTypeSelect.value);
            });
        }
        
        resourceForm.addEventListener('submit', handleResourceSubmit);
    }
}

// Load year options
async function loadYearOptions(selectElement) {
    try {
        selectElement.innerHTML = '<option value="">Loading...</option>';
        
        // Create year options for Pharm D (1-6 years)
        const years = [
            { id: 1, name: 'Pharm D 1st Year' },
            { id: 2, name: 'Pharm D 2nd Year' },
            { id: 3, name: 'Pharm D 3rd Year' },
            { id: 4, name: 'Pharm D 4th Year' },
            { id: 5, name: 'Pharm D 5th Year' },
            { id: 6, name: 'Pharm D 6th Year' }
        ];
        
        selectElement.innerHTML = '<option value="">Select Year</option>';
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year.id;
            option.textContent = year.name;
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading years:', error);
        selectElement.innerHTML = '<option value="">Error loading years</option>';
    }
}

// Load subject options
async function loadSubjectOptions(selectElement, yearId) {
    try {
        selectElement.innerHTML = '<option value="">Loading subjects...</option>';
        
        const subjects = await api('list_subjects', { year_id: yearId });
        
        selectElement.innerHTML = '<option value="">Select Subject</option>';
        if (subjects && subjects.length > 0) {
            subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject.id;
                option.textContent = subject.name;
                selectElement.appendChild(option);
            });
        } else {
            selectElement.innerHTML = '<option value="">No subjects found</option>';
        }
    } catch (error) {
        console.error('Error loading subjects:', error);
        selectElement.innerHTML = '<option value="">Error loading subjects</option>';
    }
}

// Form submit handlers
async function handleBookSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    formData.append('action', 'admin_create_resource');
    formData.append('resource_type', 'book');
    
    try {
        const result = await api('admin_create_resource', {}, 'POST', formData);
        if (result.success) {
            alert('Book added successfully!');
            closeModal('bookModal');
            loadBooks();
        } else {
            alert('Error: ' + (result.error || 'Failed to add book'));
        }
    } catch (error) {
        console.error('Error adding book:', error);
        alert('Failed to add book. Please try again.');
    }
}

async function handleJournalSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    formData.append('action', 'admin_create_resource');
    formData.append('resource_type', 'journal');
    
    try {
        const result = await api('admin_create_resource', {}, 'POST', formData);
        if (result.success) {
            alert('Journal added successfully!');
            closeModal('journalModal');
            loadJournals();
        } else {
            alert('Error: ' + (result.error || 'Failed to add journal'));
        }
    } catch (error) {
        console.error('Error adding journal:', error);
        alert('Failed to add journal. Please try again.');
    }
}

// handlePublicationSubmit removed (Publications managed via Pages)

// handleCareerSubmit removed (Careers managed via Pages)

async function handleQuestionSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    formData.append('action', 'admin_create_resource');
    formData.append('resource_type', 'question');
    
    try {
        const result = await api('admin_create_resource', {}, 'POST', formData);
        if (result.success) {
            alert('Previous year questions added successfully!');
            closeModal('questionModal');
            loadQuestions();
        } else {
            alert('Error: ' + (result.error || 'Failed to add questions'));
        }
    } catch (error) {
        console.error('Error adding questions:', error);
        alert('Failed to add questions. Please try again.');
    }
}

async function loadQuestions() {
    try {
        const resources = await api('admin_list_resources');
        const questions = resources.filter(resource => resource.resource_type === 'question');
        const tbody = document.querySelector('#questionsTable tbody');
        
        if (tbody) {
            if (questions && questions.length > 0) {
                tbody.innerHTML = questions.map(q => `
                    <tr>
                        <td>${q.year_name || '-'}</td>
                        <td>${q.subject_name || '-'}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>
                            <button class="btn danger small" onclick="deleteResource(${q.id}, 'question')">Delete</button>
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No questions found</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

async function handleResourceSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    formData.append('action', 'admin_create_resource');
    
    // Handle thumbnail file separately if present
    const thumbnailInput = form.querySelector('#resourceThumbnail');
    if (thumbnailInput && thumbnailInput.files[0]) {
        formData.append('thumbnail', thumbnailInput.files[0]);
    }
    
    // The resource_type is already set in the form
    
    try {
        const result = await api('admin_create_resource', {}, 'POST', formData);
        if (result.success) {
            alert('Resource added successfully!');
            closeModal('resourceModal');
            form.reset(); // Clear the form
            loadResources();
        } else {
            alert('Error: ' + (result.error || 'Failed to add resource'));
        }
    } catch (error) {
        console.error('Error adding resource:', error);
        alert('Failed to add resource. Please try again.');
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load stats for dashboard
        const stats = await api('admin_stats');
        updateDashboardStats(stats);
        
        // Load data for each section
        loadBooks();
        loadJournals(); // Now using enhanced resource system
        loadPublications(); // Now using enhanced resource system
        loadCareers(); // Now using enhanced resource system
        loadImportantQuestions(); // New important questions system
        loadQuestions();
        loadResources();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function updateDashboardStats(stats) {
    // Update dashboard overview stats
    const totalBooksEl = document.getElementById('totalBooks');
    const totalJournalsEl = document.getElementById('totalJournals');
    const totalPublicationsEl = document.getElementById('totalPublications');
    const activeJobsEl = document.getElementById('activeJobs');
    
    if (totalBooksEl) totalBooksEl.textContent = '0'; // Will be updated by loadBooks
    if (totalJournalsEl) totalJournalsEl.textContent = '0'; // Will be updated by loadJournals
    if (totalPublicationsEl) totalPublicationsEl.textContent = '0'; // Will be updated by loadPublications
    if (activeJobsEl) activeJobsEl.textContent = '0'; // Will be updated by loadCareers
    
    // Update header stats if they exist
    const totalResourcesEl = document.getElementById('totalResources');
    const totalViewsEl = document.getElementById('totalViews');
    
    if (totalResourcesEl && stats.total_resources) {
        totalResourcesEl.textContent = stats.total_resources;
    }
    if (totalViewsEl && stats.total_views_30d) {
        totalViewsEl.textContent = stats.total_views_30d;
    }
}

// Load individual sections
async function loadBooks() {
    try {
        const books = await api('admin_list_resources');
        const bookResources = books.filter(resource => resource.resource_type === 'book');
        const tbody = document.querySelector('#booksTable tbody');
        
        if (tbody) {
            if (bookResources && bookResources.length > 0) {
                tbody.innerHTML = bookResources.map(book => `
                    <tr>
                        <td>${book.title}</td>
                        <td>${book.description || '-'}</td>
                        <td>${book.year_name || '-'}</td>
                        <td>${book.subject_name || '-'}</td>
                        <td>
                            <button class="btn danger small" onclick="deleteResource(${book.id}, 'book')">Delete</button>
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No books found</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading books:', error);
    }
}

async function loadJournals() {
    try {
        const resources = await api('admin_list_resources');
        const journals = resources.filter(resource => resource.resource_type === 'journal');
        const tbody = document.querySelector('#journalsTable tbody');
        
        if (tbody) {
            if (journals && journals.length > 0) {
                tbody.innerHTML = journals.map(journal => `
                    <tr>
                        <td>${journal.title}</td>
                        <td>${journal.description || '-'}</td>
                        <td>${journal.year_name || '-'}</td>
                        <td>${journal.subject_name || '-'}</td>
                        <td><span class="badge journal">Journal</span></td>
                        <td>
                            <button class="btn danger small" onclick="deleteResource(${journal.id}, 'journal')">Delete</button>
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No journals found</td></tr>';
            }
        }
        
        // Update dashboard stats
        const totalJournalsEl = document.getElementById('totalJournals');
        if (totalJournalsEl) totalJournalsEl.textContent = journals.length;
    } catch (error) {
        console.error('Error loading journals:', error);
    }
}

async function loadPublications() {
    try {
        const resources = await api('admin_list_resources');
        const publications = resources.filter(resource => resource.resource_type === 'publication');
        const tbody = document.querySelector('#publicationsTable tbody');
        
        if (tbody) {
            if (publications && publications.length > 0) {
                tbody.innerHTML = publications.map(publication => `
                    <tr>
                        <td>${publication.title}</td>
                        <td>${publication.description || '-'}</td>
                        <td>${publication.year_name || '-'}</td>
                        <td>${publication.subject_name || '-'}</td>
                        <td><span class="badge publication">Publication</span></td>
                        <td>
                            <button class="btn danger small" onclick="deleteResource(${publication.id}, 'publication')">Delete</button>
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No publications found</td></tr>';
            }
        }
        
        // Update dashboard stats
        const totalPublicationsEl = document.getElementById('totalPublications');
        if (totalPublicationsEl) totalPublicationsEl.textContent = publications.length;
    } catch (error) {
        console.error('Error loading publications:', error);
    }
}

async function loadCareers() {
    try {
        const resources = await api('admin_list_resources');
        const careers = resources.filter(resource => resource.resource_type === 'career');
        const tbody = document.querySelector('#careersTable tbody');
        
        if (tbody) {
            if (careers && careers.length > 0) {
                tbody.innerHTML = careers.map(career => `
                    <tr>
                        <td>${career.title}</td>
                        <td>${career.description || '-'}</td>
                        <td>${career.year_name || '-'}</td>
                        <td>${career.subject_name || '-'}</td>
                        <td><span class="badge career">Career</span></td>
                        <td>
                            <button class="btn danger small" onclick="deleteResource(${career.id}, 'career')">Delete</button>
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No career resources found</td></tr>';
            }
        }
        
        // Update dashboard stats
        const activeJobsEl = document.getElementById('activeJobs');
        if (activeJobsEl) activeJobsEl.textContent = careers.length;
    } catch (error) {
        console.error('Error loading careers:', error);
    }
}

async function loadImportantQuestions() {
    try {
        const resources = await api('admin_list_resources');
        const importantQuestions = resources.filter(resource => resource.resource_type === 'important-question');
        const tbody = document.querySelector('#importantQuestionsTable tbody');
        
        if (tbody) {
            if (importantQuestions && importantQuestions.length > 0) {
                tbody.innerHTML = importantQuestions.map(question => `
                    <tr>
                        <td>${question.title}</td>
                        <td>${question.description || '-'}</td>
                        <td>${question.year_name || '-'}</td>
                        <td>${question.subject_name || '-'}</td>
                        <td><span class="badge important-question">Important Question</span></td>
                        <td>
                            <button class="btn danger small" onclick="deleteResource(${question.id}, 'important-question')">Delete</button>
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No important questions found</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading important questions:', error);
    }
}

async function loadQuestions() {
    try {
        const resources = await api('admin_list_resources');
        const questions = resources.filter(resource => resource.resource_type === 'question');
        const tbody = document.querySelector('#questionsTable tbody');
        
        if (tbody) {
            if (questions && questions.length > 0) {
                tbody.innerHTML = questions.map(q => `
                    <tr>
                        <td>${q.title}</td>
                        <td>${q.year_name || (q.year_id ? `Year ${q.year_id}` : '-')}</td>
                        <td>${q.subject_name || 'General'}</td>
                        <td>${q.uploaded_at || '-'}</td>
                        <td>
                            <button class="btn danger small" onclick="deleteResource(${q.id}, 'question')">Delete</button>
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No questions found</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

async function loadResources() {
    try {
        const resources = await api('admin_list_resources');
        const tbody = document.querySelector('#resourcesTable tbody');
        
        if (tbody) {
            if (resources && resources.length > 0) {
                tbody.innerHTML = resources.map(resource => `
                    <tr>
                        <td>${resource.title}</td>
                        <td>${resource.resource_type || 'resource'}</td>
                        <td>${resource.subject_name || '-'}</td>
                        <td>${resource.uploaded_at || '-'}</td>
                        <td>
                            <button class="btn danger small" onclick="deleteResource(${resource.id}, '${resource.resource_type}')">Delete</button>
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No resources found</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading resources:', error);
    }
}

// Delete functions
async function deleteResource(id, type) {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    
    try {
        const result = await api('admin_delete_resource', { resource_id: id }, 'POST');
        if (result.success) {
            alert('Resource deleted successfully!');
            // Reload the appropriate section
            if (type === 'book') loadBooks();
            else if (type === 'journal') loadJournals();
            else if (type === 'publication') loadPublications();
            else if (type === 'career') loadCareers();
            else if (type === 'important-question') loadImportantQuestions();
            else if (type === 'question') loadQuestions();
        } else {
            alert('Error: ' + (result.error || 'Failed to delete resource'));
        }
    } catch (error) {
        console.error('Error deleting resource:', error);
        alert('Failed to delete resource. Please try again.');
    }
}

// Remove the individual delete functions since we're using the unified deleteResource function

// Logout functionality - integrated into main initialization
