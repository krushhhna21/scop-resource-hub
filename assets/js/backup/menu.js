const initializeMenu = () => {
  console.log('Script loaded!');

  // Get menu elements
  const menuButton = document.getElementById('menuButton');
  const menuContent = document.getElementById('menuContent');
  const librarySections = document.querySelectorAll('.library-section');

  if (!menuButton || !menuContent) {
    console.error('Menu elements not found!');
    return;
  }

  // Function to show library section
  const showLibrary = (libraryType) => {
    // Hide all sections first
    librarySections.forEach(section => {
      section.style.display = 'none';
      section.classList.remove('active');
    });
    
    // Show selected library section
    const currentLibrary = document.getElementById(`${libraryType}-library`);
    if (currentLibrary) {
      currentLibrary.style.display = 'block';
      requestAnimationFrame(() => currentLibrary.classList.add('active'));
    }

    // Update menu items
    document.querySelectorAll('.menu-item[data-library]').forEach(item => {
      item.classList.toggle('active', item.dataset.library === libraryType);
    });
  };

  // Toggle menu on button click
  menuButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    menuContent.classList.toggle('active');
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!menuContent.contains(e.target) && !menuButton.contains(e.target)) {
      menuContent.classList.remove('active');
    }
  });

  // Handle menu item clicks using event delegation
  menuContent.addEventListener('click', (e) => {
    const menuItem = e.target.closest('.menu-item[data-library]');
    if (!menuItem) return;

    // Allow admin link to work normally
    if (menuItem.getAttribute('href') === 'admin-login.html') return;

    e.preventDefault();
    const libraryType = menuItem.dataset.library;
    
    // Update hash and show library
    location.hash = new URLSearchParams({ type: libraryType }).toString();
    showLibrary(libraryType);
    
    // Close menu
    menuContent.classList.remove('active');
  });

  // Handle hash changes
  window.addEventListener('hashchange', () => {
    const params = new URLSearchParams(location.hash.slice(1));
    const type = params.get('type') || 'home';
    showLibrary(type);
  });

  // Initial load
  const params = new URLSearchParams(location.hash.slice(1));
  const type = params.get('type') || 'home';
  showLibrary(type);

  console.log('Menu initialized!');
});