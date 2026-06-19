document.addEventListener('DOMContentLoaded', () => {
    // --- ColorBends Dynamic Colors ---
    const colorBendsPalettes = {
        swiss: {
            dark:  ['#001144', '#002288', '#001a66'],
            light: ['#4d79ff', '#809fff', '#3366cc']
        },
        brutal: {
            dark:  ['#550000', '#880000', '#440000'],
            light: ['#ff4d4d', '#cc3333', '#ff6666']
        },
        acid: {
            dark:  ['#004400', '#440044', '#004444'],
            light: ['#66ff66', '#ff66ff', '#66ffff']
        },
        saas: {
            dark:  ['#032c4d', '#1b4d3f', '#002a4a'],
            light: ['#74b9ff', '#81ecec', '#a29bfe']
        }
    };

    function updateColorBends(styleName) {
        if (!window.ColorBends) return;
        const currentStyle = styleName || (localStorage.getItem('design-style') || 'swiss');
        const isLight = document.documentElement.classList.contains('light-mode');
        const mode = isLight ? 'light' : 'dark';
        const palette = colorBendsPalettes[currentStyle] || colorBendsPalettes.swiss;
        window.ColorBends.setColors(palette[mode]);
    }

    // --- Palette Logic ---
    const paletteTrigger = document.getElementById('paletteTrigger');
    const paletteDropdown = document.getElementById('paletteDropdown');
    const techTrigger = document.getElementById('techTrigger');
    const techDropdown = document.getElementById('techDropdown');
    const perfTrigger = document.getElementById('perfTrigger');
    const perfDropdown = document.getElementById('perfDropdown');
    const githubTrigger = document.getElementById('githubTrigger');
    const githubDropdown = document.getElementById('githubDropdown');
    let githubFetched = false;
    let perfInterval = null;
    const colorItems = document.querySelectorAll('.color-item');
    const toast = document.getElementById('toast');

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    if (paletteTrigger) {
        paletteTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (techDropdown) techDropdown.classList.remove('active');
            if (perfDropdown) perfDropdown.classList.remove('active');
            if (githubDropdown) githubDropdown.classList.remove('active');
            paletteDropdown.classList.toggle('active');
        });
    }

    if (techTrigger) {
        techTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (paletteDropdown) paletteDropdown.classList.remove('active');
            if (perfDropdown) perfDropdown.classList.remove('active');
            if (githubDropdown) githubDropdown.classList.remove('active');
            techDropdown.classList.toggle('active');
        });
    }

    if (perfTrigger) {
        perfTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (paletteDropdown) paletteDropdown.classList.remove('active');
            if (techDropdown) techDropdown.classList.remove('active');
            if (githubDropdown) githubDropdown.classList.remove('active');
            const isActive = perfDropdown.classList.toggle('active');
            
            if (isActive) {
                updatePerformanceMetrics();
                perfInterval = setInterval(updatePerformanceMetrics, 2000);
            } else {
                clearInterval(perfInterval);
            }
        });
    }

    if (githubTrigger) {
        githubTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (paletteDropdown) paletteDropdown.classList.remove('active');
            if (techDropdown) techDropdown.classList.remove('active');
            if (perfDropdown) perfDropdown.classList.remove('active');
            const isActive = githubDropdown.classList.toggle('active');

            if (isActive && !githubFetched) {
                fetchGithubRepos('keep-xylent');
                githubFetched = true;
            }
        });
    }

    function fetchGithubRepos(username) {
        const reposList = document.getElementById('githubReposList');
        const avatar = document.getElementById('githubAvatar');
        
        fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=5`)
            .then(res => res.json())
            .then(data => {
                if (data.length > 0 && data[0].owner) {
                    avatar.src = data[0].owner.avatar_url;
                    avatar.style.display = 'block';
                }
                
                if (data.length === 0) {
                    reposList.innerHTML = '<div style="padding: 10px; text-align: center; font-size: 0.8rem; color: var(--text-muted);">No public repositories found.</div>';
                    return;
                }

                reposList.innerHTML = data.map(repo => `
                    <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="tech-item" style="text-decoration: none;">
                        <div class="tech-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
                            </svg>
                        </div>
                        <div class="tech-info">
                            <span class="tech-category">${repo.language || 'Code'}</span>
                            <span class="tech-value">${repo.name}</span>
                        </div>
                    </a>
                `).join('');
            })
            .catch(err => {
                reposList.innerHTML = '<div style="padding: 10px; text-align: center; font-size: 0.8rem; color: var(--text-muted);">Failed to load repositories.</div>';
            });
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        if (paletteDropdown) {
            paletteDropdown.classList.remove('active');
            paletteTrigger.style.transform = 'rotate(0deg)';
        }
        if (techDropdown) techDropdown.classList.remove('active');
        if (githubDropdown) githubDropdown.classList.remove('active');
        if (perfDropdown) {
            perfDropdown.classList.remove('active');
            clearInterval(perfInterval);
        }
    });

    function updatePerformanceMetrics() {
        const metrics = {
            perfLoad: document.getElementById('perfLoad'),
            perfMemory: document.getElementById('perfMemory'),
            perfDOM: document.getElementById('perfDOM'),
            perfLatency: document.getElementById('perfLatency'),
            perfResources: document.getElementById('perfResources'),
            perfData: document.getElementById('perfData')
        };
        const statusFill = document.getElementById('perfStatusFill');

        const triggerAnimation = (el) => {
            el.classList.remove('updating');
            void el.offsetWidth; // Force reflow
            el.classList.add('updating');
        };

        // Navigation Timing
        const [navigation] = performance.getEntriesByType('navigation');
        if (navigation) {
            const loadTime = Math.round(navigation.loadEventEnd);
            if (metrics.perfLoad.textContent !== `${loadTime}ms`) {
                metrics.perfLoad.textContent = `${loadTime}ms`;
                triggerAnimation(metrics.perfLoad);
            }
            
            const score = Math.max(0, Math.min(100, 100 - (loadTime / 20)));
            statusFill.style.width = `${score}%`;
        }

        // Memory usage
        if (performance.memory) {
            const used = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
            const total = Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024);
            const val = `${used}MB / ${total}MB`;
            if (metrics.perfMemory.textContent !== val) {
                metrics.perfMemory.textContent = val;
                triggerAnimation(metrics.perfMemory);
            }
        }

        // DOM Complexity
        const nodeCount = document.querySelectorAll('*').length;
        if (metrics.perfDOM.textContent !== `${nodeCount} NODES`) {
            metrics.perfDOM.textContent = `${nodeCount} NODES`;
            triggerAnimation(metrics.perfDOM);
        }

        // Resource Tracking
        const resources = performance.getEntriesByType('resource');
        const resourceCount = resources.length;
        let totalTransfer = 0;
        resources.forEach(res => {
            totalTransfer += (res.transferSize || 0);
        });
        
        if (metrics.perfResources.textContent !== `${resourceCount} ASSETS`) {
            metrics.perfResources.textContent = `${resourceCount} ASSETS`;
            triggerAnimation(metrics.perfResources);
        }
        
        const dataVal = totalTransfer > 0 ? `${(totalTransfer / 1024).toFixed(1)} KB` : 'CACHE/LOCAL';
        if (metrics.perfData.textContent !== dataVal) {
            metrics.perfData.textContent = dataVal;
            triggerAnimation(metrics.perfData);
        }

        // Latency (Estimated)
        const start = performance.now();
        fetch(`${API_BASE_URL}/transmit`, { method: 'HEAD' })
            .then(() => {
                const latency = Math.round(performance.now() - start);
                if (metrics.perfLatency.textContent !== `${latency}ms`) {
                    metrics.perfLatency.textContent = `${latency}ms`;
                    triggerAnimation(metrics.perfLatency);
                }
            })
            .catch(() => {
                metrics.perfLatency.textContent = 'ERROR';
            });
    }

    // Initial check for performance bar on load
    window.addEventListener('load', () => {
        setTimeout(updatePerformanceMetrics, 500);
    });

    // Copy color functionality
    colorItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const hex = item.getAttribute('data-hex');
            navigator.clipboard.writeText(hex).then(() => {
                showToast(`SYSTEM: ${hex} COPIED TO CLIPBOARD`);
            });
        });
    });

    // --- Hover Reveal Logic (SILENCE -> XYLENT) ---
    const parallaxText = document.querySelector('.parallax-text');
    
    if (parallaxText) {
        const originalText = parallaxText.getAttribute('data-original');
        const hoverText = parallaxText.getAttribute('data-hover');

        parallaxText.addEventListener('mouseenter', () => {
            parallaxText.style.opacity = '0';
            setTimeout(() => {
                parallaxText.textContent = hoverText;
                parallaxText.style.opacity = '1';
            }, 150);
        });

        parallaxText.addEventListener('mouseleave', () => {
            parallaxText.style.opacity = '0';
            setTimeout(() => {
                parallaxText.textContent = originalText;
                parallaxText.style.opacity = '1';
            }, 150);
        });
    }

    // --- Theme Switcher Logic ---
    const btnDark = document.getElementById('btnDark');
    const btnLight = document.getElementById('btnLight');
    const root = document.documentElement;

    if (btnDark) {
        btnDark.addEventListener('click', () => {
            if (!root.classList.contains('light-mode')) return;
            root.classList.remove('light-mode');
            localStorage.setItem('theme', 'dark');
        });
    }

    // --- Side Drawer Logic ---
    const hamburger = document.querySelector('.hamburger');
    const sideDrawer = document.getElementById('sideDrawer');

    if (hamburger) {
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = sideDrawer.classList.toggle('open');
            hamburger.classList.toggle('active', isOpen);
        });
    }

    // Close drawer when clicking outside
    document.addEventListener('click', (e) => {
        if (sideDrawer && sideDrawer.classList.contains('open')) {
            if (!sideDrawer.contains(e.target) && !hamburger.contains(e.target)) {
                sideDrawer.classList.remove('open');
                hamburger.classList.remove('active');
            }
        }
    });

    // --- Style Switcher Logic ---
    const styleOptions = document.querySelectorAll('.style-option');
    const body = document.body;
    const paletteList = document.getElementById('paletteList');

    const stylePalettes = {
        swiss: [
            { name: 'ELECTRIC BLUE', hex: '#0000FF', desc: 'CORE BRAND IDENTITY' },
            { name: 'VOID BLACK', hex: '#0A0A0A', desc: 'ATMOSPHERIC DEPTH' },
            { name: 'SYSTEM WHITE', hex: '#FFFFFF', desc: 'PURE INTERFACE' }
        ],
        brutal: [
            { name: 'POWER RED', hex: '#FF0000', desc: 'INDUSTRIAL SIGNAL' },
            { name: 'HEAVY BLACK', hex: '#000000', desc: 'RAW STRUCTURE' },
            { name: 'CONCRETE', hex: '#F0F0F0', desc: 'UNFINISHED SURFACE' }
        ],
        acid: [
            { name: 'TOXIC GREEN', hex: '#00FF00', desc: 'RADIOACTIVE FLOW' },
            { name: 'HOT MAGENTA', hex: '#FF00FF', desc: 'GLITCH SPECTRUM' },
            { name: 'VOID PURPLE', hex: '#0C001A', desc: 'DEEP CHAOS' }
        ],
        saas: [
            { name: 'OCEAN BLUE', hex: '#0984E3', desc: 'MODERN CALM' },
            { name: 'SOFT MINT', hex: '#55E6C1', desc: 'CLEAN FRESHNESS' },
            { name: 'SLATE GREY', hex: '#2D3436', desc: 'PROFESSIONAL FLAT' }
        ]
    };

    function updatePaletteContent(styleName) {
        if (!paletteList) return;
        const colors = stylePalettes[styleName] || stylePalettes.swiss;
        
        paletteList.innerHTML = colors.map(color => `
            <div class="color-item" data-hex="${color.hex}">
                <div class="color-swatch" style="background-color: ${color.hex}"></div>
                <div class="color-info">
                    <span class="color-name">${color.name}</span>
                    <span class="color-hex">${color.hex}</span>
                    <p class="color-desc">${color.desc}</p>
                </div>
                <div class="copy-icon">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                </div>
            </div>
        `).join('');

        attachPaletteListeners();
    }

    function applyStyle(styleName) {
        body.classList.remove('style-swiss', 'style-brutal', 'style-acid', 'style-saas', 'style-default', 'style-brutalism', 'style-antidesign', 'style-flat');
        body.classList.add(`style-${styleName}`);
        
        styleOptions.forEach(opt => {
            opt.classList.toggle('active', opt.getAttribute('data-style') === styleName);
        });

        updatePaletteContent(styleName);
        updateColorBends(styleName);
    }

    // Load saved style
    const savedStyle = localStorage.getItem('design-style') || 'swiss';
    applyStyle(savedStyle);

    styleOptions.forEach(option => {
        option.addEventListener('click', () => {
            const style = option.getAttribute('data-style');
            applyStyle(style);
            localStorage.setItem('design-style', style);
        });
    });

    function attachPaletteListeners() {
        const colorItems = document.querySelectorAll('.color-item');
        colorItems.forEach(item => {
            item.addEventListener('click', () => {
                const hex = item.getAttribute('data-hex');
                navigator.clipboard.writeText(hex).then(() => {
                    showToast(`COPIED: ${hex}`);
                });
            });
        });
    }

    // --- Theme Toggle Logic ---
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const sunIcon = themeToggle.querySelector('.sun-icon');
        const moonIcon = themeToggle.querySelector('.moon-icon');

        const updateThemeIcons = (isLight) => {
            if (isLight) {
                sunIcon.style.display = 'none';
                moonIcon.style.display = 'block';
            } else {
                sunIcon.style.display = 'block';
                moonIcon.style.display = 'none';
            }
        };

        // Initial State
        updateThemeIcons(root.classList.contains('light-mode'));

        themeToggle.addEventListener('click', () => {
            const isLight = root.classList.toggle('light-mode');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            updateThemeIcons(isLight);
            updateColorBends();
        });
    }

    // --- Message Logic (DEPRECATED: Moved to contact.html) ---
    // Removed to prevent conflict with contact.html submission logic

    // --- Hover Swap Logic ---
    const hoverSwapElements = document.querySelectorAll('.hover-swap');
    hoverSwapElements.forEach(el => {
        const originalText = el.innerText;
        const hoverText = el.getAttribute('data-hover');
        
        el.addEventListener('mouseenter', () => {
            el.innerText = hoverText;
        });
        el.addEventListener('mouseleave', () => {
            el.innerText = originalText;
        });
    });

    // --- Page Transition Logic ---
    const overlay = document.getElementById('pageOverlay');
    const envelope = document.getElementById('transitionEnvelope');
    
    // Use 'pageshow' instead of 'load' to handle browser Back button (bfcache)
    window.addEventListener('pageshow', (event) => {
        if (overlay) {
            // Reset envelope state if coming back
            if (envelope) {
                if (window.location.pathname.includes('message')) {
                    envelope.classList.add('open');
                } else {
                    envelope.classList.remove('open');
                }
            }
            
            // Hide overlay smoothly
            overlay.classList.add('hidden');
            overlay.classList.remove('visible');
        }
    });

    const transitionLinks = document.querySelectorAll('.msg-trigger, .back-link');
    transitionLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href !== '#' && !href.startsWith('http')) {
                e.preventDefault();
                if (overlay) {
                    overlay.classList.remove('hidden');
                    overlay.classList.add('visible');

                    // Animation logic
                    if (href.includes('message')) {
                        // GOING TO MESSAGE: Start closed -> Then Open
                        if (envelope) envelope.classList.remove('open');
                        setTimeout(() => {
                            if (envelope) envelope.classList.add('open');
                        }, 300);
                    } else {
                        // RETURNING HOME: Start open -> Then Close
                        if (envelope) envelope.classList.add('open');
                        setTimeout(() => {
                            if (envelope) envelope.classList.remove('open');
                        }, 300);
                    }

                    setTimeout(() => {
                        window.location.href = href;
                    }, 1100); // Slightly longer for envelope animation
                } else {
                    window.location.href = href;
                }
            }
        });
    });

    // --- Dynamic Web Projects ---
    function escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g, tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag]));
    }

    async function loadProjects() {
        const container = document.getElementById('webProjectList');
        if (!container) return;
        
        try {
            const res = await fetch(`${API_BASE_URL}/api/projects`);
            const projects = await res.json();
            
            if (projects.length === 0) {
                container.innerHTML = '<div style="font-size: 0.7rem; font-weight: 900; letter-spacing: 2px; opacity: 0.5; padding: 1rem 0;">NO PROJECTS YET</div>';
                return;
            }
            
            container.innerHTML = projects.map(p => `
                <a href="${escapeHTML(p.url)}" target="_blank" rel="noopener noreferrer" class="style-option" style="text-decoration: none; color: var(--text-primary);">
                    <span class="style-name">${escapeHTML(p.name)}</span>
                    <span class="style-tag">${escapeHTML(p.tag)}</span>
                </a>
            `).join('');
            
        } catch (e) {
            container.innerHTML = '<div style="font-size: 0.7rem; font-weight: 900; letter-spacing: 2px; opacity: 0.5; color: #ff4444; padding: 1rem 0;">ERROR LOADING PROJECTS</div>';
        }
    }

    loadProjects();

    // --- Visitor Tracking (Local Storage based for cross-domain) ---
    if (!localStorage.getItem('xlnt_visited')) {
        fetch(`${API_BASE_URL}/api/visit`, { method: 'POST' })
            .then(() => localStorage.setItem('xlnt_visited', 'true'))
            .catch(err => console.warn('Tracker blocked or failed'));
    }

    // --- Initial ColorBends sync ---
    updateColorBends();
});
