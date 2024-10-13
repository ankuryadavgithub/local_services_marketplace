// Function to load header and footer
function loadHeaderFooter() {
    // Load Header
    fetch('header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header').innerHTML = data;
            setupThemeToggle(); // Call the theme toggle setup after loading the header
        })
        .catch(error => console.error('Error loading header:', error));

    // Load Footer
    fetch('footer.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('footer').innerHTML = data;
        })
        .catch(error => console.error('Error loading footer:', error));
}

// Function to set up the theme toggle
function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');

    // Check the saved theme preference in localStorage
    const currentTheme = localStorage.getItem('theme');

    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '🌞'; // Change button to sun icon
    } else {
        themeToggle.textContent = '🌙'; // Change button to moon icon
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        themeToggle.textContent = isDarkMode ? '🌞' : '🌙';

        // Save the current theme preference in localStorage
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    });
}

// Call the function when the window loads
window.onload = loadHeaderFooter;

// Navigation highlighting script
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

document.getElementById('logout-btn').addEventListener('click', function() {
    // Clear user data (if necessary)
    localStorage.removeItem('user'); // Example, adjust as per your implementation

    // Redirect to login page
    window.location.href = '/login';
});




