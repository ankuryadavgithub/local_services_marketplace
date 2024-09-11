    document.addEventListener('DOMContentLoaded', function () {
        // Get the current URL path
        var path = window.location.pathname;

        // Select all navigation links
        var navLinks = document.querySelectorAll('nav a');

        // Loop through the links
        navLinks.forEach(function(link) {
            // If the href attribute matches the current path, add 'active' class
            if (link.getAttribute('href') === path) {
                link.classList.add('active');
            }
        });
    });

document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle Script
    const themeToggle = document.getElementById('theme-toggle');
    
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        themeToggle.textContent = isDarkMode ? '🌞' : '🌙';
    });
})

