// Warren AI - Main Application

class WarrenAI {
    constructor() {
        this.currentSection = 'dashboard';
        this.init();
    }

    init() {
        this.bindEvents();
        this.handleInitialRoute();
        this.checkAPIStatus();
    }

    bindEvents() {
        // Navigation
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                const sectionId = href.substring(1); // Remove #
                this.navigateToSection(sectionId);
            });
        });

        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            this.handleInitialRoute();
        });

        // Handle hash changes
        window.addEventListener('hashchange', () => {
            this.handleInitialRoute();
        });

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Global error handling
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            showToast('Une erreur inattendue s\'est produite', 'error');
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            showToast('Erreur de connexion', 'error');
        });
    }

    handleInitialRoute() {
        const hash = getCurrentHash();
        this.navigateToSection(hash);
    }

    navigateToSection(sectionId) {
        // Validate section exists
        const section = document.getElementById(sectionId);
        if (!section) {
            sectionId = 'dashboard';
        }

        // Update current section
        this.currentSection = sectionId;

        // Update navigation
        this.updateNavigation(sectionId);

        // Show/hide sections
        this.showSection(sectionId);

        // Update URL
        updateURLHash(sectionId);

        // Section-specific initialization
        this.initializeSection(sectionId);
    }

    updateNavigation(activeSectionId) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            const sectionId = href.substring(1);
            
            if (sectionId === activeSectionId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    showSection(sectionId) {
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            if (section.id === sectionId) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });
    }

    initializeSection(sectionId) {
        switch (sectionId) {
            case 'dashboard':
                // Dashboard is auto-initialized
                break;
            case 'stocks':
                // Stocks module is auto-initialized
                break;
            case 'news':
                // News module is auto-initialized
                break;
            case 'ai-analysis':
                // AI module is auto-initialized
                break;
            case 'marketwatch':
                window.marketWatchModule.fetchAndRender();
                break;
        }
    }

    handleKeyboardShortcuts(e) {
        // Only handle shortcuts when not typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // Alt + number keys for navigation
        if (e.altKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    this.navigateToSection('dashboard');
                    break;
                case '2':
                    e.preventDefault();
                    this.navigateToSection('stocks');
                    break;
                case '3':
                    e.preventDefault();
                    this.navigateToSection('news');
                    break;
                case '4':
                    e.preventDefault();
                    this.navigateToSection('ai-analysis');
                    break;
            }
        }

        // Ctrl + R for refresh
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            this.refreshCurrentSection();
        }

        // Escape to close modals
        if (e.key === 'Escape') {
            this.closeModals();
        }
    }

    refreshCurrentSection() {
        switch (this.currentSection) {
            case 'dashboard':
                if (window.dashboardModule) {
                    window.dashboardModule.refreshData();
                }
                break;
            case 'news':
                if (window.newsModule) {
                    window.newsModule.refreshNews();
                }
                break;
            default:
                showToast('Section actualisée', 'info');
        }
    }

    closeModals() {
        // Close any open modals
        const modals = document.querySelectorAll('.news-modal, .loading-overlay');
        modals.forEach(modal => {
            if (modal.style.display !== 'none') {
                modal.remove();
            }
        });

        // Hide search suggestions
        const suggestions = document.querySelectorAll('.search-suggestions');
        suggestions.forEach(suggestion => suggestion.remove());
    }

    async checkAPIStatus() {
        try {
            // Check if API is available
            const response = await api.getAIStatus();
            
            if (response.success) {
                console.log('API Status:', response.data);
                
                // Show status in console for debugging
                if (response.data.summarizer_test === 'ERROR' || response.data.sentiment_test === 'ERROR') {
                    console.warn('Some AI models may not be working properly');
                }
            }
        } catch (error) {
            console.warn('API status check failed:', error);
            // Don't show error to user as this is just a status check
        }
    }

    // Utility methods
    showGlobalLoading(message = 'Chargement...') {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            const spinner = overlay.querySelector('.loading-spinner p');
            if (spinner) {
                spinner.textContent = message;
            }
            overlay.style.display = 'flex';
        }
    }

    hideGlobalLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // Data export functionality
    async exportData(type = 'all') {
        try {
            showLoading();
            
            const data = {};
            
            if (type === 'all' || type === 'stocks') {
                const stocksResponse = await api.getStocks({ limit: 1000 });
                if (stocksResponse.success) {
                    data.stocks = stocksResponse.data;
                }
            }
            
            if (type === 'all' || type === 'news') {
                const newsResponse = await api.getNews({ limit: 1000 });
                if (newsResponse.success) {
                    data.news = newsResponse.data;
                }
            }
            
            if (type === 'all' || type === 'insights') {
                const insightsResponse = await api.getInsights({ limit: 1000 });
                if (insightsResponse.success) {
                    data.insights = insightsResponse.data;
                }
            }
            
            // Download the data
            const filename = `Atlas-Capital-export-${type}-${new Date().toISOString().split('T')[0]}.json`;
            downloadJSON(data, filename);
            
            showToast('Données exportées avec succès', 'success');
        } catch (error) {
            handleAPIError(error, 'exporting data');
        } finally {
            hideLoading();
        }
    }

    // Performance monitoring
    startPerformanceMonitoring() {
        // Monitor page load time
        window.addEventListener('load', () => {
            const loadTime = performance.now();
            console.log(`Page loaded in ${Math.round(loadTime)}ms`);
            
            if (loadTime > 3000) {
                console.warn('Slow page load detected');
            }
        });

        // Monitor API response times
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const start = performance.now();
            const response = await originalFetch(...args);
            const duration = performance.now() - start;
            
            if (duration > 5000) {
                console.warn(`Slow API request: ${args[0]} took ${Math.round(duration)}ms`);
            }
            
            return response;
        };
    }

    // Theme management (for future use)
    setTheme(theme = 'light') {
        document.documentElement.setAttribute('data-theme', theme);
        saveToLocalStorage('Atlas-Capital-theme', theme);
    }

    getTheme() {
        return loadFromLocalStorage('Atlas-Capital-theme', 'light');
    }

    // User preferences
    saveUserPreferences() {
        const preferences = {
            currentSection: this.currentSection,
            theme: this.getTheme(),
            timestamp: new Date().toISOString()
        };
        
        saveToLocalStorage('Atlas-Capital-preferences', preferences);
    }

    loadUserPreferences() {
        const preferences = loadFromLocalStorage('Atlas-Capital-preferences', {});

        if (preferences.theme) {
            this.setTheme(preferences.theme);
        }
        
        return preferences;
    }

    // Cleanup on page unload
    cleanup() {
        this.saveUserPreferences();
        
        // Cleanup modules
        if (window.dashboardModule) {
            window.dashboardModule.destroy();
        }
        
        if (window.stocksModule) {
            window.stocksModule.destroy();
        }
    }
}

// Initialize application when DOM is loaded
let app = null;

document.addEventListener('DOMContentLoaded', () => {
    app = new WarrenAI();
    
    // Start performance monitoring in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        app.startPerformanceMonitoring();
    }
    
    // Load user preferences
    app.loadUserPreferences();
    
    console.log('Warren AI application initialized');
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (app) {
        app.cleanup();
    }
});

// Export for global access
window.app = app;

// Global utility functions for inline handlers
window.exportData = (type) => {
    if (app) {
        app.exportData(type);
    }
};

// Service Worker registration (for future PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Register service worker when available
        // navigator.serviceWorker.register('/sw.js');
    });
}

window.marketWatchModule = {
    async fetchAndRender() {
        const tableBody = document.querySelector('#marketWatchTable tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '<tr><td colspan="6">Chargement...</td></tr>';
        try {
            const response = await fetch('/api/stocks/marketwatch');
            const result = await response.json();
            if (!result.success || !Array.isArray(result.data)) {
                tableBody.innerHTML = '<tr><td colspan="6">Aucune donnée disponible</td></tr>';
                return;
            }
            tableBody.innerHTML = '';
            result.data.forEach(stock => {
                // Style et logique identiques à la table "Plus Actives"
                const ticker = stock.ticker || '-';
                const nom = stock.nom || '-';
                const prix = window.formatPrice ? formatPrice(stock.prix) : (stock.prix || '-');
                const variation = stock.variation !== undefined ? stock.variation : '-';
                const volume = window.formatNumber ? formatNumber(stock.volume, 0) : (stock.volume || '-');
                const isin = stock.isin || '-';
                // Style de variation et flèche
                let changeClass = '';
                let changeIcon = '';
                if (!isNaN(parseFloat(variation))) {
                    if (variation > 0) {
                        changeClass = 'text-green';
                        changeIcon = '<i class="fas fa-arrow-up"></i>';
                    } else if (variation < 0) {
                        changeClass = 'text-red';
                        changeIcon = '<i class="fas fa-arrow-down"></i>';
                    } else {
                        changeClass = 'text-gray';
                        changeIcon = '<i class="fas fa-minus"></i>';
                    }
                } else {
                    changeClass = 'text-gray';
                    changeIcon = '<i class="fas fa-minus"></i>';
                }
                // Formatage du pourcentage
                let variationAff = window.formatPercentage ? formatPercentage(variation) : variation;
                // Ligne cliquable
                tableBody.innerHTML += `
                    <tr style="cursor:pointer" onclick="window.marketWatchModule.showStockDetails('${ticker}')">
                        <td><strong>${ticker}</strong></td>
                        <td>${nom}</td>
                        <td>${prix}</td>
                        <td class="${changeClass}">${changeIcon} ${variationAff}</td>
                        <td>${volume}</td>
                        <td>${isin}</td>
                    </tr>
                `;
            });
        } catch (e) {
            tableBody.innerHTML = '<tr><td colspan="6">Erreur de chargement</td></tr>';
        }
    },
    showStockDetails(ticker) {
        // Même logique que dashboard.js pour afficher le détail d'une action
        const stocksSection = document.getElementById('stocks');
        const marketWatchSection = document.getElementById('marketwatch');
        const stockSearch = document.getElementById('stockSearch');
        if (stocksSection && marketWatchSection && stockSearch) {
            document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
            document.querySelector('.nav-link[href="#stocks"]').classList.add('active');
            marketWatchSection.classList.remove('active');
            stocksSection.classList.add('active');
            stockSearch.value = ticker;
            if (window.stocksModule) {
                window.stocksModule.searchStock(ticker);
            }
            updateURLHash('stocks');
        }
    }
};

// Initialisation automatique lors de la navigation
const originalInitSection = WarrenAI.prototype.initializeSection;
WarrenAI.prototype.initializeSection = function(sectionId) {
    if (sectionId === 'marketwatch') {
        window.marketWatchModule.fetchAndRender();
    }
    if (originalInitSection) originalInitSection.call(this, sectionId);
};


