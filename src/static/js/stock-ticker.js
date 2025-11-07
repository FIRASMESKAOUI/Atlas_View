/**
 * Module pour le bandeau boursier défilant
 * Utilise l'API /api/stocks/marketwatch
 */

class StockTickerManager {
    constructor() {
        this.tickerData = [];
        this.updateInterval = null;
        this.isInitialized = false;
    }

    init() {
        // Vérifier que l'élément existe
        const tickerContent = document.getElementById('tickerContent');
        if (!tickerContent) {
            setTimeout(() => this.init(), 500);
            return;
        }

        this.isInitialized = true;
        this.loadTickerData();

        // Mise à jour toutes les 30 secondes
        this.updateInterval = setInterval(() => {
            this.loadTickerData();
        }, 30000);
    }

    async loadTickerData() {
        try {
            // ESSAYER D'ABORD /api/stocks/marketwatch qui pourrait avoir plus d'actions
            let response = await fetch('/api/stocks/marketwatch');
            let result = await response.json();

            // Si marketwatch ne fonctionne pas ou a peu d'actions, essayer l'API principale
            if (!result.success || !result.data || result.data.length < 50) {
                response = await fetch('/api/stocks?limit=500');
                result = await response.json();
            }

            if (result.success && Array.isArray(result.data) && result.data.length > 0) {
                // Transformer les données au format attendu par le bandeau
                this.tickerData = result.data.map(stock => ({
                    ticker: stock.ticker || '-',
                    nom: stock.nom || stock.stock_name || '-',
                    prix: stock.prix || stock.last_price || stock.close_price || 0,
                    variation: stock.variation || stock.change || 0,
                    volume: stock.volume || 0,
                    isin: stock.isin || '-'
                }));

                this.renderTicker();
            }
        } catch (error) {
            // Erreur silencieuse
        }
    }

    renderTicker() {
        const tickerContent = document.getElementById('tickerContent');
        if (!tickerContent) {
            return;
        }

        if (this.tickerData.length === 0) {
            tickerContent.innerHTML = '<div class="ticker-item"><span class="ticker-symbol">Aucune donnée disponible</span></div>';
            return;
        }

        // Créer le contenu du ticker
        let tickerHTML = '';

        // Afficher les données 2 fois pour un défilement continu sans coupure
        const allData = [...this.tickerData, ...this.tickerData];

        allData.forEach(stock => {
            const ticker = stock.ticker || '-';
            const prix = stock.prix ? this.formatPrice(stock.prix) : '-';
            const variation = stock.variation !== undefined ? stock.variation : null;

            // Déterminer la classe et l'icône en fonction de la variation
            let changeClass = 'neutral';
            let changeIcon = '';
            let variationText = '';

            if (variation !== null && !isNaN(parseFloat(variation))) {
                if (variation > 0) {
                    changeClass = 'positive';
                    changeIcon = '<i class="fas fa-arrow-up"></i>';
                    variationText = `+${this.formatPercentage(variation)}`;
                } else if (variation < 0) {
                    changeClass = 'negative';
                    changeIcon = '<i class="fas fa-arrow-down"></i>';
                    variationText = this.formatPercentage(variation);
                } else {
                    // Variation = 0, pas de flèche
                    changeClass = 'neutral';
                    changeIcon = '';
                    variationText = this.formatPercentage(variation);
                }
            }

            tickerHTML += `
                <div class="ticker-item" onclick="stockTickerManager.onTickerClick('${ticker}')">
                    <span class="ticker-symbol">${ticker}</span>
                    <span class="ticker-price">${prix} DT</span>
                    <span class="ticker-change ${changeClass}">
                        ${changeIcon}
                        ${variationText}
                    </span>
                </div>
            `;
        });

        tickerContent.innerHTML = tickerHTML;

        // Animation de 120 secondes (2 minutes)
        tickerContent.style.animationDuration = '120s';
    }

    onTickerClick(ticker) {
        // Rediriger vers la section stocks avec le ticker sélectionné
        const stocksSection = document.getElementById('stocks');
        const stockSearch = document.getElementById('stockSearch');

        if (stocksSection && stockSearch) {
            // Activer la section stocks
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });
            stocksSection.classList.add('active');

            // Activer le lien de navigation
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            const stocksLink = document.querySelector('.nav-link[href="#stocks"]');
            if (stocksLink) {
                stocksLink.classList.add('active');
            }

            // Rechercher l'action
            stockSearch.value = ticker;
            if (window.stocksModule && typeof window.stocksModule.searchStock === 'function') {
                window.stocksModule.searchStock(ticker);
            } else {
                // Fallback: déclencher le bouton de recherche
                const searchBtn = document.getElementById('searchBtn');
                if (searchBtn) {
                    searchBtn.click();
                }
            }

            // Mettre à jour l'URL
            if (typeof window.updateURLHash === 'function') {
                window.updateURLHash('stocks');
            } else {
                window.location.hash = '#stocks';
            }
        } else {
            console.error('Bandeau boursier: Sections stocks non trouvées');
        }
    }

    formatPrice(price) {
        if (typeof price === 'number') {
            return price.toFixed(2);
        }
        return price;
    }

    formatPercentage(value) {
        if (typeof value === 'number') {
            return `${value.toFixed(2)}%`;
        }
        return value;
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialiser le ticker au chargement de la page
let stockTickerManager;

// Attendre que le DOM soit complètement chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        stockTickerManager = new StockTickerManager();
        stockTickerManager.init();
    });
} else {
    // DOM déjà chargé
    stockTickerManager = new StockTickerManager();
    stockTickerManager.init();
}
