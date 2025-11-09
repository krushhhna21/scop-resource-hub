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
    // Pages editor removed from UI
    initializeLogout();
    initializeAdminExtras();
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
// Pages editor removed — placeholder kept for backward compatibility
function initializePagesEditor() { /* no-op */ }

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
                // Lazy refresh data on navigation for dynamic sections
                try {
                    if (target === 'students') {
                        loadStudents();
                    } else if (target === 'student-approvals') {
                        loadStudentApprovals();
                    } else if (target === 'resources') {
                        loadResources();
                    } else if (target === 'questions') {
                        loadQuestions();
                    } else if (target === 'careers') {
                        loadCareers();
                    } else if (target === 'journals') {
                        loadJournals();
                    }
                } catch (_) {}
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
            // Use systems for Case Study modal; years for others
            if (modalId === 'questionModal') {
                loadCaseSystemOptions(yearSelect);
            } else {
                loadYearOptions(yearSelect);
            }
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
                'important-question': 'Add New Important Question',
                'question': 'Add New Case Study'
            };
            titleElement.textContent = titles[resourceType] || 'Add New Resource';
        }
        
        // Handle field visibility based on resource type
        toggleResourceFields(resourceType);
        // Initialize the Year/System select options accordingly
        const yearSelect = modal.querySelector('#resourceYear');
        if (yearSelect) {
            if (resourceType === 'question') {
                loadCaseSystemOptions(yearSelect);
            } else if (!['journal','publication','career'].includes(resourceType)) {
                loadYearOptions(yearSelect);
            }
        }
        
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
        // Show year field only for case studies (questions)
        if (yearField) yearField.classList.remove('hidden');
        if (subjectField) subjectField.classList.add('hidden');
        
        // Year/System required, subject optional
        if (yearSelect) {
            yearSelect.setAttribute('required', 'required');
            // Populate with systems instead of years
            loadCaseSystemOptions(yearSelect);
        }
        if (subjectSelect) subjectSelect.removeAttribute('required');
    } else {
        // Show both fields for specific resources (books, important-questions, etc.)
        if (yearField) yearField.classList.remove('hidden');
        if (subjectField) subjectField.classList.remove('hidden');
        
        // Both required
        if (yearSelect) {
            yearSelect.setAttribute('required', 'required');
            // For non-general resources (books etc.), load regular year options
            loadYearOptions(yearSelect);
        }
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
                // For case studies, offer system choices mapped to year_id
                loadCaseSystemOptions(yearSelect);
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

// Extra admin forms: vacancies, discussions
let CURRENT_CHANNEL_ID = null;
function initializeAdminExtras() {
    // Vacancy form
    const vacancyForm = document.getElementById('vacancyForm');
    if (vacancyForm) {
        vacancyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                title: vacancyForm.querySelector('#vacTitle')?.value?.trim() || '',
                company: vacancyForm.querySelector('#vacCompany')?.value?.trim() || undefined,
                location: vacancyForm.querySelector('#vacLocation')?.value?.trim() || undefined,
                category: vacancyForm.querySelector('#vacCategory')?.value?.trim() || undefined,
                description: vacancyForm.querySelector('#vacDesc')?.value?.trim() || undefined,
                application_link: vacancyForm.querySelector('#vacLink')?.value?.trim() || undefined,
            };
            const bf = vacancyForm.querySelector('#vacBatch')?.value;
            if (bf) payload.batch_filter = parseInt(bf, 10);
            try {
                const res = await api('create_vacancy', payload, 'POST');
                if (res && res.id) {
                    alert('Vacancy created.');
                    vacancyForm.reset();
                    loadVacanciesAdmin();
                } else {
                    alert(res?.error || 'Failed to create vacancy');
                }
            } catch (err) {
                alert('Failed to create vacancy.');
            }
        });
    }

    // Channel form
    const channelForm = document.getElementById('channelForm');
    if (channelForm) {
        channelForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                name: channelForm.querySelector('#chanName')?.value?.trim() || '',
                visibility: channelForm.querySelector('#chanVisibility')?.value || 'public',
                description: channelForm.querySelector('#chanDesc')?.value?.trim() || undefined,
            };
            try {
                const res = await api('create_channel', payload, 'POST');
                if (res && res.id) {
                    alert('Channel created.');
                    channelForm.reset();
                    loadChannelsAdmin();
                } else {
                    alert(res?.error || 'Failed to create channel');
                }
            } catch (err) {
                alert('Failed to create channel.');
            }
        });
    }

    // Post form
    const postForm = document.getElementById('postForm');
    if (postForm) {
        postForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!CURRENT_CHANNEL_ID) { alert('Select a channel first.'); return; }
            const content = document.getElementById('postContent')?.value?.trim();
            if (!content) { alert('Message is empty'); return; }
            try {
                const res = await api('create_post', { channel_id: CURRENT_CHANNEL_ID, content }, 'POST');
                if (res && res.id) {
                    document.getElementById('postContent').value = '';
                    loadPostsAdmin(CURRENT_CHANNEL_ID);
                } else {
                    alert(res?.error || 'Failed to post');
                }
            } catch (err) {
                alert('Failed to post message.');
            }
        });
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

// Load case study system options (maps systems to underlying year_id for compatibility)
function loadCaseSystemOptions(selectElement) {
    try {
        const systems = [
            { id: 1, name: 'Gastrointestinal system' },
            { id: 2, name: 'Nervous system' },
            { id: 3, name: 'Haematological system' },
            { id: 4, name: 'Infectious disease' },
            { id: 5, name: 'Renal system' },
            { id: 6, name: 'Musculoskeletal system' }
        ];
        selectElement.innerHTML = '<option value="">Select System</option>';
        systems.forEach(sys => {
            const option = document.createElement('option');
            option.value = sys.id; // mapped numeric id
            option.textContent = sys.name;
            selectElement.appendChild(option);
        });
    } catch (err) {
        console.error('Error loading systems:', err);
        selectElement.innerHTML = '<option value="">Error loading systems</option>';
    }
}

// Helper: map year_id (1..6) back to system label for display
function systemLabelFromYear(yearId) {
    const id = parseInt(yearId, 10);
    switch (id) {
        case 1: return 'Gastrointestinal system';
        case 2: return 'Nervous system';
        case 3: return 'Haematological system';
        case 4: return 'Infectious disease';
        case 5: return 'Renal system';
        case 6: return 'Musculoskeletal system';
        default: return '-';
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
            alert('Case study added successfully!');
            closeModal('questionModal');
            loadQuestions();
        } else {
            alert('Error: ' + (result.error || 'Failed to add questions'));
        }
    } catch (error) {
        console.error('Error adding questions:', error);
            alert('Failed to add case study. Please try again.');
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
                        <td>${systemLabelFromYear(q.year_id)}</td>
                        <td>${q.subject_name || '-'}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>
                            <button class="btn danger small" onclick="deleteResource(${q.id}, 'question')">Delete</button>
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No case studies found</td></tr>';
            }
        }
    } catch (error) {
    console.error('Error loading case studies:', error);
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
        loadJournals(); // Using enhanced resource system
        loadCareers(); // Now using enhanced resource system
        loadImportantQuestions(); // New important questions system
        loadQuestions();
    loadResources();
    loadStudentApprovals();
        loadStudents();
    loadVacanciesAdmin();
    // Discussions removed
        
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

// Publications approvals (new module)
async function loadPubApprovals() {
    const tbody = document.querySelector('#pubApprovalsTable tbody');
    if (!tbody) return;
    try {
        const items = await api('list_publications', { approved: 0 });
        if (items && items.length) {
            tbody.innerHTML = items.map(p => `
                <tr>
                    <td>${escapeHtml(p.title)}</td>
                    <td>${p.author_name || '-'}</td>
                    <td>${p.url ? `<a href="${escapeAttr(p.url)}" target="_blank">link</a>` : '-'}</td>
                    <td>${p.created_at || '-'}</td>
                    <td>
                        <button class="btn success small" onclick="approvePublication(${p.id})">Approve</button>
                        <button class="btn danger small" onclick="deletePublicationEntry(${p.id})">Delete</button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No pending publications</td></tr>';
        }
    } catch (err) {
        console.error('Error loading publication approvals:', err);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Failed to load</td></tr>';
    }
}

async function approvePublication(id) {
    if (!confirm('Approve this publication?')) return;
    try {
        const res = await api('approve_publication', { id }, 'POST');
        if (res?.success) {
            loadPubApprovals();
        } else {
            alert(res?.error || 'Failed to approve');
        }
    } catch (err) { alert('Failed to approve.'); }
}

async function deletePublicationEntry(id) {
    if (!confirm('Delete this publication?')) return;
    try {
        const res = await api('delete_publication', { id }, 'POST');
        if (res?.success) {
            loadPubApprovals();
        } else {
            alert(res?.error || 'Failed to delete');
        }
    } catch (err) { alert('Failed to delete.'); }
}

// Student approvals
async function loadStudentApprovals() {
    const tbody = document.querySelector('#studentApprovalsTable tbody');
    if (!tbody) return;
    try {
        const items = await api('admin_list_pending_users');
        if (items && items.length) {
            tbody.innerHTML = items.map(u => `
                <tr>
                    <td>${escapeHtml(u.display_name || '—')}</td>
                    <td>${escapeHtml(u.email || '—')}</td>
                    <td>${escapeHtml(u.role || 'student')}</td>
                    <td>${u.created_at || '—'}</td>
                    <td>
                        <button class=\"btn success small\" onclick=\"approveStudent(${u.id})\">Approve</button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No pending students</td></tr>';
        }
    } catch (err) {
        console.error('Error loading student approvals:', err);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Failed to load</td></tr>';
    }
}

// Full students listing and management
async function loadStudents() {
    const tbody = document.querySelector('#studentsTable tbody');
    if (!tbody) return;
    try {
        const items = await api('admin_list_students');
        if (items && items.length) {
            tbody.innerHTML = items.map(u => `
                <tr>
                    <td>${escapeHtml(u.display_name || '—')}</td>
                    <td>${escapeHtml(u.email || '—')}</td>
                        <td>${escapeHtml((u.course ?? '') || '—')}</td>
                    <td>${u.batch_year || '—'}</td>
                    <td>${u.is_approved ? '<span class="badge success">Yes</span>' : '<span class="badge">No</span>'}</td>
                    <td>${u.created_at || '—'}</td>
                    <td>
                        ${u.is_approved ? `
                          <button class="btn small" onclick="setUserApproval(${u.id}, false)">Unapprove</button>
                        ` : `
                          <button class="btn success small" onclick="setUserApproval(${u.id}, true)">Approve</button>
                        `}
                        <button class="btn danger small" onclick="deleteUser(${u.id})">Remove</button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No students found</td></tr>';
        }
    } catch (err) {
        console.error('Error loading students:', err);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Failed to load</td></tr>';
    }
}

async function setUserApproval(id, approved) {
    try {
        const res = await api('admin_set_user_approval', { id, approved: approved ? 1 : 0 }, 'POST');
        if (res?.success) {
            loadStudents();
            loadStudentApprovals();
        } else {
            alert(res?.error || 'Failed to update approval');
        }
    } catch (err) {
        alert('Failed to update approval.');
    }
}

async function deleteUser(id) {
    if (!confirm('Remove this student? This action cannot be undone.')) return;
    try {
        const res = await api('admin_delete_user', { id }, 'POST');
        if (res?.success) {
            loadStudents();
            loadStudentApprovals();
        } else {
            alert(res?.error || 'Failed to remove');
        }
    } catch (err) {
        alert('Failed to remove.');
    }
}

async function approveStudent(id) {
    if (!confirm('Approve this student?')) return;
    try {
        const res = await api('admin_approve_user', { id }, 'POST');
        if (res?.success) {
            // Refresh both tables after approval
            loadStudentApprovals();
            loadStudents();
        } else {
            alert(res?.error || 'Failed to approve');
        }
    } catch (err) { alert('Failed to approve.'); }
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
                        <td>${systemLabelFromYear(q.year_id)}</td>
                        <td>${q.subject_name || 'General'}</td>
                        <td>${q.uploaded_at || '-'}</td>
                        <td>
                            <button class="btn danger small" onclick="deleteResource(${q.id}, 'question')">Delete</button>
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No case studies found</td></tr>';
            }
        }
    } catch (error) {
    console.error('Error loading case studies:', error);
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

// Vacancies admin
async function loadVacanciesAdmin() {
    const tbody = document.querySelector('#vacanciesTable tbody');
    if (!tbody) return;
    try {
        const items = await api('list_vacancies');
        if (items && items.length) {
            tbody.innerHTML = items.map(v => `
                <tr>
                    <td>${escapeHtml(v.title)}</td>
                    <td>${v.company || '-'}</td>
                    <td>${v.location || '-'}</td>
                    <td>${v.category || '-'}</td>
                    <td>${v.batch_filter || '-'}</td>
                    <td>${v.application_link ? `<a href="${escapeAttr(v.application_link)}" target="_blank">Apply</a>` : '-'}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No vacancies</td></tr>';
        }
    } catch (err) {
        console.error('Error loading vacancies:', err);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Failed to load</td></tr>';
    }
}

// Discussions admin
async function loadChannelsAdmin() {
    const tbody = document.querySelector('#channelsTable tbody');
    if (!tbody) return;
    try {
        const items = await api('list_channels');
        if (items && items.length) {
            tbody.innerHTML = items.map(c => `
                <tr>
                    <td>${escapeHtml(c.name)}</td>
                    <td>${c.visibility || 'public'}</td>
                    <td>${c.created_at || '-'}</td>
                    <td>
                        <button class="btn small" onclick="selectChannel(${c.id}, '${escapeAttr(c.name)}')">View Posts</button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No channels</td></tr>';
        }
    } catch (err) {
        console.error('Error loading channels:', err);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Failed to load</td></tr>';
    }
}

function selectChannel(id, name) {
    CURRENT_CHANNEL_ID = id;
    const card = document.getElementById('postsCard');
    const hdr = document.getElementById('postsHeader');
    if (hdr) hdr.textContent = `Posts in ${name}`;
    if (card) card.style.display = 'block';
    loadPostsAdmin(id);
}

async function loadPostsAdmin(channelId) {
    const tbody = document.querySelector('#postsTable tbody');
    if (!tbody) return;
    try {
        const posts = await api('list_posts', { channel_id: channelId });
        if (posts && posts.length) {
            tbody.innerHTML = posts.map(p => `
                <tr>
                    <td>${p.id}</td>
                    <td>${p.parent_id || '-'}</td>
                    <td>${p.author_id || '-'}</td>
                    <td>${escapeHtml(p.content || '')}</td>
                    <td>${p.created_at || '-'}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No posts yet</td></tr>';
        }
    } catch (err) {
        console.error('Error loading posts:', err);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Failed to load</td></tr>';
    }
}

// Simple HTML escape helpers
function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}
function escapeAttr(s) { return escapeHtml(s); }

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
