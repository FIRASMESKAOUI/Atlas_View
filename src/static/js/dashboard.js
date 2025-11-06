// Warren AI - Dashboard Module

class Dashboard {
    constructor() {
        this.refreshInterval = null;
        this.autoRefreshEnabled = true;
        this.refreshIntervalMs = 60000; // 1 minute

        this.init();
    }

    async init() {
        await this.loadIndicesTemplate();
        this.bindEvents();
        await this.loadDashboard();
        this.startAutoRefresh();
    }

    async loadIndicesTemplate() {
        try {
            const response = await fetch('/static/templates/indices.html');
            const html = await response.text();
            document.getElementById('indices-container').innerHTML = html;
        } catch (error) {
            console.error('Error loading indices template:', error);
        }
    }

    bindEvents() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData());
        }
    }

    async loadDashboard() {
        try {
            showLoading();

            // Load market summary, tables and indices in parallel
            await Promise.all([
                this.loadMarketSummary(),
                this.loadMarketTables(),
                updateMarketIndices()
            ]);
            
            // Initialiser les graphiques des indices après le chargement des données
            if (typeof initIndexCharts === 'function') {
                initIndexCharts();
            } else {
                console.warn('La fonction initIndexCharts n\'est pas disponible');
            }

            // Notification supprimée à la demande de l'utilisateur
            // showToast('Données du tableau de bord chargées', 'success');
        } catch (error) {
            handleAPIError(error, 'loading dashboard');
        } finally {
            hideLoading();
        }
    }

    async loadMarketSummary() {
        try {
            const response = await api.getMarketSummary();

            if (response.success && response.data) {
                this.updateSummaryCards(response.data.statistics);
            }
        } catch (error) {
            console.error('Error loading market summary:', error);
            // Set default values
            this.updateSummaryCards({
                gainers: 0,
                losers: 0,
                unchanged: 0,
                total_stocks: 0
            });
        }
    }

    updateSummaryCards(stats) {
        const elements = {
            gainersCount: document.getElementById('gainersCount'),
            losersCount: document.getElementById('losersCount'),
            unchangedCount: document.getElementById('unchangedCount'),
            totalStocks: document.getElementById('totalStocks')
        };

        // Animate the numbers
        if (elements.gainersCount) {
            animateValue(elements.gainersCount, 0, stats.gainers || 0);
        }
        if (elements.losersCount) {
            animateValue(elements.losersCount, 0, stats.losers || 0);
        }
        if (elements.unchangedCount) {
            animateValue(elements.unchangedCount, 0, stats.unchanged || 0);
        }
        if (elements.totalStocks) {
            // Afficher le ratio qtys/groups pour les valeurs actives avec des espaces
            const qtys = stats.active_stocks_qtys || 0;
            const groups = stats.active_stocks_groups || 0;
            elements.totalStocks.textContent = `${qtys} / ${groups}`;
        }
    }

    async loadMarketTables() {
        try {
            // Load market data in parallel
            const [summaryResponse, risesResponse, fallsResponse] = await Promise.all([
                api.getMarketSummary(),
                api.getMarketRises(),
                api.getMarketFalls()
            ]);

            // Update tables
            if (summaryResponse.success && summaryResponse.data) {
                this.updateGainersTable(summaryResponse.data.top_gainers || []);
                this.updateLosersTable(summaryResponse.data.top_losers || []);
                this.updateActiveTable(summaryResponse.data.most_active || []);
            }

            // If we have direct rises/falls data, use that instead
            if (risesResponse.success && risesResponse.data) {
                this.updateGainersTable(risesResponse.data.slice(0, 5));
            }

            if (fallsResponse.success && fallsResponse.data) {
                this.updateLosersTable(fallsResponse.data.slice(0, 5));
            }

        } catch (error) {
            console.error('Error loading market tables:', error);
            this.updateGainersTable([]);
            this.updateLosersTable([]);
            this.updateActiveTable([]);
        }
    }

    updateGainersTable(gainers) {
        const tbody = document.querySelector('#gainersTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (gainers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--gray-500);">Aucune donnée disponible</td></tr>';
            return;
        }

        gainers.forEach(stock => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${stock.ticker || '-'}</strong></td>
                <td>${truncateText(stock.stock_name || '-', 20)}</td>
                <td>${formatPrice(stock.last_price)}</td>
                <td class="${getChangeClass(stock.change)}">
                    ${getChangeIcon(stock.change)} ${formatPercentage(stock.change)}
                </td>
                <td>${formatNumber(stock.volume, 0)}</td>
            `;

            row.style.cursor = 'pointer';
            row.addEventListener('click', () => {
                if (stock.ticker) {
                    this.showStockDetails(stock.ticker);
                }
            });

            tbody.appendChild(row);
        });
    }

    updateLosersTable(losers) {
        const tbody = document.querySelector('#losersTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (losers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--gray-500);">Aucune donnée disponible</td></tr>';
            return;
        }

        losers.forEach(stock => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${stock.ticker || '-'}</strong></td>
                <td>${truncateText(stock.stock_name || '-', 20)}</td>
                <td>${formatPrice(stock.last_price)}</td>
                <td class="${getChangeClass(stock.change)}">
                    ${getChangeIcon(stock.change)} ${formatPercentage(stock.change)}
                </td>
                <td>${formatNumber(stock.volume, 0)}</td>
            `;

            row.style.cursor = 'pointer';
            row.addEventListener('click', () => {
                if (stock.ticker) {
                    this.showStockDetails(stock.ticker);
                }
            });

            tbody.appendChild(row);
        });
    }

    updateActiveTable(active) {
        const tbody = document.querySelector('#activeTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (active.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--gray-500);">Aucune donnée disponible</td></tr>';
            return;
        }

        active.forEach(stock => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${stock.ticker || '-'}</strong></td>
                <td>${truncateText(stock.stock_name || '-', 25)}</td>
                <td>${formatPrice(stock.last_price)}</td>
                <td class="${getChangeClass(stock.change)}">
                    ${getChangeIcon(stock.change)} ${formatPercentage(stock.change)}
                </td>
                <td>${formatNumber(stock.volume, 0)}</td>
                <td>${formatNumber(stock.market_cap)}</td>
            `;

            row.style.cursor = 'pointer';
            row.addEventListener('click', () => {
                if (stock.ticker) {
                    this.showStockDetails(stock.ticker);
                }
            });

            tbody.appendChild(row);
        });
    }

    showStockDetails(ticker) {
        // Switch to stocks section and search for the ticker
        const stocksSection = document.getElementById('stocks');
        const dashboardSection = document.getElementById('dashboard');
        const stockSearch = document.getElementById('stockSearch');
        
        if (stocksSection && dashboardSection && stockSearch) {
            // Update navigation
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            document.querySelector('.nav-link[href="#stocks"]').classList.add('active');
            
            // Switch sections
            dashboardSection.classList.remove('active');
            stocksSection.classList.add('active');
            
            // Set search value and trigger search
            stockSearch.value = ticker;
            
            // Trigger the search
            if (window.stocksModule) {
                window.stocksModule.searchStock(ticker);
            }
            
            // Update URL
            updateURLHash('stocks');
        }
    }

    async refreshData() {
        const refreshBtn = document.getElementById('refreshBtn');

        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualisation...';
        }

        try {
            // Update stocks data first
            await api.updateStocksData();

            // Then reload dashboard
            await this.loadDashboard();
        } catch (error) {
            handleAPIError(error, 'refreshing data');
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Actualiser';
            }
        }
    }

    startAutoRefresh() {
        if (this.autoRefreshEnabled) {
            this.refreshInterval = setInterval(() => {
                this.refreshData();
                updateMarketIndices();
            }, this.refreshIntervalMs);
        }
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});