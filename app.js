// ===== GLOBAL VARIABLES =====
let stars = [];
let currentTheme = 'dark';
let projectsData = [];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initStarfield();
    initTheme();
    initProjects();
    initScrollEffects();
    initNameAnimation();
    initProjectFilters();
    initCompactToggle();
    initTiltEffect();
    
    // Start name animation after a short delay
    setTimeout(startSlotAnimation, 500);
});

// ===== STARFIELD ANIMATION =====
function initStarfield() {
    const canvas = document.getElementById('starfield');
    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = document.documentElement.scrollHeight; // Full page height
        initStars();
    }
    
    function initStars() {
        stars = [];
        const numStars = Math.floor((canvas.width * canvas.height) / 8000);
        
        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 0.5 + 0.1,
                opacity: Math.random() * 0.8 + 0.2
            });
        }
    }
    
    function animateStars() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        stars.forEach(star => {
            // Move star
            star.y += star.speed;
            
            // Reset star if it goes off screen
            if (star.y > canvas.height) {
                star.y = -star.size;
                star.x = Math.random() * canvas.width;
            }
            
            // Draw star
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
            if (currentTheme === 'light') {
                ctx.fillStyle = `rgba(26, 26, 46, ${star.opacity * 0.3})`;
            }
            ctx.fill();
            
            // Add twinkle effect
            star.opacity += (Math.random() - 0.5) * 0.02;
            star.opacity = Math.max(0.1, Math.min(0.9, star.opacity));
        });
        
        requestAnimationFrame(animateStars);
    }
    
    resizeCanvas();
    animateStars();
    
    window.addEventListener('resize', resizeCanvas);
    
    // Update canvas height when content changes
    const observer = new ResizeObserver(() => {
        resizeCanvas();
    });
    observer.observe(document.body);
}

// ===== SLOT MACHINE NAME ANIMATION =====
function initNameAnimation() {
    const nameSpans = document.querySelectorAll('.animated-name span:not(.space)');
    
    // Create arrays of random characters for the slot effect
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
    
    // Set initial random characters when page loads
    nameSpans.forEach(span => {
        span.textContent = chars[Math.floor(Math.random() * chars.length)];
    });
    
    window.nameSpans = nameSpans;
    window.randomChars = chars;
}

function startSlotAnimation() {
    const nameSpans = window.nameSpans;
    const chars = window.randomChars;
    
    nameSpans.forEach((span, index) => {
        const finalChar = span.getAttribute('data-char');
        const delay = index * 100; // Stagger the animation
        
        setTimeout(() => {
            span.classList.add('spinning');
            
            // Random character cycling
            let cycleCount = 0;
            const maxCycles = 15 + Math.random() * 10;
            
            const interval = setInterval(() => {
                if (cycleCount < maxCycles) {
                    span.textContent = chars[Math.floor(Math.random() * chars.length)];
                    cycleCount++;
                } else {
                    span.textContent = finalChar;
                    span.classList.remove('spinning');
                    clearInterval(interval);
                }
            }, 50);
        }, delay);
    });
}

// ===== THEME TOGGLE =====
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    currentTheme = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon();
    
    themeToggle.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = document.querySelector('#theme-toggle i');
    icon.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// ===== PROJECTS DATA AND INITIALIZATION =====
function initProjects() {
  projectsData = [
    {
      id: 1,
      title: "Boomerang Loop Combat",
      description: "Fast-paced action arcade game built in Unreal Engine with Quake-style movement and boomerang combat mechanics.",
      tags: ["Unreal Engine", "Blueprints", "C++", "Game Jam"],
      category: "ue5",
      icon: "🪃",
      links: [
        { text: "Play", url: "#" },
        { text: "Devlog", url: "#" }
      ]
    },
    {
      id: 2,
      title: "Breakable Glass System",
      description: "Dynamic fracturing system for glass in Unreal Engine that breaks at impact points with physics-based shards.",
      tags: ["Unreal Engine", "Physics", "Blueprints"],
      category: "ue5",
      icon: "🪟",
      links: [
        { text: "Demo", url: "#" },
        { text: "GitHub", url: "#" }
      ]
    },
    {
      id: 3,
      title: "Physics-Based Parkour Game",
      description: "Experimental Unreal Engine project with realistic physics-driven parkour, climbing and momentum mechanics.",
      tags: ["Unreal Engine", "Physics", "Gameplay"],
      category: "ue5",
      icon: "🏃‍♂️",
      links: [
        { text: "Demo", url: "#" },
        { text: "Source", url: "#" }
      ]
    },
    {
      id: 4,
      title: "Tacky — Task Manager",
      description: "A task-management web app with boards, lists and cards. Backend built with Python; frontend uses HTML, CSS and JavaScript.",
      tags: ["Python", "HTML", "CSS", "JavaScript", "Web App"],
      category: "web",
      icon: "📋",
      links: [
        { text: "Preview", url: "#" },
        { text: "Backend Repo", url: "#" }
      ]
    },
    {
      id: 5,
      title: "Book Management Software",
      description: "Desktop & web solution to catalog, search and track personal or library book collections with import/export and tagging.",
      tags: ["Python", "SQLite", "Electron", "Catalog"],
      category: "web",
      icon: "📚",
      links: [
        { text: "Download", url: "#" },
        { text: "Docs", url: "#" }
      ]
    },
    {
      id: 6,
      title: "ESP32 GPS Tracker",
      description: "ESP32-based GPS tracker with Wi-Fi reporting for real-time location tracking and simple dashboard integration.",
      tags: ["ESP32", "GPS", "IoT", "C++"],
      category: "iot",
      icon: "📡",
      links: [
        { text: "Hardware", url: "#" },
        { text: "API", url: "#" }
      ]
    },
    {
      id: 7,
      title: "DIY NAS",
      description: "Network-attached storage build using Raspberry Pi (or small x86) with automated backups, media streaming and remote access.",
      tags: ["Linux", "Raspberry Pi", "Networking", "Samba"],
      category: "linux",
      icon: "💾",
      links: [
        { text: "Guide", url: "#" },
        { text: "Config", url: "#" }
      ]
    },
    {
      id: 8,
      title: "Battleship — Networked Game",
      description: "Classic Battleship reimagined as a networked multiplayer game with lobby, matchmaking and turn-synced gameplay.",
      tags: ["Python", "Sockets", "Multiplayer"],
      category: "web",
      icon: "🚢",
      links: [
        { text: "Play", url: "#" },
        { text: "GitHub", url: "#" }
      ]
    },
    {
      id: 9,
      title: "IoT Wi-Fi Button",
      description: "Small programmable Wi-Fi button device for triggering automations (HTTP webhooks, MQTT, IFTTT integrations).",
      tags: ["IoT", "ESP8266", "Automation", "MQTT"],
      category: "iot",
      icon: "🔘",
      links: [
        { text: "Demo", url: "#" },
        { text: "Hardware", url: "#" }
      ]
    },
    {
      id: 10,
      title: "Python Weather App",
      description: "Lightweight Python app that fetches real-time conditions and forecasts from weather APIs; includes simple GUI and logging.",
      tags: ["Python", "API", "GUI"],
      category: "ai-ml",
      icon: "🌦️",
      links: [
        { text: "Download", url: "#" },
        { text: "GitHub", url: "#" }
      ]
    },
    {
      id: 11,
      title: "Local AI Chatbot (Ollama)",
      description: "Local-first AI chatbot using Ollama models to run language models on-device for private Q&A and developer tooling.",
      tags: ["Ollama", "Local AI", "Python", "LLM"],
      category: "ai-ml",
      icon: "🤖",
      links: [
        { text: "Setup Guide", url: "#" },
        { text: "Demo", url: "#" }
      ]
    },
    {
      id: 12,
      title: "Movie Genre Classification",
      description: "ML model that predicts a movie's genre from its plot summary using TF-IDF/embeddings plus classifiers like Logistic Regression or SVM.",
      tags: ["Python", "NLP", "TF-IDF", "Scikit-learn"],
      category: "ai-ml",
      icon: "🎬",
      links: [
        { text: "Notebook", url: "#" },
        { text: "Dataset", url: "#" }
      ]
    },
    {
      id: 13,
      title: "Credit Card Fraud Detection",
      description: "Classification model to detect fraudulent transactions using Logistic Regression, Decision Trees and Random Forest experiments.",
      tags: ["Python", "Scikit-learn", "Imbalanced Data", "RandomForest"],
      category: "ai-ml",
      icon: "💳",
      links: [
        { text: "Notebook", url: "#" },
        { text: "Dataset", url: "#" }
      ]
    },
    {
      id: 14,
      title: "Spam SMS Detection",
      description: "Spam classifier for SMS messages built with TF-IDF and classic classifiers (Naive Bayes, SVM) and evaluation pipelines.",
      tags: ["NLP", "TF-IDF", "Naive Bayes", "Python"],
      category: "ai-ml",
      icon: "✉️",
      links: [
        { text: "Notebook", url: "#" },
        { text: "Dataset", url: "#" }
      ]
    },
    {
      id: 15,
      title: "E-commerce UI/UX Demo",
      description: "Visually appealing and usable e-commerce front-end prototype with clear categories, search and product flows. (For demo click here.)",
      tags: ["UI/UX", "React", "Design", "E-commerce"],
      category: "web",
      icon: "🛍️",
      links: [
        { text: "Demo", url: "#" },
        { text: "Design Files", url: "#" }
      ]
    },
    {
      id: 16,
      title: "Neural Network Visualizer",
      description: "Interactive web app for visualizing NN architectures, activations and training processes using D3/WebGL.",
      tags: ["JavaScript", "D3.js", "WebGL", "ML"],
      category: "ai-ml",
      icon: "🧠",
      links: [
        { text: "Live Demo", url: "#" },
        { text: "Source", url: "#" }
      ]
    },
    {
      id: 17,
      title: "3D Portfolio Website",
      description: "My interactive 3D portfolio with WebGL animations, particle systems and responsive design.",
      tags: ["Three.js", "WebGL", "JavaScript"],
      category: "web",
      icon: "🌐",
      links: [
        { text: "Visit", url: "#" },
        { text: "Code", url: "#" }
      ]
    }
  ];

  renderProjects();
}

function renderProjects(filter = 'all') {
    const grid = document.getElementById('projects-grid');
    const filteredProjects = filter === 'all' 
        ? projectsData 
        : projectsData.filter(project => project.category === filter);
    
    grid.innerHTML = filteredProjects.map(project => `
        <div class="project-card" data-category="${project.category}">
            <div class="project-image">
                ${project.icon}
            </div>
            <div class="project-content">
                <h3 class="project-title">${project.title}</h3>
                <p class="project-description">${project.description}</p>
                <div class="project-tags">
                    ${project.tags.map(tag => `<span class="project-tag">${tag}</span>`).join('')}
                </div>
                <div class="project-links">
                    ${project.links.map(link => `<a href="${link.url}" class="project-link">${link.text}</a>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
    
    // Reinitialize tilt effect for new cards
    initTiltEffect();
}

// ===== PROJECT FILTERS =====
function initProjectFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Filter projects
            const filter = button.getAttribute('data-filter');
            renderProjects(filter);
        });
    });
}

// ===== COMPACT TOGGLE =====
function initCompactToggle() {
    const compactToggle = document.getElementById('compact-toggle');
    const projectsGrid = document.getElementById('projects-grid');
    
    compactToggle.addEventListener('change', () => {
        if (compactToggle.checked) {
            projectsGrid.classList.add('compact');
        } else {
            projectsGrid.classList.remove('compact');
        }
    });
}

// ===== TILT EFFECT =====
function initTiltEffect() {
    const cards = document.querySelectorAll('.project-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', handleTilt);
        card.addEventListener('mouseleave', resetTilt);
    });
}

function handleTilt(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / centerY * -10;
    const rotateY = (x - centerX) / centerX * 10;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
}

function resetTilt(e) {
    const card = e.currentTarget;
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
}

// ===== SCROLL EFFECTS =====
function initScrollEffects() {
    const scrollTopBtn = document.getElementById('scroll-top');
    
    // Show/hide scroll to top button
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }
    });
    
    // Navbar background on scroll
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(26, 26, 46, 0.95)';
        } else {
            navbar.style.background = 'rgba(26, 26, 46, 0.9)';
        }
    });
}

// ===== SMOOTH SCROLLING =====
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        const offsetTop = element.offsetTop - 80; // Account for navbar height
        window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
        });
    }
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// ===== FORM HANDLING =====
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.querySelector('.contact-form form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleFormSubmit);
    }
});

function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Simulate form submission
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
    setTimeout(() => {
        submitBtn.textContent = 'Message Sent!';
        submitBtn.style.background = '#28a745';
        
        setTimeout(() => {
            submitBtn.textContent = originalText;
            submitBtn.style.background = '';
            submitBtn.disabled = false;
            e.target.reset();
        }, 2000);
    }, 1500);
}

// ===== INTERSECTION OBSERVER FOR ANIMATIONS =====
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe sections and cards
    const elementsToObserve = document.querySelectorAll('.section, .project-card, .skill-category');
    elementsToObserve.forEach(el => observer.observe(el));
}

// ===== EASTER EGGS =====
function initEasterEggs() {
    // Konami Code Easter Egg
    let konamiCode = [];
    const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
    
    document.addEventListener('keydown', (e) => {
        konamiCode.push(e.code);
        if (konamiCode.length > konamiSequence.length) {
            konamiCode.shift();
        }
        
        if (JSON.stringify(konamiCode) === JSON.stringify(konamiSequence)) {
            triggerEasterEgg();
            konamiCode = [];
        }
    });
    
    // Click counter for name
    let nameClickCount = 0;
    const animatedName = document.querySelector('.animated-name');
    animatedName.addEventListener('click', () => {
        nameClickCount++;
        if (nameClickCount === 5) {
            startSlotAnimation();
            nameClickCount = 0;
        }
    });
}

function triggerEasterEgg() {
    // Rainbow text effect
    const name = document.querySelector('.animated-name');
    name.style.animation = 'rainbow 2s linear infinite';
    
    // Add rainbow animation to CSS dynamically
    if (!document.querySelector('#rainbow-style')) {
        const style = document.createElement('style');
        style.id = 'rainbow-style';
        style.textContent = `
            @keyframes rainbow {
                0% { color: #ff0000; }
                16.66% { color: #ff8000; }
                33.33% { color: #ffff00; }
                50% { color: #00ff00; }
                66.66% { color: #0080ff; }
                83.33% { color: #8000ff; }
                100% { color: #ff0000; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Reset after 5 seconds
    setTimeout(() => {
        name.style.animation = 'glow 2s ease-in-out infinite alternate';
    }, 5000);
    
    console.log('🎉 Easter egg activated! Nice job finding it!');
}

// ===== PERFORMANCE OPTIMIZATION =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Debounced resize handler
const debouncedResize = debounce(() => {
    // Re-initialize starfield on resize
    const canvas = document.getElementById('starfield');
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
}, 250);

window.addEventListener('resize', debouncedResize);

// ===== FINAL INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initScrollAnimations();
    initEasterEggs();
    
    // Add loading animation completion
    document.body.classList.add('loaded');
    
    console.log('🚀 Portfolio loaded successfully!');
    console.log('💡 Try clicking the name 5 times or use the Konami code for surprises!');
});