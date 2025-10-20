// Warren AI - Stocks Module

class Stocks {
    constructor() {
        this.currentStock = null;
        this.stockChart = null;
        this.orderBookInterval = null;
        this.init();
    }

    async init() {
        await this.populateDropdown();
        this.bindEvents();
        this.setupFullscreenChart();
        this.setupDownloadChart();
    }

    setupFullscreenChart() {
        const btn = document.getElementById('fullscreenChartBtn');
        const container = document.querySelector('.stock-history-chart-container');
        const chartCanvas = document.getElementById('stockHistoryChart');
        if (!btn || !container || !chartCanvas) return;

        btn.addEventListener('click', () => {
            if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
                if (container.requestFullscreen) {
                    container.requestFullscreen();
                } else if (container.webkitRequestFullscreen) {
                    container.webkitRequestFullscreen();
                } else if (container.msRequestFullscreen) {
                    container.msRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
            }
        });

        // Redimensionner le graphique lors du passage en plein écran ou sortie
        const resizeChart = () => {
            adjustCanvasSize();
            if (this.stockChart) {
                this.stockChart.resize();
            }
        };
        document.addEventListener('fullscreenchange', resizeChart);
        document.addEventListener('webkitfullscreenchange', resizeChart);
        document.addEventListener('msfullscreenchange', resizeChart);
    }

    setupDownloadChart() {
        const btn = document.getElementById('downloadChartBtn');
        const chartCanvas = document.getElementById('stockHistoryChart');
        if (!btn || !chartCanvas) return;
        btn.addEventListener('click', () => {
            let stockName = 'action';
            if (this.currentStock) {
                stockName = this.currentStock.stock_name || this.currentStock.ticker || 'action';
                // Nettoyer le nom pour éviter les caractères spéciaux dans le nom de fichier
                stockName = stockName.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_');
            }
            const link = document.createElement('a');
            link.href = chartCanvas.toDataURL('image/png');
            link.download = `graphique_${stockName}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    async populateDropdown() {
        const dropdown = document.getElementById('stockDropdown');
        if (!dropdown) return;
        let allStocks = [];
        let page = 1;
        let totalPages = 1;
        try {
            do {
                const response = await api.getStocks({page, limit: 100});
                if (response.success && response.data) {
                    allStocks = allStocks.concat(response.data);
                    if (response.pagination && response.pagination.pages) {
                        totalPages = response.pagination.pages;
                    } else {
                        break;
                    }
                } else {
                    break;
                }
                page++;
            } while (page <= totalPages);
            // Trier les actions par ordre alphabétique (ticker puis nom)
            allStocks.sort((a, b) => {
                const aKey = (a.ticker + ' ' + (a.stock_name || '')).toUpperCase();
                const bKey = (b.ticker + ' ' + (b.stock_name || '')).toUpperCase();
                return aKey.localeCompare(bKey, 'fr');
            });
            allStocks.forEach(stock => {
                const option = document.createElement('option');
                option.value = stock.ticker;
                option.textContent = `${stock.ticker} - ${stock.stock_name}`;
                dropdown.appendChild(option);
            });
        } catch (e) {
            // Optionnel : afficher une erreur ou laisser la liste vide
        }
    }

    bindEvents() {
        // Search functionality
        const searchBtn = document.getElementById('searchBtn');
        const stockSearch = document.getElementById('stockSearch');
        const stockDropdown = document.getElementById('stockDropdown');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }

        if (stockSearch) {
            stockSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch();
                }
            });

            // Auto-search with debounce
            stockSearch.addEventListener('input', debounce(() => {
                const query = stockSearch.value.trim();
                if (query.length >= 2) {
                    this.showSearchSuggestions(query);
                }
            }, 300));
        }

        if (stockDropdown) {
            stockDropdown.addEventListener('change', () => {
                if (stockDropdown.value) {
                    this.handleSearch(true);
                }
            });
        }

        // Stock action buttons
        const analyzeBtn = document.getElementById('analyzeBtn');
        const compareBtn = document.getElementById('compareBtn');

        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyzeCurrentStock());
        }

        if (compareBtn) {
            compareBtn.addEventListener('click', () => this.showCompareDialog());
        }
    }

    async handleSearch(fromDropdown = false) {
        const stockSearch = document.getElementById('stockSearch');
        const stockDropdown = document.getElementById('stockDropdown');
        let query = '';
        if (fromDropdown && stockDropdown && stockDropdown.value) {
            query = stockDropdown.value;
            if (stockSearch) stockSearch.value = query; // synchronise l'input
        } else if (stockSearch) {
            query = stockSearch.value.trim();
        }
        if (!query) {
            showToast("Veuillez entrer ou sélectionner un ticker ou nom d'action", 'warning');
            return;
        }
        await this.searchStock(query);
    }

    async searchStock(query) {
        try {
            showLoading();

            // First try to get the stock directly by ticker
            let stockData = null;

            try {
                const response = await api.getStock(query.toUpperCase(), {
                    include_history: true,
                    include_intraday: false
                });

                if (response.success && response.data) {
                    stockData = response.data;
                }
            } catch (error) {
                // If direct fetch fails, try search
                console.log('Direct fetch failed, trying search...');
            }

            // If direct fetch failed, try search
            if (!stockData) {
                const searchResponse = await api.searchStocks(query, 1);

                if (searchResponse.success && searchResponse.data && searchResponse.data.length > 0) {
                    const firstResult = searchResponse.data[0];

                    // Get full details for the first result
                    const detailResponse = await api.getStock(firstResult.ticker, {
                        include_history: true,
                        include_intraday: false
                    });

                    if (detailResponse.success && detailResponse.data) {
                        stockData = detailResponse.data;
                    }
                }
            }

            if (stockData) {
                this.displayStockDetails(stockData);
                // Notification supprimée à la demande de l'utilisateur
                // showToast(`Action ${stockData.ticker} trouvée`, 'success');
            } else {
                this.hideStockDetails();
                showToast(`Aucune action trouvée pour "${query}"`, 'warning');
            }

        } catch (error) {
            handleAPIError(error, 'searching stock');
            this.hideStockDetails();
        } finally {
            hideLoading();
        }
    }

    async fetchAndDisplayOrderBook(isin) {
        const orderBookDiv = document.getElementById('orderBookTable');
        if (!orderBookDiv) return;
        orderBookDiv.innerHTML = '<div class="loading">Chargement du carnet d\'ordre...</div>';
        try {
            const response = await fetch(`/api/stocks/orderbook/${isin}`);
            const result = await response.json();
            if (result.success && result.data && result.data.limits) {
                const limits = result.data.limits;
                let html = `<table class="order-book-table"><thead><tr><th>ORD</th><th>Qte</th><th>Achat</th><th>Vente</th><th>Qte</th><th>Heure</th></tr></thead><tbody>`;
                for (const row of limits) {
                    html += `<tr><td>${row.askOrd}</td><td>${row.askQty}</td><td>${row.ask}</td><td>${row.bid}</td><td>${row.bidQty}</td><td>${row.time}</td></tr>`;
                }
                html += '</tbody></table>';
                orderBookDiv.innerHTML = html;

                // Préparer les données pour le Depth Chart (correction inversion)
                const bids = limits.filter(r => r.ask && r.askQty).map(r => ({ price: parseFloat(r.ask), volume: parseInt(r.askQty) }));
                const asks = limits.filter(r => r.bid && r.bidQty).map(r => ({ price: parseFloat(r.bid), volume: parseInt(r.bidQty) }));
                renderOrderBookDepthChart({ bids, asks });
                updateMidmarketPrice(bids, asks);
            } else {
                orderBookDiv.innerHTML = '<div class="error">Aucun carnet d\'ordre disponible.</div>';
                renderOrderBookDepthChart({ bids: [], asks: [] });
            }
        } catch (e) {
            orderBookDiv.innerHTML = `<div class="error">Erreur lors du chargement du carnet d\'ordre.</div>`;
            renderOrderBookDepthChart({ bids: [], asks: [] });
            updateMidmarketPrice([], []);
        }
    }

    startOrderBookRefresh(isin) {
        // Clear existing interval if any
        this.stopOrderBookRefresh();

        // Fetch initial order book state
        this.fetchOrderBookState(isin);

        // Set interval to refresh order book
        this.orderBookInterval = setInterval(() => {
            this.fetchOrderBookState(isin);
        }, 5000); // Refresh every 5 seconds
    }

    stopOrderBookRefresh() {
        if (this.orderBookInterval) {
            clearInterval(this.orderBookInterval);
            this.orderBookInterval = null;
        }
    }

    async fetchOrderBookState(isin) {
        try {
            const response = await fetch(`/api/stocks/orderbook/${isin}`);
            const result = await response.json();

            if (result.success && result.data && result.data.limits) {
                const newLimits = result.data.limits;

                // Compare with old state and detect changes
                const hasChanges = this.detectOrderBookChanges(newLimits);

                if (hasChanges) {
                    // Update order book display
                    this.updateOrderBookDisplay(newLimits);
                    // Flash effect on changed cells
                    this.flashOrderBookCells();

                    // Mettre à jour le Depth Chart
                    const bids = newLimits.filter(r => r.bid && r.bidQty).map(r => ({ price: parseFloat(r.bid), volume: parseInt(r.bidQty) }));
                    const asks = newLimits.filter(r => r.ask && r.askQty).map(r => ({ price: parseFloat(r.ask), volume: parseInt(r.askQty) }));
                    renderOrderBookDepthChart({ bids, asks });
                    updateMidmarketPrice(bids, asks);
                }
            }
        } catch (e) {
            console.error('Error fetching order book state:', e);
            renderOrderBookDepthChart({ bids: [], asks: [] });
            updateMidmarketPrice([], []);
        }
    }

    detectOrderBookChanges(newLimits) {
        const orderBookDiv = document.getElementById('orderBookTable');
        if (!orderBookDiv) return false;

        const rows = orderBookDiv.querySelectorAll('tbody tr');
        if (rows.length !== newLimits.length) return true; // Structure change

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const newRow = newLimits[i];

            // Check if any cell value has changed
            if (
                row.cells[0].textContent !== newRow.askOrd ||
                row.cells[1].textContent !== newRow.askQty ||
                row.cells[2].textContent !== newRow.ask ||
                row.cells[3].textContent !== newRow.bid ||
                row.cells[4].textContent !== newRow.bidQty ||
                row.cells[5].textContent !== newRow.time
            ) {
                return true;
            }
        }

        return false;
    }

    updateOrderBookDisplay(newLimits) {
        const orderBookDiv = document.getElementById('orderBookTable');
        if (!orderBookDiv) return;

        // Update rows
        const rows = orderBookDiv.querySelectorAll('tbody tr');
        rows.forEach((row, index) => {
            const newRow = newLimits[index];

            if (newRow) {
                row.cells[0].textContent = newRow.askOrd;
                row.cells[1].textContent = newRow.askQty;
                row.cells[2].textContent = newRow.ask;
                row.cells[3].textContent = newRow.bid;
                row.cells[4].textContent = newRow.bidQty;
                row.cells[5].textContent = newRow.time;
            }
        });
    }

    flashOrderBookCells() {
        const orderBookDiv = document.getElementById('orderBookTable');
        if (!orderBookDiv) return;

        // Flash effect on updated cells
        const updatedCells = orderBookDiv.querySelectorAll('tbody tr.updated');
        updatedCells.forEach(cell => {
            cell.classList.add('flash-cell');

            // Remove flash effect after animation
            setTimeout(() => {
                cell.classList.remove('flash-cell');
            }, 700);
        });
    }

    displayStockDetails(stockData) {
        this.currentStock = stockData;

        // Update stock header
        this.updateStockHeader(stockData);

        // Update stock metrics
        this.updateStockMetrics(stockData);

        // Show the details card
        const stockDetails = document.getElementById('stockDetails');
        if (stockDetails) {
            stockDetails.style.display = 'block';
            stockDetails.scrollIntoView({ behavior: 'smooth' });
        }
        // Affichage carnet d'ordre
        if (stockData.isin) {
            this.fetchAndDisplayOrderBook(stockData.isin);
            this.fetchAndDisplayStockHistory(stockData.isin); // Ajout affichage historique
        }
    }

    async fetchAndDisplayStockHistory(isin) {
        const chartContainer = document.getElementById('stockHistoryChart');
        if (!chartContainer) return;
        if (this.stockChart) {
            this.stockChart.destroy();
            this.stockChart = null;
        }
        // Création du wrapper flex global si besoin
        let actionsBar = document.getElementById('chartActionsBar');
        if (!actionsBar) {
            actionsBar = document.createElement('div');
            actionsBar.id = 'chartActionsBar';
            actionsBar.style.position = 'absolute';
            actionsBar.style.top = '0px'; // plus haut
            actionsBar.style.left = '0';
            actionsBar.style.right = '0';
            actionsBar.style.width = '100%';
            actionsBar.style.display = 'flex';
            actionsBar.style.flexDirection = 'row';
            actionsBar.style.justifyContent = 'space-between';
            actionsBar.style.alignItems = 'center';
            actionsBar.style.zIndex = '10';
            actionsBar.style.pointerEvents = 'none'; // pour ne pas gêner le graphique
            chartContainer.parentElement.appendChild(actionsBar);
        }
        // Conteneur gauche pour les modes
        let leftBar = document.getElementById('chartModesBar');
        if (!leftBar) {
            leftBar = document.createElement('div');
            leftBar.id = 'chartModesBar';
            leftBar.style.display = 'flex';
            leftBar.style.gap = '8px';
            leftBar.style.background = 'rgba(255,255,255,0.8)';
            leftBar.style.borderRadius = '6px';
            leftBar.style.padding = '2px 8px';
            leftBar.style.marginLeft = '8px';
            leftBar.style.pointerEvents = 'auto';
            actionsBar.appendChild(leftBar);
        }
        // Conteneur droit pour les actions
        let rightBar = document.getElementById('chartActionsRightBar');
        if (!rightBar) {
            rightBar = document.createElement('div');
            rightBar.id = 'chartActionsRightBar';
            rightBar.style.display = 'flex';
            rightBar.style.gap = '8px';
            rightBar.style.background = 'rgba(255,255,255,0.8)';
            rightBar.style.borderRadius = '6px';
            rightBar.style.padding = '2px 8px';
            rightBar.style.marginRight = '8px';
            rightBar.style.pointerEvents = 'auto';
            actionsBar.appendChild(rightBar);
        }
        // Création du bouton d'icônes si besoin (dans leftBar)
        let modeBtn = document.getElementById('toggleChartModeBtn');
        if (!modeBtn) {
            modeBtn = document.createElement('div');
            modeBtn.id = 'toggleChartModeBtn';
            modeBtn.style.display = 'flex';
            modeBtn.style.gap = '8px';
            modeBtn.style.background = 'none';
            modeBtn.style.border = 'none';
            modeBtn.style.borderRadius = '4px';
            modeBtn.style.padding = '0';
            modeBtn.style.cursor = 'pointer';
            modeBtn.style.alignItems = 'center';
            // Icône zone (aire)
            const areaIcon = document.createElement('span');
            areaIcon.id = 'areaIcon';
            areaIcon.innerHTML = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="14" width="18" height="6" rx="2" fill="#bbb"/><path d="M3 16L8 10L13 13L19 6" stroke="#888" stroke-width="2" fill="none"/><polygon points="3,16 8,10 13,13 19,6 19,20 3,20" fill="#bbb" fill-opacity="0.5"/></svg>`;
            areaIcon.title = 'Mode zone';
            areaIcon.style.display = 'flex';
            areaIcon.style.alignItems = 'center';
            areaIcon.style.justifyContent = 'center';
            areaIcon.style.borderRadius = '3px';
            areaIcon.style.padding = '2px';
            // Icône bougie (deux bougies)
            const candleIcon = document.createElement('span');
            candleIcon.id = 'candleIcon';
            candleIcon.innerHTML = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="8" width="4" height="8" rx="1.5" fill="#fff" stroke="#bbb" stroke-width="1.5"/><rect x="13" y="6" width="4" height="10" rx="1.5" fill="#bbb" stroke="#888" stroke-width="1.5"/><rect x="7" y="5" width="1" height="3" rx="0.5" fill="#bbb"/><rect x="15" y="3" width="1" height="3" rx="0.5" fill="#888"/></svg>`;
            candleIcon.title = 'Mode bougie';
            candleIcon.style.display = 'flex';
            candleIcon.style.alignItems = 'center';
            candleIcon.style.justifyContent = 'center';
            candleIcon.style.borderRadius = '3px';
            candleIcon.style.padding = '2px';
            // Ajout au bouton
            modeBtn.appendChild(areaIcon);
            modeBtn.appendChild(candleIcon);
            leftBar.appendChild(modeBtn);
        }
        // Déplacer/ajouter les boutons existants dans la barre d'actions droite
        const fullscreenBtn = document.getElementById('fullscreenChartBtn');
        if (fullscreenBtn && fullscreenBtn.parentElement !== rightBar) {
            fullscreenBtn.style.position = 'static';
            fullscreenBtn.style.background = 'none';
            fullscreenBtn.style.border = 'none';
            fullscreenBtn.style.borderRadius = '4px';
            fullscreenBtn.style.padding = '6px';
            fullscreenBtn.style.cursor = 'pointer';
            fullscreenBtn.style.display = 'flex';
            fullscreenBtn.style.alignItems = 'center';
            rightBar.appendChild(fullscreenBtn);
        }
        const downloadBtn = document.getElementById('downloadChartBtn');
        if (downloadBtn && downloadBtn.parentElement !== rightBar) {
            downloadBtn.style.position = 'static';
            downloadBtn.style.background = 'none';
            downloadBtn.style.border = 'none';
            downloadBtn.style.borderRadius = '4px';
            downloadBtn.style.padding = '6px';
            downloadBtn.style.cursor = 'pointer';
            downloadBtn.style.display = 'flex';
            downloadBtn.style.alignItems = 'center';
            rightBar.appendChild(downloadBtn);
        }
        // Gestion du mode actif
        if (this.chartMode === undefined) this.chartMode = 'area';
        const areaIcon = document.getElementById('areaIcon');
        const candleIcon = document.getElementById('candleIcon');
        if (this.chartMode === 'area') {
            areaIcon.style.background = '#e5e7eb';
            areaIcon.style.boxShadow = '0 0 0 1.5px #888';
            candleIcon.style.background = 'none';
            candleIcon.style.boxShadow = 'none';
        } else {
            candleIcon.style.background = '#e5e7eb';
            candleIcon.style.boxShadow = '0 0 0 1.5px #888';
            areaIcon.style.background = 'none';
            areaIcon.style.boxShadow = 'none';
        }
        // Gestion des clics
        areaIcon.onclick = (e) => {
            e.stopPropagation();
            if (this.chartMode !== 'area') {
                this.chartMode = 'area';
                this.fetchAndDisplayStockHistory(isin);
            }
        };
        candleIcon.onclick = (e) => {
            e.stopPropagation();
            if (this.chartMode !== 'candle') {
                this.chartMode = 'candle';
                this.fetchAndDisplayStockHistory(isin);
            }
        };
        try {
            const response = await fetch(`/api/stocks/intraday/${isin}`);
            const result = await response.json();
            const intradays = result.intradays || [];
            if (intradays.length > 0) {
                intradays.sort((a, b) => (a.time > b.time ? 1 : -1));
                const labels = intradays.map(item => item.time);
                const prices = intradays.map(item => item.last);
                const stockName = this.currentStock ? (this.currentStock.stock_name || this.currentStock.ticker || isin) : isin;
                if (this.chartMode === 'candle') {
                    // Mode bougie style graphiques.js
                    const candles = [];
                    let minPrice = Infinity, maxPrice = -Infinity;
                    for (let i = 1; i < prices.length; i++) {
                        const open = prices[i-1];
                        const close = prices[i];
                        minPrice = Math.min(minPrice, open, close);
                        maxPrice = Math.max(maxPrice, open, close);
                        candles.push({
                            x: labels[i],
                            y: [open, close],
                            backgroundColor: close > open ? '#38a169' : '#e53e3e',
                            borderColor: close > open ? '#38a169' : '#e53e3e',
                        });
                    }
                    // Ajouter une marge de 2% autour du min/max
                    const range = maxPrice - minPrice;
                    const yMin = minPrice - range * 0.02;
                    const yMax = maxPrice + range * 0.02;
                    this.stockChart = new Chart(chartContainer, {
                        type: 'bar',
                        data: {
                            labels: labels.slice(1),
                            datasets: [{
                                label: stockName,
                                data: candles.map(c => ({x: c.x, y: c.y})),
                                backgroundColor: candles.map(c => c.backgroundColor),
                                borderColor: candles.map(c => c.borderColor),
                                borderWidth: 2,
                                barPercentage: 1.0,
                                categoryPercentage: 1.0
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                title: {
                                    display: true,
                                    text: `Intraday ${stockName}`,
                                    font: { size: 16, weight: 'bold' },

                                },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            const idx = context.dataIndex + 1;
                                            const open = prices[idx-1];
                                            const close = prices[idx];
                                            return `Open: ${open} → Close: ${close}`;
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: { display: true, title: { display: true, text: 'Heure' } },
                                y: {
                                    display: true,
                                    title: { display: true, text: 'Prix' },
                                    min: yMin,
                                    max: yMax
                                }
                            }
                        }
                    });
                } else {
                    // Mode zone (aire)
                    this.stockChart = new Chart(chartContainer, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: stockName,
                                data: prices,
                                borderColor: '#3182ce',
                                backgroundColor: '#3182ce30',
                                borderWidth: 2,
                                pointRadius: 0,
                                pointHoverRadius: 5,
                                fill: true,
                                tension: 0.2
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                x: {
                                    type: 'category',
                                    title: { display: false },
                                    grid: { display: false }
                                },
                                y: {
                                    beginAtZero: false,
                                    title: { display: true, text: 'Prix' }
                                }
                            },
                            plugins: {
                                title: {
                                    display: true,
                                    text: `Intraday ${stockName}`,
                                    font: { size: 16, weight: 'bold' }
                                },
                                tooltip: {
                                    mode: 'index',
                                    intersect: false,
                                    callbacks: {
                                        title: function(tooltipItems) {
                                            return tooltipItems[0].label;
                                        },
                                        label: function(context) {
                                            return `${context.dataset.label}: ${context.parsed.y}`;
                                        }
                                    },
                                },
                                legend: { display: false }
                            },
                            interaction: { mode: 'index', intersect: false },
                            elements: { line: { borderWidth: 2 } }
                        }
                    });
                }
            } else {
                const ctx = chartContainer.getContext('2d');
                ctx.clearRect(0, 0, chartContainer.width, chartContainer.height);
                ctx.font = '16px Arial';
                ctx.fillStyle = '#888';
                ctx.textAlign = 'center';
                ctx.fillText('Aucune donnée intraday disponible pour cette action aujourd\'hui', chartContainer.width/2, chartContainer.height/2);
            }
        } catch (e) {
            const ctx = chartContainer.getContext('2d');
            ctx.clearRect(0, 0, chartContainer.width, chartContainer.height);
            ctx.font = '16px Arial';
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.fillText('Erreur lors du chargement des données', chartContainer.width/2, chartContainer.height/2);
        }
    }

    renderStockChart(intradays, chartType) {
        const chartContainer = document.getElementById('stockHistoryChart');
        if (this.stockChart) {
            this.stockChart.destroy();
            this.stockChart = null;
        }
        if (!intradays || intradays.length === 0) {
            const ctx = chartContainer.getContext('2d');
            ctx.clearRect(0, 0, chartContainer.width, chartContainer.height);
            ctx.font = '16px Arial';
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.fillText('Aucune donnée intraday disponible pour cette action aujourd\'hui', chartContainer.width/2, chartContainer.height/2);
            return;
        }
        // Trier par heure croissante
        intradays.sort((a, b) => (a.time > b.time ? 1 : -1));
        // Mode ligne classique
        const labels = intradays.map(item => item.time);
        const prices = intradays.map(item => item.last);
        this.stockChart = new Chart(chartContainer, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Prix intraday',
                    data: prices,
                    borderColor: '#0e7490',
                    backgroundColor: 'rgba(14,116,144,0.08)',
                    fill: true,
                    tension: 0.2,
                    pointRadius: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: { display: false }
                },
                scales: {
                    x: { display: true, title: { display: true, text: 'Heure' } },
                    y: { display: true, title: { display: true, text: 'Prix' } }
                }
            }
        });
    }

    updateStockHeader(stockData) {
        const elements = {
            stockName: document.getElementById('stockName'),
            stockTicker: document.getElementById('stockTicker'),
            stockPrice: document.getElementById('stockPrice'),
            stockChange: document.getElementById('stockChange')
        };

        if (elements.stockName) {
            elements.stockName.textContent = stockData.stock_name || stockData.ticker || '-';
        }

        if (elements.stockTicker) {
            elements.stockTicker.textContent = stockData.ticker || '-';
        }

        if (elements.stockPrice) {
            elements.stockPrice.textContent = formatPrice(stockData.last_price);
        }

        if (elements.stockChange) {
            const change = stockData.change || 0;
            elements.stockChange.textContent = formatPercentage(change);
            elements.stockChange.className = `change ${getChangeClass(change)}`;
        }
    }

    updateStockMetrics(stockData) {
        const elements = {
            stockClose: document.getElementById('stockClose'),
            stockHigh: document.getElementById('stockHigh'),
            stockLow: document.getElementById('stockLow'),
            stockVolume: document.getElementById('stockVolume'),
            stockMarketCap: document.getElementById('stockMarketCap'),
            stockSector: document.getElementById('stockSector')
        };

        if (elements.stockClose) {
            elements.stockClose.textContent = formatPrice(stockData.close_price);
        }
        if (elements.stockHigh) {
            elements.stockHigh.textContent = formatPrice(stockData.high_price);
        }
        if (elements.stockLow) {
            elements.stockLow.textContent = formatPrice(stockData.low_price);
        }
        if (elements.stockVolume) {
            elements.stockVolume.textContent = formatNumber(stockData.volume, 0);
        }
        if (elements.stockMarketCap) {
            elements.stockMarketCap.textContent = formatNumber(stockData.market_cap, 0);
        }
        if (elements.stockSector) {
            elements.stockSector.textContent = stockData.isin || '-';
        }
    }

    updateStockChart(stockData) {
        // Fonction supprimée car le graphique n'est plus affiché
    }

    hideStockDetails() {
        const stockDetails = document.getElementById('stockDetails');
        if (stockDetails) {
            stockDetails.style.display = 'none';
        }

        this.currentStock = null;

        if (this.stockChart) {
            this.stockChart.destroy();
            this.stockChart = null;
        }

        // Stop order book refresh
        this.stopOrderBookRefresh();
    }

    async showSearchSuggestions(query) {
        try {
            const response = await api.searchStocks(query, 5);

            if (response.success && response.data && response.data.length > 0) {
                this.displaySearchSuggestions(response.data);
            }
        } catch (error) {
            console.error('Error fetching search suggestions:', error);
        }
    }

    displaySearchSuggestions(suggestions) {
        // Remove existing suggestions
        const existingSuggestions = document.querySelector('.search-suggestions');
        if (existingSuggestions) {
            existingSuggestions.remove();
        }

        const searchContainer = document.querySelector('.search-container');
        if (!searchContainer) return;

        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'search-suggestions';
        suggestionsDiv.style.cssText = `
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            width: 100%;
            max-width: 600px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            margin-top: 4px;
            overflow: hidden;
        `;

        suggestions.forEach((stock, index) => {
            const suggestionItem = document.createElement('div');
            suggestionItem.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                border-bottom: 1px solid #e2e8f0;
                transition: background-color 0.15s ease;
            `;

            suggestionItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${stock.ticker}</strong>
                        <div style="font-size: 0.875rem; color: #64748b;">${truncateText(stock.stock_name || '', 40)}</div>
                    </div>
                    <div style="text-align: right;">
                        <div>${formatPrice(stock.last_price)}</div>
                        <div class="${getChangeClass(stock.change)}" style="font-size: 0.875rem;">
                            ${formatPercentage(stock.change)}
                        </div>
                    </div>
                </div>
            `;

            suggestionItem.addEventListener('mouseenter', () => {
                suggestionItem.style.backgroundColor = '#f8fafc';
            });

            suggestionItem.addEventListener('mouseleave', () => {
                suggestionItem.style.backgroundColor = 'white';
            });

            suggestionItem.addEventListener('click', () => {
                const stockSearch = document.getElementById('stockSearch');
                if (stockSearch) {
                    stockSearch.value = stock.ticker;
                }
                this.searchStock(stock.ticker);
                suggestionsDiv.remove();
            });

            if (index === suggestions.length - 1) {
                suggestionItem.style.borderBottom = 'none';
            }

            suggestionsDiv.appendChild(suggestionItem);
        });

        searchContainer.style.position = 'relative';
        searchContainer.appendChild(suggestionsDiv);

        // Remove suggestions when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function removeSuggestions(e) {
                if (!searchContainer.contains(e.target)) {
                    suggestionsDiv.remove();
                    document.removeEventListener('click', removeSuggestions);
                }
            });
        }, 100);
    }

    async analyzeCurrentStock() {
        if (!this.currentStock) {
            showToast('Aucune action sélectionnée', 'warning');
            return;
        }

        try {
            showLoading();

            const response = await api.analyzeStock(this.currentStock.ticker);

            if (response.success && response.data) {
                this.displayAnalysisResult(response.data);
                showToast('Analyse IA terminée', 'success');
            } else {
                showToast('Erreur lors de l\'analyse IA', 'error');
            }
        } catch (error) {
            handleAPIError(error, 'analyzing stock');
        } finally {
            hideLoading();
        }
    }

    displayAnalysisResult(analysisData) {
        // Switch to AI analysis section and display results
        const aiSection = document.getElementById('ai-analysis');
        const stocksSection = document.getElementById('stocks');

        if (aiSection && stocksSection) {
            // Update navigation
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            document.querySelector('.nav-link[href="#ai-analysis"]').classList.add('active');

            // Switch sections
            stocksSection.classList.remove('active');
            aiSection.classList.add('active');

            // Display analysis in the AI section
            if (window.aiModule) {
                window.aiModule.displayStockAnalysis(analysisData);
            }

            // Update URL
            updateURLHash('ai-analysis');
        }
    }

    showCompareDialog() {
        if (!this.currentStock) {
            showToast('Aucune action sélectionnée', 'warning');
            return;
        }

        // Switch to AI analysis section and pre-fill comparison
        const aiSection = document.getElementById('ai-analysis');
        const stocksSection = document.getElementById('stocks');
        const stock1Input = document.getElementById('stock1Input');

        if (aiSection && stocksSection && stock1Input) {
            // Update navigation
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            document.querySelector('.nav-link[href="#ai-analysis"]').classList.add('active');

            // Switch sections
            stocksSection.classList.remove('active');
            aiSection.classList.add('active');

            // Pre-fill first stock
            stock1Input.value = this.currentStock.ticker;
            stock1Input.focus();

            // Scroll to comparison tool
            const comparisonTool = stock1Input.closest('.tool-card');
            if (comparisonTool) {
                comparisonTool.scrollIntoView({ behavior: 'smooth' });
            }

            // Update URL
            updateURLHash('ai-analysis');
        }
    }

    destroy() {
        if (this.stockChart) {
            this.stockChart.destroy();
            this.stockChart = null;
        }

        // Stop order book refresh on destroy
        this.stopOrderBookRefresh();
    }
}

// Initialize stocks module when DOM is loaded
window.stocksModule = null;

document.addEventListener('DOMContentLoaded', () => {
    // Création de l'instance stocks et assignation immédiate à window.stocksModule
    window.stocksModule = new Stocks();
});

// Export for global access
window.stocksModule = stocksModule;

// Ajout CSS effet lumineux pour le carnet d'ordre
// A placer dans graphiques.css :
// .flash-cell {
//     animation: flashOrderBook 0.7s;
//     background: linear-gradient(90deg, #fffbe6 0%, #ffe066 100%);
// }
// @keyframes flashOrderBook {
//     0% { background: #ffe066; }
//     100% { background: transparent; }
// }

/**
 * Affiche le graphique de profondeur du carnet d'ordre
 * @param {Object} orderBookData - Données du carnet d'ordre { bids: [{price, volume}], asks: [{price, volume}] }
 */
function renderOrderBookDepthChart(orderBookData) {
    const canvas = document.getElementById('orderBookDepthChart');
    if (!canvas) return console.error("Canvas 'orderBookDepthChart' introuvable");

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (window.orderBookDepthChartInstance) {
        window.orderBookDepthChartInstance.destroy();
    }

    // Trier les données
    // Bids : du best bid (prix max) vers le moins bon (prix min)
    const bids = [...orderBookData.bids].sort((a, b) => b.price - a.price);
    // Asks : du best ask (prix min) vers le moins bon (prix max)
    const asks = [...orderBookData.asks].sort((a, b) => a.price - b.price);

    // Calcul des volumes cumulés dans le bon ordre (cumul croissant pour les deux)
    let cumBid = 0, cumAsk = 0;
    const bidData = bids.map(b => ({ x: b.price, y: cumBid += b.volume }));
    cumAsk = 0;
    const askData = asks.map(a => ({ x: a.price, y: cumAsk += a.volume }));

    // Détermination du prix d'achat minimum pour l'axe X
    let minBidPrice = null;
    if (bids.length > 0) {
        minBidPrice = Math.min(...bids.map(b => b.price));
    }
    // Détermination du prix de vente maximum pour l'axe X (pour garder l'affichage complet)
    let maxAskPrice = null;
    if (asks.length > 0) {
        maxAskPrice = Math.max(...asks.map(a => a.price));
    }

    // Calcul du midmarket
    let midmarket = null;
    if (bids.length && asks.length) {
        const bestBid = Math.max(...bids.map(b => b.price));
        const bestAsk = Math.min(...asks.map(a => a.price));
        midmarket = (bestBid + bestAsk) / 2;
    }

    // Dégradés
    const gradientBid = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradientBid.addColorStop(0, 'rgba(34,197,94,0.4)');
    gradientBid.addColorStop(1, 'rgba(34,197,94,0.05)');

    const gradientAsk = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradientAsk.addColorStop(0, 'rgba(239,68,68,0.4)');
    gradientAsk.addColorStop(1, 'rgba(239,68,68,0.05)');

    // Ligne Midmarket
    let annotation = {};
    if (midmarket !== null) {
        annotation = {
            type: 'line',
            xMin: midmarket,
            xMax: midmarket,
            borderColor: '#0ea5e9',
            borderWidth: 2,
            borderDash: [6, 6],

        };
    }

    // Création du graphique
    window.orderBookDepthChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Achats cumulés',
                    data: bidData,
                    borderColor: 'rgba(34,197,94,1)',
                    backgroundColor: gradientBid,
                    fill: true,
                    pointRadius: 0,
                    stepped: true, // courbe en escalier
                    borderWidth: 2,
                    yAxisID: 'yBid' // Remis à l'association logique
                },
                {
                    label: 'Ventes cumulées',
                    data: askData,
                    borderColor: 'rgba(239,68,68,1)',
                    backgroundColor: gradientAsk,
                    fill: true,
                    pointRadius: 0,
                    stepped: true, // courbe en escalier
                    borderWidth: 2,
                    yAxisID: 'yAsk' // Remis à l'association logique
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: {
                    type: 'linear',
                    title: { display: true, text: 'Prix' },
                    grid: { color: '#e5e7eb' },
                    min: minBidPrice !== null ? minBidPrice : undefined, // Commencer à la première valeur d'achat
                    max: maxAskPrice !== null ? maxAskPrice : undefined  // Finir à la dernière valeur de vente
                },
                yBid: {
                    position: 'left',
                    title: { display: true, text: 'Volume cumulé (Achats)' },
                    grid: { color: '#e5e7eb' }
                },
                yAsk: {
                    position: 'right',
                    title: { display: true, text: 'Volume cumulé (Ventes)' },
                    grid: { drawOnChartArea: false }
                }
            },
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: { mode: 'index', intersect: false },
                annotation: { annotations: midmarket !== null ? { midmarketLine: annotation } : {} }
            }
        }
    });

    // Afficher le midmarket
    const midmarketSpan = document.getElementById('midmarketPrice');
    if(midmarketSpan) midmarketSpan.textContent = midmarket ? midmarket.toFixed(3) : '-';
}

// Met à jour le midmarket séparément si nécessaire
function updateMidmarketPrice(bids, asks) {
    const midmarketSpan = document.getElementById('midmarketPrice');
    if (!midmarketSpan) return;
    if (!bids.length || !asks.length) {
        midmarketSpan.textContent = '-';
        return;
    }
    const bestBid = Math.max(...bids.map(b => b.price));
    const bestAsk = Math.min(...asks.map(a => a.price));
    const midmarket = (bestBid + bestAsk) / 2;
    midmarketSpan.textContent = midmarket.toFixed(3);
}

/**
 * Ajuste la taille du canvas du graphique d'historique des actions à son conteneur parent
 */
function adjustCanvasSize() {
    const chartCanvas = document.getElementById('stockHistoryChart');
    if (!chartCanvas || !chartCanvas.parentElement) return;
    // Adapter la taille du canvas à son conteneur
    chartCanvas.width = chartCanvas.parentElement.offsetWidth;
    chartCanvas.height = chartCanvas.parentElement.offsetHeight;
}
