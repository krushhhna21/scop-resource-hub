document.addEventListener('DOMContentLoaded', () => {
  // Add icons and structure to year buttons
  function enhanceYearButtons() {
    document.querySelectorAll('.year-btn').forEach(button => {
      if (!button.querySelector('.year-icon')) {
        const yearText = button.textContent.trim();
        const yearNumber = yearText.match(/\d+/)?.[0] || '1';
        
        const iconContainer = document.createElement('div');
        iconContainer.className = 'year-icon';
        iconContainer.textContent = yearNumber;

    // Log for debugging
    console.log('Menu elements:', { menuButton, menuContent });

    // Toggle menu on button click
    menuButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        menuContent.classList.toggle('active');
        console.log('Menu toggled, active:', menuContent.classList.contains('active'));
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        const isClickInside = menuContent.contains(e.target) || menuButton.contains(e.target);
        if (!isClickInside && menuContent.classList.contains('active')) {
            menuContent.classList.remove('active');
            console.log('Menu closed from outside click');
        }
    });

    // Handle menu item clicks
    document.querySelectorAll('.menu-item[data-library]').forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.getAttribute('href') === 'admin-login.html') return;
            
            e.preventDefault();
            const libraryType = item.dataset.library;
            console.log('Menu item clicked:', libraryType);

            if (['resource', 'book', 'question'].includes(libraryType)) {
                // Update hash for library switch
                window.location.hash = `type=${libraryType}`;
                
                // Close menu
                menuContent.classList.remove('active');

                // Update active states
                document.querySelectorAll('.menu-item').forEach(mi => 
                    mi.classList.toggle('active', mi === item)
                );
            }
        });
    });
});

  // Add icons and structure to year buttons
  document.querySelectorAll('.year-btn').forEach(button => {
    if (!button.querySelector('.year-icon')) {
      const yearText = button.textContent.trim();
      const yearNumber = yearText.match(/\d+/)?.[0] || '1';
      
      const iconContainer = document.createElement('div');
      iconContainer.className = 'year-icon';
      iconContainer.textContent = yearNumber;
      
      const content = document.createElement('div');
      content.className = 'content';
      
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = yearText;
      
      const subtitle = document.createElement('div');
      subtitle.className = 'subtitle';
      subtitle.textContent = `Pharm D ${getYearSuffix(yearNumber)} Year Resources`;
      
      const arrow = document.createElement('div');
      arrow.className = 'arrow';
      arrow.innerHTML = '→';
      
      content.appendChild(title);
      content.appendChild(subtitle);
      
      button.textContent = '';
      button.appendChild(iconContainer);
      button.appendChild(content);
      button.appendChild(arrow);
    }
  });

  // Add icons and structure to subject buttons
  document.querySelectorAll('.subject-btn').forEach(button => {
    if (!button.querySelector('.subject-icon')) {
      const subjectText = button.textContent.trim();
      
      const iconContainer = document.createElement('div');
      iconContainer.className = 'subject-icon';
      iconContainer.textContent = getSubjectIcon(subjectText);
      
      const content = document.createElement('div');
      content.className = 'content';
      
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = subjectText;
      
      const subtitle = document.createElement('div');
      subtitle.className = 'subtitle';
      subtitle.textContent = 'View study materials';
      
      const arrow = document.createElement('div');
      arrow.className = 'arrow';
      arrow.innerHTML = '→';
      
      content.appendChild(title);
      content.appendChild(subtitle);
      
      button.textContent = '';
      button.appendChild(iconContainer);
      button.appendChild(content);
      button.appendChild(arrow);
    }
  });

  // Helper function to get year suffix
  function getYearSuffix(num) {
    const n = parseInt(num);
    if (n === 1) return 'st';
    if (n === 2) return 'nd';
    if (n === 3) return 'rd';
    return 'th';
  }

  // Helper function to get subject icon
  function getSubjectIcon(subject) {
    const subjectLower = subject.toLowerCase();
    if (subjectLower.includes('chemistry')) return '⚗️';
    if (subjectLower.includes('anatomy') || subjectLower.includes('physiology')) return '🔬';
    if (subjectLower.includes('pharmacy') || subjectLower.includes('pharmaceutical')) return '💊';
    if (subjectLower.includes('pathology') || subjectLower.includes('pathophysiology')) return '🏥';
    if (subjectLower.includes('clinical')) return '👨‍⚕️';
    if (subjectLower.includes('project') || subjectLower.includes('internship')) return '📋';
    return '📚';
  }
});
