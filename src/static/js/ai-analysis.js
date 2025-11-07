/**
 * Module JavaScript pour l'Analyse & Prédiction IA
 * Utilise les 3 derniers mois de données quotidiennes (comme la section Graphiques)
 */

class AIAnalysisManager {
    constructor() {
        this.currentAnalysis = null;
        this.isAnalyzing = false;
        this.historyData = null;
        this.init();
    }

    init() {
        this.loadAvailableStocks();
        this.attachEventListeners();
    }

    /**
     * Charge la liste des actions disponibles
     */
    async loadAvailableStocks() {
        try {
            const response = await fetch('/api/ai-analysis/stocks');
            const result = await response.json();

            if (result.success && result.stocks) {
                const select = document.getElementById('aiAnalysisSymbol');
                if (!select) return;

                select.innerHTML = '<option value="">Sélectionner une action...</option>';

                result.stocks.forEach(stock => {
                    const option = document.createElement('option');
                    option.value = stock.ticker;
                    option.textContent = `${stock.ticker} - ${stock.name}`;
                    if (stock.change) {
                        const changeSign = stock.change >= 0 ? '+' : '';
                        option.textContent += ` (${changeSign}${stock.change.toFixed(2)}%)`;
                    }
                    select.appendChild(option);
                });

                console.log(`${result.stocks.length} actions chargées`);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des actions:', error);
            this.showToast('Erreur lors du chargement des actions', 'error');
        }
    }

    /**
     * Attache les événements
     */
    attachEventListeners() {
        const analyzeBtn = document.getElementById('analyzeAIBtn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.performAnalysis());
        }

        const symbolSelect = document.getElementById('aiAnalysisSymbol');
        if (symbolSelect) {
            symbolSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.clearPreviousAnalysis();
                }
            });
        }
    }

    /**
     * Effectue l'analyse IA complète
     */
    async performAnalysis() {
        const symbolSelect = document.getElementById('aiAnalysisSymbol');
        const symbol = symbolSelect?.value;

        if (!symbol) {
            this.showToast('Veuillez sélectionner une action', 'warning');
            return;
        }

        if (this.isAnalyzing) return;

        this.isAnalyzing = true;
        this.showLoader(true);
        this.clearPreviousAnalysis();

        try {
            console.log(`Début de l'analyse pour ${symbol}`);

            // Étape 1: Récupérer les données historiques (3 MOIS QUOTIDIEN)
            this.historyData = await this.fetchHistoryData(symbol);

            if (!this.historyData || !this.historyData.t || this.historyData.t.length < 20) {
                this.showError('Données historiques insuffisantes pour l\'analyse');
                return;
            }

            console.log(`Données reçues: ${this.historyData.t.length} points (3 mois quotidien)`);

            // Étape 2: Calculer les indicateurs techniques
            const indicators = this.calculateIndicators(this.historyData);
            console.log('Indicateurs calculés:', indicators);

            // Étape 3: Calculer support, résistance et volumes
            const supportResistance = this.calculateSupportResistance(this.historyData);
            const volumes = this.calculateVolumes(this.historyData);

            const currentPrice = this.historyData.c[this.historyData.c.length - 1];

            // Étape 4: Préparer le payload pour le backend
            const analysisPayload = {
                indicators: {
                    rsi: indicators.rsi,
                    macd: indicators.macd,
                    macd_signal: indicators.macd_signal,
                    sma_20: indicators.sma_20,
                    sma_50: indicators.sma_50,
                    momentum: indicators.momentum
                },
                current_price: currentPrice,
                support: supportResistance.support,
                resistance: supportResistance.resistance,
                avg_volume: volumes.avg_volume,
                recent_volume: volumes.recent_volume
            };

            console.log('Envoi au backend:', analysisPayload);

            // Étape 5: Envoyer au backend pour génération de l'analyse
            const response = await fetch(`/api/ai-analysis/analyze/${symbol}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(analysisPayload)
            });

            const result = await response.json();

            if (result.success) {
                this.displayAnalysis(result, symbol);
                this.currentAnalysis = result;
                this.showToast('Analyse terminée avec succès', 'success');
            } else {
                this.showError(result.error || 'Erreur lors de l\'analyse');
            }
        } catch (error) {
            console.error('Erreur lors de l\'analyse:', error);
            this.showError('Erreur: ' + error.message);
        } finally {
            this.isAnalyzing = false;
            this.showLoader(false);
        }
    }

    /**
     * Récupère les données historiques (3 MOIS QUOTIDIEN)
     */
    async fetchHistoryData(symbol) {
        try {
            // Récupérer le stockName depuis l'API
            const stocksResponse = await fetch('https://data.irbe7.com/api/data');
            const stocksData = await stocksResponse.json();

            let stockName = null;
            for (const item of stocksData) {
                if (item.referentiel && item.referentiel.ticker === symbol) {
                    stockName = item.referentiel.stockName;
                    break;
                }
            }

            if (!stockName) {
                throw new Error(`Action ${symbol} non trouvée`);
            }

            // Récupérer l'historique (3 MOIS = 90 jours)
            const toTimestamp = Math.floor(Date.now() / 1000);
            const fromTimestamp = toTimestamp - (90 * 24 * 60 * 60); // 3 mois

            const historyResponse = await fetch(
                `https://data.irbe7.com/api/data/history?symbol=${stockName}&resolution=1D&from=${fromTimestamp}&to=${toTimestamp}&countback=2`
            );
            const historyData = await historyResponse.json();

            if (historyData.s === 'ok') {
                console.log(`Historique récupéré: ${historyData.c.length} jours (3 mois quotidien)`);
                return historyData;
            }

            throw new Error('Données historiques invalides');
        } catch (error) {
            console.error('Erreur fetchHistoryData:', error);
            throw error;
        }
    }

    /**
     * Calcule tous les indicateurs techniques
     * Sur les 3 derniers mois quotidien (comme dataCharts)
     */
    calculateIndicators(historyData) {
        const prices = historyData.c;

        console.log(`Calcul des indicateurs sur ${prices.length} jours de données (3 mois quotidien)`);

        // Plus besoin de RSI - supprimé
        const rsi = 50; // Valeur par défaut

        // MACD
        const macdData = this.calculateMACD(prices);
        const macd = macdData.macd[macdData.macd.length - 1] || 0;
        const macd_signal = macdData.signal[macdData.signal.length - 1] || 0;

        // SMA
        const sma20Values = this.calculateSMA(prices, 20);
        const sma50Values = this.calculateSMA(prices, 50);
        const sma_20 = sma20Values[sma20Values.length - 1] || prices[prices.length - 1];
        const sma_50 = sma50Values[sma50Values.length - 1] || prices[prices.length - 1];

        // Momentum
        const momentumValues = this.calculateMomentum(prices, 10);
        const momentum = momentumValues[momentumValues.length - 1] || 0;

        return {
            rsi,
            macd,
            macd_signal,
            sma_20,
            sma_50,
            momentum
        };
    }

    

    /**
     * Calcule le MACD
     */
    calculateMACD(prices) {
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        const macdLine = ema12.map((val, i) => val - ema26[i]);
        const signalLine = this.calculateEMA(macdLine, 9);

        return {
            macd: macdLine,
            signal: signalLine
        };
    }

    /**
     * Calcule l'EMA
     */
    calculateEMA(prices, period) {
        const k = 2 / (period + 1);
        const ema = [prices[0]];

        for (let i = 1; i < prices.length; i++) {
            ema.push(prices[i] * k + ema[i - 1] * (1 - k));
        }

        return ema;
    }

    /**
     * Calcule la SMA
     */
    calculateSMA(prices, period) {
        const sma = [];
        for (let i = 0; i < prices.length; i++) {
            if (i < period - 1) {
                sma.push(null);
            } else {
                const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
                sma.push(sum / period);
            }
        }
        return sma;
    }

    /**
     * Calcule le Momentum
     */
    calculateMomentum(prices, period) {
        const momentum = [];
        for (let i = 0; i < prices.length; i++) {
            if (i < period) {
                momentum.push(0);
            } else {
                momentum.push(prices[i] - prices[i - period]);
            }
        }
        return momentum;
    }

    /**
     * Calcule support et résistance
     */
    calculateSupportResistance(historyData) {
        const lows = historyData.l;
        const highs = historyData.h;

        // Utiliser toutes les données disponibles (3 mois)
        const recentLows = lows;
        const recentHighs = highs;

        const sortedLows = [...recentLows].sort((a, b) => a - b);
        const support = (sortedLows[0] + sortedLows[1] + sortedLows[2]) / 3;

        const sortedHighs = [...recentHighs].sort((a, b) => b - a);
        const resistance = (sortedHighs[0] + sortedHighs[1] + sortedHighs[2]) / 3;

        return {
            support: parseFloat(support.toFixed(2)),
            resistance: parseFloat(resistance.toFixed(2))
        };
    }

    /**
     * Calcule les volumes
     */
    calculateVolumes(historyData) {
        const volumes = historyData.v || [];

        if (volumes.length < 20) {
            return { avg_volume: 0, recent_volume: 0 };
        }

        const recent_volume = volumes[volumes.length - 1];
        const avg_volume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;

        return {
            avg_volume: Math.round(avg_volume),
            recent_volume: Math.round(recent_volume)
        };
    }

    /**
     * Affiche les résultats de l'analyse
     */
    displayAnalysis(result, symbol) {
        const container = document.getElementById('aiAnalysisResults');
        if (!container) return;

        const trendIcon = this.getTrendIcon(result.trend);
        const trendClass = this.getTrendClass(result.trend);
        const confidencePercent = (result.confidence * 100).toFixed(0);
        const confidenceColor = this.getConfidenceColor(result.confidence);

        const timestamp = new Date(result.timestamp);
        const formattedDate = timestamp.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const formattedTime = timestamp.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        container.innerHTML = `
            <div class="ai-analysis-card">
                <div class="analysis-header">
                    <div class="stock-title">
                        <h3>${symbol}</h3>
                        <span class="analysis-timestamp">
                            <i class="fas fa-clock"></i> ${formattedDate} à ${formattedTime}
                        </span>
                    </div>
                    <div class="current-price">
                        <span class="price-label">Cours actuel</span>
                        <span class="price-value">${result.current_price.toFixed(2)} DT</span>
                    </div>
                </div>

                <div class="analysis-metrics">
                    <div class="metric-card ${trendClass}">
                        <div class="metric-icon">${trendIcon}</div>
                        <div class="metric-content">
                            <span class="metric-label">Tendance</span>
                            <span class="metric-value">${result.trend.charAt(0).toUpperCase() + result.trend.slice(1)}</span>
                        </div>
                    </div>

                    <div class="metric-card">
                        <div class="metric-icon">🎯</div>
                        <div class="metric-content">
                            <span class="metric-label">Confiance IA</span>
                            <span class="metric-value" style="color: ${confidenceColor};">${confidencePercent}%</span>
                        </div>
                    </div>

                    <div class="metric-card">
                        <div class="metric-icon">📊</div>
                        <div class="metric-content">
                            <span class="metric-label">Support</span>
                            <span class="metric-value">${result.support.toFixed(2)} DT</span>
                        </div>
                    </div>

                    <div class="metric-card">
                        <div class="metric-icon">📈</div>
                        <div class="metric-content">
                            <span class="metric-label">Résistance</span>
                            <span class="metric-value">${result.resistance.toFixed(2)} DT</span>
                        </div>
                    </div>
                </div>

                <div class="analysis-text-section">
                    <h4><i class="fas fa-brain"></i> Analyse Technique Professionnelle</h4>
                    <p class="analysis-text">${result.analysis}</p>
                </div>
            </div>
        `;

        container.style.display = 'block';
    }

    

    getTrendIcon(trend) {
        switch (trend.toLowerCase()) {
            case 'haussière': return '📈';
            case 'baissière': return '📉';
            default: return '➖';
        }
    }

    getTrendClass(trend) {
        switch (trend.toLowerCase()) {
            case 'haussière': return 'trend-bullish';
            case 'baissière': return 'trend-bearish';
            default: return 'trend-neutral';
        }
    }

    getConfidenceColor(confidence) {
        if (confidence >= 0.8) return '#10b981';
        if (confidence >= 0.6) return '#3b82f6';
        if (confidence >= 0.4) return '#f59e0b';
        return '#ef4444';
    }

    showLoader(show) {
        const loader = document.getElementById('aiAnalysisLoader');
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
        }
    }

    clearPreviousAnalysis() {
        const container = document.getElementById('aiAnalysisResults');
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
        }
    }

    showError(message) {
        const container = document.getElementById('aiAnalysisResults');
        if (!container) return;

        container.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Erreur:</strong> ${message}
            </div>
        `;
        container.style.display = 'block';
    }

    showToast(message, type = 'info') {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Initialiser
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('aiAnalysis')) {
        window.aiAnalysisManager = new AIAnalysisManager();
    }
});

