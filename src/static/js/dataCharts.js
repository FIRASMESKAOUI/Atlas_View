// === CODE BOLLINGER BANDS - Début ===
class BollingerBandsCalculator {
    constructor(period = 20, multiplier = 2) {
        this.period = period;
        this.multiplier = multiplier;
    }

    calculate(prices) {
        if (!prices || prices.length < this.period) {
            return { upper: [], middle: [], lower: [], bandwidth: [], percentB: [] };
        }

        const middle = this.calculateSMA(prices, this.period);
        const upper = [];
        const lower = [];
        const bandwidth = [];
        const percentB = [];

        for (let i = this.period - 1; i < prices.length; i++) {
            const slice = prices.slice(i - this.period + 1, i + 1);
            const stdDev = this.calculateStandardDeviation(slice, middle[i]);

            const upperBand = middle[i] + (this.multiplier * stdDev);
            const lowerBand = middle[i] - (this.multiplier * stdDev);

            upper.push(upperBand);
            lower.push(lowerBand);
            bandwidth.push(((upperBand - lowerBand) / middle[i]) * 100);

            const currentPrice = prices[i];
            percentB.push(((currentPrice - lowerBand) / (upperBand - lowerBand)) * 100);
        }

        const prefix = Array(this.period - 1).fill(null);

        return {
            upper: [...prefix, ...upper],
            middle: middle,
            lower: [...prefix, ...lower],
            bandwidth: [...prefix, ...bandwidth],
            percentB: [...prefix, ...percentB]
        };
    }

    calculateSMA(data, period) {
        const sma = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                sma.push(null);
            } else {
                const slice = data.slice(i - period + 1, i + 1);
                const sum = slice.reduce((a, b) => a + b, 0);
                sma.push(sum / period);
            }
        }
        return sma;
    }

    calculateStandardDeviation(data, mean) {
        const squareDiffs = data.map(value => Math.pow(value - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / data.length;
        return Math.sqrt(avgSquareDiff);
    }

    getCurrentValues(bbData) {
        if (!bbData.upper || bbData.upper.length === 0) return null;
        const lastIndex = bbData.upper.length - 1;
        return {
            upper: bbData.upper[lastIndex],
            middle: bbData.middle[lastIndex],
            lower: bbData.lower[lastIndex],
            bandwidth: bbData.bandwidth[lastIndex],
            percentB: bbData.percentB[lastIndex]
        };
    }
}

const BollingerBandsPlugin = {
    id: 'bollingerBands',

    afterDatasetDraw(chart, args, options) {
        const { ctx, chartArea, scales } = chart;
        const bbData = chart.config._bollingerBandsData;

        if (!bbData || !bbData.upper || !bbData.middle || !bbData.lower) return;

        const xScale = scales.x;
        const yScale = scales.y;

        ctx.save();
        this.drawBollingerArea(ctx, xScale, yScale, bbData, chartArea);
        this.drawBollingerLines(ctx, xScale, yScale, bbData, chartArea);
        ctx.restore();
    },

    drawBollingerArea(ctx, xScale, yScale, bbData, chartArea) {
        const { upper, lower, timestamps } = bbData;
        if (!timestamps || timestamps.length === 0) return;

        ctx.beginPath();
        for (let i = 0; i < timestamps.length; i++) {
            if (upper[i] === null || lower[i] === null) continue;
            const x = xScale.getPixelForValue(timestamps[i]);
            const yUpper = yScale.getPixelForValue(upper[i]);
            if (i === 0) ctx.moveTo(x, yUpper);
            else ctx.lineTo(x, yUpper);
        }
        for (let i = timestamps.length - 1; i >= 0; i--) {
            if (upper[i] === null || lower[i] === null) continue;
            const x = xScale.getPixelForValue(timestamps[i]);
            const yLower = yScale.getPixelForValue(lower[i]);
            ctx.lineTo(x, yLower);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(138, 43, 226, 0.03)'; // Violet très transparent
        ctx.fill();
    },

    drawBollingerLines(ctx, xScale, yScale, bbData, chartArea) {
        const { upper, middle, lower, timestamps } = bbData;
        this.drawBollingerLine(ctx, xScale, yScale, timestamps, upper, 'rgba(138, 43, 226, 0.8)', 1); // Violet
        this.drawBollingerLine(ctx, xScale, yScale, timestamps, middle, 'rgba(255, 165, 0, 0.8)', 1.5); // Orange
        this.drawBollingerLine(ctx, xScale, yScale, timestamps, lower, 'rgba(138, 43, 226, 0.8)', 1); // Violet
    },

    drawBollingerLine(ctx, xScale, yScale, timestamps, values, color, width) {
        ctx.beginPath();
        let firstPoint = true;
        for (let i = 0; i < timestamps.length; i++) {
            if (values[i] === null) {
                firstPoint = true;
                continue;
            }
            const x = xScale.getPixelForValue(timestamps[i]);
            const y = yScale.getPixelForValue(values[i]);
            if (firstPoint) {
                ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.setLineDash([]);
        ctx.stroke();
    }
};

if (typeof Chart !== 'undefined') {
    Chart.register(BollingerBandsPlugin);
}
// === CODE BOLLINGER BANDS - Fin ===

// === CODE INDICATEURS TECHNIQUES - Début ===
class TechnicalIndicators {
    // ================= ICHIMOKU CLOUD =================
    calculateIchimoku(high, low, close, conversionPeriod = 9, basePeriod = 26, laggingSpanPeriod = 26, displacement = 26) {
        if (!high || !low || !close || high.length < basePeriod) {
            return {
                conversion: [],
                base: [],
                leadingSpanA: [],
                leadingSpanB: [],
                laggingSpan: []
            };
        }

        const conversion = this.calculateTenkanSen(high, low, conversionPeriod);
        const base = this.calculateKijunSen(high, low, basePeriod);
        const leadingSpanA = this.calculateSenkouSpanA(conversion, base, displacement);
        const leadingSpanB = this.calculateSenkouSpanB(high, low, basePeriod, displacement);
        const laggingSpan = this.calculateChikouSpan(close, laggingSpanPeriod);

        return {
            conversion,
            base,
            leadingSpanA,
            leadingSpanB,
            laggingSpan
        };
    }

    calculateTenkanSen(high, low, period = 9) {
        const tenkan = [];
        for (let i = 0; i < high.length; i++) {
            if (i < period - 1) {
                tenkan.push(null);
            } else {
                const highSlice = high.slice(i - period + 1, i + 1);
                const lowSlice = low.slice(i - period + 1, i + 1);
                const highestHigh = Math.max(...highSlice);
                const lowestLow = Math.min(...lowSlice);
                tenkan.push((highestHigh + lowestLow) / 2);
            }
        }
        return tenkan;
    }

    calculateKijunSen(high, low, period = 26) {
        const kijun = [];
        for (let i = 0; i < high.length; i++) {
            if (i < period - 1) {
                kijun.push(null);
            } else {
                const highSlice = high.slice(i - period + 1, i + 1);
                const lowSlice = low.slice(i - period + 1, i + 1);
                const highestHigh = Math.max(...highSlice);
                const lowestLow = Math.min(...lowSlice);
                kijun.push((highestHigh + lowestLow) / 2);
            }
        }
        return kijun;
    }

    calculateSenkouSpanA(conversion, base, displacement = 26) {
        const senkouA = [];
        for (let i = 0; i < conversion.length; i++) {
            if (conversion[i] !== null && base[i] !== null) {
                senkouA.push((conversion[i] + base[i]) / 2);
            } else {
                senkouA.push(null);
            }
        }
        // Décalage vers l'avant
        const shifted = Array(displacement).fill(null).concat(senkouA.slice(0, -displacement));
        return shifted;
    }

    calculateSenkouSpanB(high, low, period = 52, displacement = 26) {
        const senkouB = [];
        for (let i = 0; i < high.length; i++) {
            if (i < period - 1) {
                senkouB.push(null);
            } else {
                const highSlice = high.slice(i - period + 1, i + 1);
                const lowSlice = low.slice(i - period + 1, i + 1);
                const highestHigh = Math.max(...highSlice);
                const lowestLow = Math.min(...lowSlice);
                senkouB.push((highestHigh + lowestLow) / 2);
            }
        }
        // Décalage vers l'avant
        const shifted = Array(displacement).fill(null).concat(senkouB.slice(0, -displacement));
        return shifted;
    }

    calculateChikouSpan(close, laggingPeriod = 26) {
        // Décalage vers l'arrière
        const shifted = close.slice(laggingPeriod).concat(Array(laggingPeriod).fill(null));
        return shifted;
    }

    // ================= STOCHASTIC OSCILLATOR =================
    calculateStochastic(high, low, close, kPeriod = 14, dPeriod = 3) {
        if (!high || !low || !close || high.length < kPeriod) {
            return { k: [], d: [] };
        }

        const k = [];
        const d = [];

        // Calcul %K
        for (let i = 0; i < close.length; i++) {
            if (i < kPeriod - 1) {
                k.push(null);
            } else {
                const currentClose = close[i];
                const periodHigh = Math.max(...high.slice(i - kPeriod + 1, i + 1));
                const periodLow = Math.min(...low.slice(i - kPeriod + 1, i + 1));

                if (periodHigh === periodLow) {
                    k.push(50); // Éviter la division par zéro
                } else {
                    k.push(((currentClose - periodLow) / (periodHigh - periodLow)) * 100);
                }
            }
        }

        // Calcul %D (moyenne mobile de %K)
        for (let i = 0; i < k.length; i++) {
            if (i < kPeriod + dPeriod - 2) {
                d.push(null);
            } else {
                const kSlice = k.slice(i - dPeriod + 1, i + 1).filter(val => val !== null);
                if (kSlice.length > 0) {
                    d.push(kSlice.reduce((sum, val) => sum + val, 0) / kSlice.length);
                } else {
                    d.push(null);
                }
            }
        }

        return { k, d };
    }

    // ================= WILLIAMS %R =================
    calculateWilliamsR(high, low, close, period = 14) {
        if (!high || !low || !close || high.length < period) {
            return [];
        }

        const williamsR = [];

        for (let i = 0; i < close.length; i++) {
            if (i < period - 1) {
                williamsR.push(null);
            } else {
                const currentClose = close[i];
                const periodHigh = Math.max(...high.slice(i - period + 1, i + 1));
                const periodLow = Math.min(...low.slice(i - period + 1, i + 1));

                if (periodHigh === periodLow) {
                    williamsR.push(-50); // Éviter la division par zéro
                } else {
                    williamsR.push(((periodHigh - currentClose) / (periodHigh - periodLow)) * -100);
                }
            }
        }

        return williamsR;
    }

    // ================= GET CURRENT VALUES =================
    getCurrentIchimokuValues(ichimokuData) {
        if (!ichimokuData.conversion || ichimokuData.conversion.length === 0) return null;
        const lastIndex = ichimokuData.conversion.length - 1;
        return {
            conversion: ichimokuData.conversion[lastIndex],
            base: ichimokuData.base[lastIndex],
            leadingSpanA: ichimokuData.leadingSpanA[lastIndex],
            leadingSpanB: ichimokuData.leadingSpanB[lastIndex],
            laggingSpan: ichimokuData.laggingSpan[lastIndex]
        };
    }

    getCurrentStochasticValues(stochasticData) {
        if (!stochasticData.k || stochasticData.k.length === 0) return null;
        const lastIndex = stochasticData.k.length - 1;
        return {
            k: stochasticData.k[lastIndex],
            d: stochasticData.d[lastIndex]
        };
    }

    getCurrentWilliamsRValue(williamsRData) {
        if (!williamsRData || williamsRData.length === 0) return null;
        return williamsRData[williamsRData.length - 1];
    }
}

// Plugin Chart.js pour Ichimoku
const IchimokuPlugin = {
    id: 'ichimoku',

    afterDatasetDraw(chart, args, options) {
        const { ctx, chartArea, scales } = chart;
        const ichimokuData = chart.config._ichimokuData;

        if (!ichimokuData) return;

        const xScale = scales.x;
        const yScale = scales.y;

        ctx.save();

        // Dessiner le nuage (Kumo) en premier
        this.drawIchimokuCloud(ctx, xScale, yScale, ichimokuData, chartArea);

        // Dessiner les lignes
        this.drawIchimokuLines(ctx, xScale, yScale, ichimokuData, chartArea);

        ctx.restore();
    },

    drawIchimokuCloud(ctx, xScale, yScale, ichimokuData, chartArea) {
        const { leadingSpanA, leadingSpanB, timestamps } = ichimokuData;
        if (!timestamps || timestamps.length === 0) return;

        // Dessiner la zone entre Senkou Span A et B
        ctx.beginPath();
        for (let i = 0; i < timestamps.length; i++) {
            if (leadingSpanA[i] === null || leadingSpanB[i] === null) continue;
            const x = xScale.getPixelForValue(timestamps[i]);
            const yA = yScale.getPixelForValue(leadingSpanA[i]);

            if (i === 0) {
                ctx.moveTo(x, yA);
            } else {
                ctx.lineTo(x, yA);
            }
        }

        for (let i = timestamps.length - 1; i >= 0; i--) {
            if (leadingSpanA[i] === null || leadingSpanB[i] === null) continue;
            const x = xScale.getPixelForValue(timestamps[i]);
            const yB = yScale.getPixelForValue(leadingSpanB[i]);
            ctx.lineTo(x, yB);
        }

        ctx.closePath();

        // Nuage vert si Span A > Span B, rouge sinon
        const lastA = leadingSpanA[leadingSpanA.length - 1];
        const lastB = leadingSpanB[leadingSpanB.length - 1];
        const cloudColor = lastA > lastB ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)';

        ctx.fillStyle = cloudColor;
        ctx.fill();
    },

    drawIchimokuLines(ctx, xScale, yScale, ichimokuData, chartArea) {
        const { conversion, base, laggingSpan, timestamps } = ichimokuData;

        // Tenkan-sen (rouge)
        this.drawIchimokuLine(ctx, xScale, yScale, timestamps, conversion, '#FF4444', 1.5);
        // Kijun-sen (bleu)
        this.drawIchimokuLine(ctx, xScale, yScale, timestamps, base, '#4444FF', 1.5);
        // Chikou-span (vert)
        this.drawIchimokuLine(ctx, xScale, yScale, timestamps, laggingSpan, '#44AA44', 1.2);
    },

    drawIchimokuLine(ctx, xScale, yScale, timestamps, values, color, width) {
        ctx.beginPath();
        let firstPoint = true;

        for (let i = 0; i < timestamps.length; i++) {
            if (values[i] === null) {
                firstPoint = true;
                continue;
            }

            const x = xScale.getPixelForValue(timestamps[i]);
            const y = yScale.getPixelForValue(values[i]);

            if (firstPoint) {
                ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
    }
};

// Enregistrer les plugins
if (typeof Chart !== 'undefined') {
    Chart.register(IchimokuPlugin);
}
// === CODE INDICATEURS TECHNIQUES - Fin ===

// Configuration pour Chart.js avec plugin Financial, Zoom, Curseur de repère et Outils de dessin
class DataCharts {
    constructor() {
        this.currentStock = null;
        this.stockChart = null;
        this.volumeChart = null;
        this.macdChart = null;
        this.rsiChart = null;
        this.chartType = 'line';
        this.showMACD = false;
        this.showRSI = false;
        this.showBollinger = false; // AJOUT: Variable pour Bollinger Bands
        this.bollingerCalculator = null; // AJOUT: Calculateur Bollinger
        this.currentBollinger = null; // AJOUT: Valeurs actuelles Bollinger

        // AJOUT: Variables pour les nouveaux indicateurs
        this.showIchimoku = false;
        this.showStochastic = false;
        this.showWilliamsR = false;
        this.technicalIndicators = new TechnicalIndicators();
        this.currentIchimoku = null;
        this.currentStochastic = null;
        this.currentWilliamsR = null;

        this.crosshair = {
            x: null,
            y: null,
            visible: false
        };

        // Variables pour l'outil de dessin
        this.isDrawingLine = false;
        this.drawnLines = [];
        this.selectedLineIndex = null;
        this.dragMode = null; // 'move', 'start', 'end', null
        this.dragOffset = {x: 0, y: 0};
        this.pivotPoint = null; // Point d'ancrage temporaire
        this.previewEnd = null; // Extrémité temporaire pour l'aperçu

        // Variables pour les valeurs actuelles
        this.currentPrice = null;
        this.currentVolume = null;
        this.currentMACD = null;
        this.currentSignal = null;
        this.currentHistogram = null;
        this.currentRSI = null;

        // Nouvelle variable pour suivre si c'est le premier chargement
        this.isFirstLoad = true;

        this.init();
    }

    async init() {
        // Enregistrer les plugins nécessaires
        this.registerChartPlugins();
        await this.loadStocks();
        this.bindEvents();
        this.setupFullscreenChart();
        this.setupDownloadChart();
        this.updateChartTypeButtons();
        this.setupDrawingTools();
        this.updateIndicatorButtons();

        // Afficher automatiquement la première action au premier chargement
        this.autoLoadFirstStock();
    }

    // NOUVELLE MÉTHODE : Charger automatiquement la première action
    autoLoadFirstStock() {
        if (!this.isFirstLoad) return;

        const symbolSelect = document.getElementById('dataChartsSymbol');
        if (!symbolSelect || symbolSelect.options.length <= 1) return;

        // Sélectionner la première action (après l'option par défaut)
        symbolSelect.selectedIndex = 1;

        // Mettre à jour le graphique
        this.updateChart();

        // Marquer que le premier chargement est fait
        this.isFirstLoad = false;
    }

    registerChartPlugins() {
        // Enregistrer le plugin financier si disponible
        if (typeof FinancialController !== 'undefined') {
            Chart.register(FinancialController, CandlestickElement, OhlcElement);
        }

        // Enregistrer le plugin zoom si disponible
        if (typeof ChartZoom !== 'undefined') {
            Chart.register(ChartZoom);
        }

        // Enregistrer le plugin personnalisé pour le curseur de repère
        this.registerCrosshairPlugin();

        // Enregistrer le plugin pour le dessin de lignes
        this.registerDrawingPlugin();

        // Enregistrer le plugin pour le logo Carthago
        this.registerCarthagoLogoPlugin();

        // Enregistrer le plugin pour les valeurs actuelles
        this.registerCurrentValuePlugin();

        // AJOUT: Enregistrer le plugin Ichimoku
        if (typeof IchimokuPlugin !== 'undefined') {
            Chart.register(IchimokuPlugin);
        }

        // AJOUT: Enregistrer le plugin Bollinger Bands
        if (typeof BollingerBandsPlugin !== 'undefined') {
            Chart.register(BollingerBandsPlugin);
        }
    }

    registerCrosshairPlugin() {
        const crosshairPlugin = {
            id: 'crosshair',
            afterDraw: (chart) => {
                const { ctx } = chart;
                const { x, y, visible } = this.crosshair;

                if (!visible || x === null || y === null) return;

                const xAxis = chart.scales.x;
                const yAxis = chart.scales.y;

                // Vérifier si les coordonnées sont dans la zone du graphique
                if (x < xAxis.left || x > xAxis.right || y < yAxis.top || y > yAxis.bottom) return;

                // Dessiner la ligne verticale
                ctx.save();
                ctx.beginPath();
                ctx.setLineDash([5, 3]);
                ctx.strokeStyle = 'rgba(76, 175, 80, 0.8)';
                ctx.lineWidth = 1;
                ctx.moveTo(x, yAxis.top);
                ctx.lineTo(x, yAxis.bottom);
                ctx.stroke();

                // Dessiner la ligne horizontale
                ctx.beginPath();
                ctx.setLineDash([5, 3]);
                ctx.strokeStyle = 'rgba(76, 175, 80, 0.8)';
                ctx.lineWidth = 1;
                ctx.moveTo(xAxis.left, y);
                ctx.lineTo(xAxis.right, y);
                ctx.stroke();
                ctx.restore();

                // Dessiner les labels
                this.drawCrosshairLabels(chart, x, y);
            }
        };

        Chart.register(crosshairPlugin);
    }

    // MÉTHODE : Plugin pour le dessin de lignes
    registerDrawingPlugin() {
        const drawingPlugin = {
            id: 'drawing',
            afterDraw: (chart) => {
                this.drawLinesOnChart(chart);
            }
        };

        Chart.register(drawingPlugin);
    }

    registerCarthagoLogoPlugin() {
        const logoPlugin = {
            id: 'carthagoLogo',
            afterDraw: (chart) => {
                const { ctx, chartArea } = chart;
                if (!chartArea) return;
                if (!this.carthagoLogoImg) {
                    this.carthagoLogoImg = new window.Image();
                    // Changement du chemin de l'image
                    this.carthagoLogoImg.src = '/static/images/atlasviewgraph.png';
                    this.carthagoLogoImg.onload = () => chart.draw();
                }
                const img = this.carthagoLogoImg;
                if (!img.complete) return;

                // Dimensions originales de l'image
                const originalWidth = 500;
                const originalHeight = 110;

                // Ratio d'aspect de l'image
                const aspectRatio = originalWidth / originalHeight;

                // Dimensions souhaitées (plus petites mais proportionnelles)
                const targetHeight = 30; // Hauteur réduite
                const targetWidth = targetHeight * aspectRatio; // Largeur proportionnelle

                const padding = 12;
                const x = chartArea.left + padding;
                const y = chartArea.bottom - targetHeight - padding;

                ctx.save();
                ctx.globalAlpha = 0.8; // Transparence
                ctx.drawImage(img, x, y, targetWidth, targetHeight);
                ctx.restore();
            }
        };
        Chart.register(logoPlugin);
    }

    // NOUVELLE MÉTHODE : Plugin pour les valeurs actuelles
    registerCurrentValuePlugin() {
        const currentValuePlugin = {
            id: 'currentValue',
            afterDraw: (chart) => {
                this.drawCurrentValue(chart);
            }
        };
        Chart.register(currentValuePlugin);
    }

    // NOUVELLE MÉTHODE : Dessiner les valeurs actuelles
    drawCurrentValue(chart) {
        const { ctx, chartArea, scales } = chart;
        const xScale = scales.x;
        const yScale = scales.y;

        if (!chartArea) return;

        ctx.save();

        // Déterminer le type de graphique et la valeur actuelle correspondante
        let currentValue = null;
        let color = '#1976d2';

        if (chart === this.stockChart) {
            currentValue = this.currentPrice;
            color = '#1976d2';
        } else if (chart === this.volumeChart) {
            currentValue = this.currentVolume;
            color = '#666666';
        } else if (chart === this.macdChart) {
            // Pour MACD, on affiche les trois valeurs
            this.drawMACDCurrentValues(chart);
            ctx.restore();
            return;
        } else if (chart === this.rsiChart) {
            currentValue = this.currentRSI;
            color = '#7B1FA2';
        } else if (chart === this.stockChart && this.showIchimoku && this.currentIchimoku) {
            // AJOUT: Afficher les valeurs Ichimoku
            this.drawIchimokuCurrentValues(chart);
            ctx.restore();
            return;
        } else if (chart === this.stockChart && this.showStochastic && this.currentStochastic) {
            // AJOUT: Afficher les valeurs Stochastic
            this.drawStochasticCurrentValues(chart);
            ctx.restore();
            return;
        } else if (chart === this.stockChart && this.showBollinger && this.currentBollinger) {
            // AJOUT: Afficher les valeurs Bollinger
            this.drawBollingerCurrentValues(chart);
            ctx.restore();
            return;
        }

        if (currentValue === null || currentValue === undefined) {
            ctx.restore();
            return;
        }

        // Position Y de la valeur actuelle
        const y = yScale.getPixelForValue(currentValue);

        // Dessiner la ligne horizontale pointillée
        ctx.beginPath();
        ctx.setLineDash([5, 3]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Dessiner le label de valeur actuelle SUR L'AXE DES PRIX
        const labelText = this.formatValue(currentValue, chart);
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const textWidth = ctx.measureText(labelText).width;
        const padding = 4;
        const labelHeight = 16;
        const borderRadius = 3;

        // Position du label SUR L'AXE (à droite du graphique)
        const labelX = chartArea.right + 5; // Juste à droite de l'axe
        const labelY = y - labelHeight / 2; // Centré sur la ligne

        // Background du label (style TradingView)
        ctx.fillStyle = color;
        this.roundRect(ctx, labelX, labelY, textWidth + padding * 2, labelHeight, borderRadius);
        ctx.fill();

        // Texte du label (blanc, centré)
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, labelX + (textWidth + padding * 2) / 2, labelY + labelHeight / 2);

        ctx.restore();
    }

    // AJOUT: NOUVELLE MÉTHODE - Dessiner les valeurs actuelles des Bandes de Bollinger
    drawBollingerCurrentValues(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!this.currentBollinger) return;

        ctx.save();

        const yScale = scales.y;

        // CHANGEMENT DES COULEURS :
        const values = [
            { label: 'BB Upper', value: this.currentBollinger.upper, color: '#8A2BE2' }, // Violet
            { label: 'BB Middle', value: this.currentBollinger.middle, color: '#FFA500' }, // Orange
            { label: 'BB Lower', value: this.currentBollinger.lower, color: '#8A2BE2' }, // Violet
            { label: '%B', value: this.currentBollinger.percentB, color: '#7B68EE' } // Violet clair
        ];

        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const padding = 4;
        const lineHeight = 16;
        const labelHeight = 14;
        const borderRadius = 2;

        const startX = chartArea.right + 5;
        let startY = chartArea.top + 10;

        values.forEach((item, index) => {
            let text = '';
            if (item.label === '%B') {
                text = `${item.label}: ${item.value !== null ? item.value.toFixed(1) + '%' : 'N/A'}`;
            } else {
                text = `${item.label}: ${item.value !== null ? item.value.toFixed(3) : 'N/A'}`;
            }

            const textWidth = ctx.measureText(text).width;
            const y = startY + (index * lineHeight);

            if (y + labelHeight > chartArea.bottom) return;

            ctx.fillStyle = item.color;
            this.roundRect(ctx, startX, y, textWidth + padding * 2, labelHeight, borderRadius);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, startX + (textWidth + padding * 2) / 2, y + labelHeight/2);
        });

        ctx.restore();
    }

    // AJOUT: NOUVELLE MÉTHODE - Dessiner les valeurs actuelles de l'Ichimoku
    drawIchimokuCurrentValues(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!this.currentIchimoku) return;

        ctx.save();

        const yScale = scales.y;
        const values = [
            { label: 'Tenkan', value: this.currentIchimoku.conversion, color: '#FF4444' },
            { label: 'Kijun', value: this.currentIchimoku.base, color: '#4444FF' },
            { label: 'Span A', value: this.currentIchimoku.leadingSpanA, color: '#44AA44' },
            { label: 'Span B', value: this.currentIchimoku.leadingSpanB, color: '#44AA44' },
            { label: 'Chikou', value: this.currentIchimoku.laggingSpan, color: '#44AA44' }
        ];

        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const padding = 4;
        const lineHeight = 16;
        const labelHeight = 14;
        const borderRadius = 2;

        const startX = chartArea.right + 5;
        let startY = chartArea.top + 10;

        values.forEach((item, index) => {
            const text = `${item.label}: ${item.value !== null ? item.value.toFixed(3) : 'N/A'}`;
            const textWidth = ctx.measureText(text).width;
            const y = startY + (index * lineHeight);

            if (y + labelHeight > chartArea.bottom) return;

            ctx.fillStyle = item.color;
            this.roundRect(ctx, startX, y, textWidth + padding * 2, labelHeight, borderRadius);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, startX + (textWidth + padding * 2) / 2, y + labelHeight/2);
        });

        ctx.restore();
    }

    // AJOUT: NOUVELLE MÉTHODE - Dessiner les valeurs actuelles du Stochastic
    drawStochasticCurrentValues(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!this.currentStochastic) return;

        ctx.save();

        const yScale = scales.y;
        const values = [
            { label: '%K', value: this.currentStochastic.k, color: '#FF6B6B' },
            { label: '%D', value: this.currentStochastic.d, color: '#4ECDC4' }
        ];

        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const padding = 4;
        const lineHeight = 16;
        const labelHeight = 14;
        const borderRadius = 2;

        const startX = chartArea.right + 5;
        let startY = chartArea.top + 10;

        values.forEach((item, index) => {
            const text = `${item.label}: ${item.value !== null ? item.value.toFixed(1) + '%' : 'N/A'}`;
            const textWidth = ctx.measureText(text).width;
            const y = startY + (index * lineHeight);

            if (y + labelHeight > chartArea.bottom) return;

            ctx.fillStyle = item.color;
            this.roundRect(ctx, startX, y, textWidth + padding * 2, labelHeight, borderRadius);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, startX + (textWidth + padding * 2) / 2, y + labelHeight/2);
        });

        ctx.restore();
    }

    // NOUVELLE MÉTHODE : Plugin pour le dessin de lignes
    registerDrawingPlugin() {
        const drawingPlugin = {
            id: 'drawing',
            afterDraw: (chart) => {
                this.drawLinesOnChart(chart);
            }
        };

        Chart.register(drawingPlugin);
    }

    registerCarthagoLogoPlugin() {
        const logoPlugin = {
            id: 'carthagoLogo',
            afterDraw: (chart) => {
                const { ctx, chartArea } = chart;
                if (!chartArea) return;
                if (!this.carthagoLogoImg) {
                    this.carthagoLogoImg = new window.Image();
                    // Changement du chemin de l'image
                    this.carthagoLogoImg.src = '/static/images/atlasviewgraph.png';
                    this.carthagoLogoImg.onload = () => chart.draw();
                }
                const img = this.carthagoLogoImg;
                if (!img.complete) return;

                // Dimensions originales de l'image
                const originalWidth = 500;
                const originalHeight = 110;

                // Ratio d'aspect de l'image
                const aspectRatio = originalWidth / originalHeight;

                // Dimensions souhaitées (plus petites mais proportionnelles)
                const targetHeight = 30; // Hauteur réduite
                const targetWidth = targetHeight * aspectRatio; // Largeur proportionnelle

                const padding = 12;
                const x = chartArea.left + padding;
                const y = chartArea.bottom - targetHeight - padding;

                ctx.save();
                ctx.globalAlpha = 0.8; // Transparence
                ctx.drawImage(img, x, y, targetWidth, targetHeight);
                ctx.restore();
            }
        };
        Chart.register(logoPlugin);
    }

    // NOUVELLE MÉTHODE : Plugin pour les valeurs actuelles
    registerCurrentValuePlugin() {
        const currentValuePlugin = {
            id: 'currentValue',
            afterDraw: (chart) => {
                this.drawCurrentValue(chart);
            }
        };
        Chart.register(currentValuePlugin);
    }

    // NOUVELLE MÉTHODE : Dessiner les valeurs actuelles
    drawCurrentValue(chart) {
        const { ctx, chartArea, scales } = chart;
        const xScale = scales.x;
        const yScale = scales.y;

        if (!chartArea) return;

        ctx.save();

        // Déterminer le type de graphique et la valeur actuelle correspondante
        let currentValue = null;
        let color = '#1976d2';

        if (chart === this.stockChart) {
            currentValue = this.currentPrice;
            color = '#1976d2';
        } else if (chart === this.volumeChart) {
            currentValue = this.currentVolume;
            color = '#666666';
        } else if (chart === this.macdChart) {
            // Pour MACD, on affiche les trois valeurs
            this.drawMACDCurrentValues(chart);
            ctx.restore();
            return;
        } else if (chart === this.rsiChart) {
            currentValue = this.currentRSI;
            color = '#7B1FA2';
        } else if (chart === this.stockChart && this.showIchimoku && this.currentIchimoku) {
            // AJOUT: Afficher les valeurs Ichimoku
            this.drawIchimokuCurrentValues(chart);
            ctx.restore();
            return;
        } else if (chart === this.stockChart && this.showStochastic && this.currentStochastic) {
            // AJOUT: Afficher les valeurs Stochastic
            this.drawStochasticCurrentValues(chart);
            ctx.restore();
            return;
        } else if (chart === this.stockChart && this.showBollinger && this.currentBollinger) {
            // AJOUT: Afficher les valeurs Bollinger
            this.drawBollingerCurrentValues(chart);
            ctx.restore();
            return;
        }

        if (currentValue === null || currentValue === undefined) {
            ctx.restore();
            return;
        }

        // Position Y de la valeur actuelle
        const y = yScale.getPixelForValue(currentValue);

        // Dessiner la ligne horizontale pointillée
        ctx.beginPath();
        ctx.setLineDash([5, 3]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Dessiner le label de valeur actuelle SUR L'AXE DES PRIX
        const labelText = this.formatValue(currentValue, chart);
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const textWidth = ctx.measureText(labelText).width;
        const padding = 4;
        const labelHeight = 16;
        const borderRadius = 3;

        // Position du label SUR L'AXE (à droite du graphique)
        const labelX = chartArea.right + 5; // Juste à droite de l'axe
        const labelY = y - labelHeight / 2; // Centré sur la ligne

        // Background du label (style TradingView)
        ctx.fillStyle = color;
        this.roundRect(ctx, labelX, labelY, textWidth + padding * 2, labelHeight, borderRadius);
        ctx.fill();

        // Texte du label (blanc, centré)
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, labelX + (textWidth + padding * 2) / 2, labelY + labelHeight / 2);

        ctx.restore();
    }

    // AJOUT: NOUVELLES MÉTHODES pour les indicateurs
    calculateIchimoku(high, low, close) {
        return this.technicalIndicators.calculateIchimoku(high, low, close);
    }

    calculateStochastic(high, low, close) {
        return this.technicalIndicators.calculateStochastic(high, low, close);
    }

    calculateWilliamsR(high, low, close) {
        return this.technicalIndicators.calculateWilliamsR(high, low, close);
    }

    // AJOUT: Dessiner les valeurs Ichimoku
    drawIchimokuCurrentValues(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!this.currentIchimoku) return;

        ctx.save();

        const yScale = scales.y;
        const values = [
            { label: 'Tenkan', value: this.currentIchimoku.conversion, color: '#FF4444' },
            { label: 'Kijun', value: this.currentIchimoku.base, color: '#4444FF' },
            { label: 'Span A', value: this.currentIchimoku.leadingSpanA, color: '#44AA44' },
            { label: 'Span B', value: this.currentIchimoku.leadingSpanB, color: '#44AA44' },
            { label: 'Chikou', value: this.currentIchimoku.laggingSpan, color: '#44AA44' }
        ];

        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const padding = 4;
        const lineHeight = 16;
        const labelHeight = 14;
        const borderRadius = 2;

        const startX = chartArea.right + 5;
        let startY = chartArea.top + 10;

        values.forEach((item, index) => {
            const text = `${item.label}: ${item.value !== null ? item.value.toFixed(3) : 'N/A'}`;
            const textWidth = ctx.measureText(text).width;
            const y = startY + (index * lineHeight);

            if (y + labelHeight > chartArea.bottom) return;

            ctx.fillStyle = item.color;
            this.roundRect(ctx, startX, y, textWidth + padding * 2, labelHeight, borderRadius);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, startX + (textWidth + padding * 2) / 2, y + labelHeight/2);
        });

        ctx.restore();
    }

    // AJOUT: Dessiner les valeurs Stochastic
    drawStochasticCurrentValues(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!this.currentStochastic) return;

        ctx.save();

        const yScale = scales.y;
        const values = [
            { label: '%K', value: this.currentStochastic.k, color: '#FF6B6B' },
            { label: '%D', value: this.currentStochastic.d, color: '#4ECDC4' }
        ];

        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const padding = 4;
        const lineHeight = 16;
        const labelHeight = 14;
        const borderRadius = 2;

        const startX = chartArea.right + 5;
        let startY = chartArea.top + 10;

        values.forEach((item, index) => {
            const text = `${item.label}: ${item.value !== null ? item.value.toFixed(1) + '%' : 'N/A'}`;
            const textWidth = ctx.measureText(text).width;
            const y = startY + (index * lineHeight);

            if (y + labelHeight > chartArea.bottom) return;

            ctx.fillStyle = item.color;
            this.roundRect(ctx, startX, y, textWidth + padding * 2, labelHeight, borderRadius);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, startX + (textWidth + padding * 2) / 2, y + labelHeight/2);
        });

        ctx.restore();
    }

    // AJOUT: NOUVELLE MÉTHODE - Dessiner les valeurs actuelles de l'Ichimoku
    drawIchimokuCurrentValues(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!this.currentIchimoku) return;

        ctx.save();

        const yScale = scales.y;
        const values = [
            { label: 'Tenkan', value: this.currentIchimoku.conversion, color: '#FF4444' },
            { label: 'Kijun', value: this.currentIchimoku.base, color: '#4444FF' },
            { label: 'Span A', value: this.currentIchimoku.leadingSpanA, color: '#44AA44' },
            { label: 'Span B', value: this.currentIchimoku.leadingSpanB, color: '#44AA44' },
            { label: 'Chikou', value: this.currentIchimoku.laggingSpan, color: '#44AA44' }
        ];

        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const padding = 4;
        const lineHeight = 16;
        const labelHeight = 14;
        const borderRadius = 2;

        const startX = chartArea.right + 5;
        let startY = chartArea.top + 10;

        values.forEach((item, index) => {
            const text = `${item.label}: ${item.value !== null ? item.value.toFixed(3) : 'N/A'}`;
            const textWidth = ctx.measureText(text).width;
            const y = startY + (index * lineHeight);

            if (y + labelHeight > chartArea.bottom) return;

            ctx.fillStyle = item.color;
            this.roundRect(ctx, startX, y, textWidth + padding * 2, labelHeight, borderRadius);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, startX + (textWidth + padding * 2) / 2, y + labelHeight/2);
        });

        ctx.restore();
    }

    // AJOUT: NOUVELLE MÉTHODE - Dessiner les valeurs actuelles du Stochastic
    drawStochasticCurrentValues(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!this.currentStochastic) return;

        ctx.save();

        const yScale = scales.y;
        const values = [
            { label: '%K', value: this.currentStochastic.k, color: '#FF6B6B' },
            { label: '%D', value: this.currentStochastic.d, color: '#4ECDC4' }
        ];

        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const padding = 4;
        const lineHeight = 16;
        const labelHeight = 14;
        const borderRadius = 2;

        const startX = chartArea.right + 5;
        let startY = chartArea.top + 10;

        values.forEach((item, index) => {
            const text = `${item.label}: ${item.value !== null ? item.value.toFixed(1) + '%' : 'N/A'}`;
            const textWidth = ctx.measureText(text).width;
            const y = startY + (index * lineHeight);

            if (y + labelHeight > chartArea.bottom) return;

            ctx.fillStyle = item.color;
            this.roundRect(ctx, startX, y, textWidth + padding * 2, labelHeight, borderRadius);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, startX + (textWidth + padding * 2) / 2, y + labelHeight/2);
        });

        ctx.restore();
    }

    // NOUVELLE MÉTHODE : Plugin pour le dessin de lignes
    registerDrawingPlugin() {
        const drawingPlugin = {
            id: 'drawing',
            afterDraw: (chart) => {
                this.drawLinesOnChart(chart);
            }
        };

        Chart.register(drawingPlugin);
    }

    registerCarthagoLogoPlugin() {
        const logoPlugin = {
            id: 'carthagoLogo',
            afterDraw: (chart) => {
                const { ctx, chartArea } = chart;
                if (!chartArea) return;
                if (!this.carthagoLogoImg) {
                    this.carthagoLogoImg = new window.Image();
                    // Changement du chemin de l'image
                    this.carthagoLogoImg.src = '/static/images/atlasviewgraph.png';
                    this.carthagoLogoImg.onload = () => chart.draw();
                }
                const img = this.carthagoLogoImg;
                if (!img.complete) return;

                // Dimensions originales de l'image
                const originalWidth = 500;
                const originalHeight = 110;

                // Ratio d'aspect de l'image
                const aspectRatio = originalWidth / originalHeight;

                // Dimensions souhaitées (plus petites mais proportionnelles)
                const targetHeight = 30; // Hauteur réduite
                const targetWidth = targetHeight * aspectRatio; // Largeur proportionnelle

                const padding = 12;
                const x = chartArea.left + padding;
                const y = chartArea.bottom - targetHeight - padding;

                ctx.save();
                ctx.globalAlpha = 0.8; // Transparence
                ctx.drawImage(img, x, y, targetWidth, targetHeight);
                ctx.restore();
            }
        };
        Chart.register(logoPlugin);
    }

    // NOUVELLE MÉTHODE : Plugin pour les valeurs actuelles
    registerCurrentValuePlugin() {
        const currentValuePlugin = {
            id: 'currentValue',
            afterDraw: (chart) => {
                this.drawCurrentValue(chart);
            }
        };
        Chart.register(currentValuePlugin);
    }

    // NOUVELLE MÉTHODE : Dessiner les valeurs actuelles
    drawCurrentValue(chart) {
        const { ctx, chartArea, scales } = chart;
        const xScale = scales.x;
        const yScale = scales.y;

        if (!chartArea) return;

        ctx.save();

        // Déterminer le type de graphique et la valeur actuelle correspondante
        let currentValue = null;
        let color = '#1976d2';

        if (chart === this.stockChart) {
            currentValue = this.currentPrice;
            color = '#1976d2';
        } else if (chart === this.volumeChart) {
            currentValue = this.currentVolume;
            color = '#666666';
        } else if (chart === this.macdChart) {
            // Pour MACD, on affiche les trois valeurs
            this.drawMACDCurrentValues(chart);
            ctx.restore();
            return;
        } else if (chart === this.rsiChart) {
            currentValue = this.currentRSI;
            color = '#7B1FA2';
        } else if (chart === this.stockChart && this.showIchimoku && this.currentIchimoku) {
            // AJOUT: Afficher les valeurs Ichimoku
            this.drawIchimokuCurrentValues(chart);
            ctx.restore();
            return;
        } else if (chart === this.stockChart && this.showStochastic && this.currentStochastic) {
            // AJOUT: Afficher les valeurs Stochastic
            this.drawStochasticCurrentValues(chart);
            ctx.restore();
            return;
        } else if (chart === this.stockChart && this.showBollinger && this.currentBollinger) {
            // AJOUT: Afficher les valeurs Bollinger
            this.drawBollingerCurrentValues(chart);
            ctx.restore();
            return;
        }

        if (currentValue === null || currentValue === undefined) {
            ctx.restore();
            return;
        }

        // Position Y de la valeur actuelle
        const y = yScale.getPixelForValue(currentValue);

        // Dessiner la ligne horizontale pointillée
        ctx.beginPath();
        ctx.setLineDash([5, 3]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Dessiner le label de valeur actuelle SUR L'AXE DES PRIX
        const labelText = this.formatValue(currentValue, chart);
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const textWidth = ctx.measureText(labelText).width;
        const padding = 4;
        const labelHeight = 16;
        const borderRadius = 3;

        // Position du label SUR L'AXE (à droite du graphique)
        const labelX = chartArea.right + 5; // Juste à droite de l'axe
        const labelY = y - labelHeight / 2; // Centré sur la ligne

        // Background du label (style TradingView)
        ctx.fillStyle = color;
        this.roundRect(ctx, labelX, labelY, textWidth + padding * 2, labelHeight, borderRadius);
        ctx.fill();

        // Texte du label (blanc, centré)
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, labelX + (textWidth + padding * 2) / 2, labelY + labelHeight / 2);

        ctx.restore();
    }

    // AJOUT: NOUVELLES MÉTHODES pour les indicateurs
    calculateIchimoku(high, low, close) {
        return this.technicalIndicators.calculateIchimoku(high, low, close);
    }

    calculateStochastic(high, low, close) {
        return this.technicalIndicators.calculateStochastic(high, low, close);
    }

    calculateWilliamsR(high, low, close) {
        return this.technicalIndicators.calculateWilliamsR(high, low, close);
    }

    // AJOUT: Dessiner les valeurs Ichimoku
    drawIchimokuCurrentValues(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!this.currentIchimoku) return;

        ctx.save();

        const yScale = scales.y;
        const values = [
            { label: 'Tenkan', value: this.currentIchimoku.conversion, color: '#FF4444' },
            { label: 'Kijun', value: this.currentIchimoku.base, color: '#4444FF' },
            { label: 'Span A', value: this.currentIchimoku.leadingSpanA, color: '#44AA44' },
            { label: 'Span B', value: this.currentIchimoku.leadingSpanB, color: '#44AA44' },
            { label: 'Chikou', value: this.currentIchimoku.laggingSpan, color: '#44AA44' }
        ];

        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const padding = 4;
        const lineHeight = 16;
        const labelHeight = 14;
        const borderRadius = 2;

        const startX = chartArea.right + 5;
        let startY = chartArea.top + 10;

        values.forEach((item, index) => {
            const text = `${item.label}: ${item.value !== null ? item.value.toFixed(3) : 'N/A'}`;
            const textWidth = ctx.measureText(text).width;
            const y = startY + (index * lineHeight);

            if (y + labelHeight > chartArea.bottom) return;

            ctx.fillStyle = item.color;
            this.roundRect(ctx, startX, y, textWidth + padding * 2, labelHeight, borderRadius);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, startX + (textWidth + padding * 2) / 2, y + labelHeight/2);
        });

        ctx.restore();
    }

    // AJOUT: Dessiner les valeurs Stochastic
    drawStochasticCurrentValues(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!this.currentStochastic) return;

        ctx.save();

        const yScale = scales.y;
        const values = [
            { label: '%K', value: this.currentStochastic.k, color: '#FF6B6B' },
            { label: '%D', value: this.currentStochastic.d, color: '#4ECDC4' }
        ];

        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const padding = 4;
        const lineHeight = 16;
        const labelHeight = 14;
        const borderRadius = 2;

        const startX = chartArea.right + 5;
        let startY = chartArea.top + 10;

        values.forEach((item, index) => {
            const text = `${item.label}: ${item.value !== null ? item.value.toFixed(1) + '%' : 'N/A'}`;
            const textWidth = ctx.measureText(text).width;
            const y = startY + (index * lineHeight);

            if (y + labelHeight > chartArea.bottom) return;

            ctx.fillStyle = item.color;
            this.roundRect(ctx, startX, y, textWidth + padding * 2, labelHeight, borderRadius);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, startX + (textWidth + padding * 2) / 2, y + labelHeight/2);
        });

        ctx.restore();
    }

    // NOUVELLE MÉTHODE : Plugin pour le dessin de lignes
    registerDrawingPlugin() {
        const drawingPlugin = {
            id: 'drawing',
            afterDraw: (chart) => {
                this.drawLinesOnChart(chart);
            }
        };

        Chart.register(drawingPlugin);
    }

    registerCarthagoLogoPlugin() {
        const logoPlugin = {
            id: 'carthagoLogo',
            afterDraw: (chart) => {
                const { ctx, chartArea } = chart;
                if (!chartArea) return;
                if (!this.carthagoLogoImg) {
                    this.carthagoLogoImg = new window.Image();
                    // Changement du chemin de l'image
                    this.carthagoLogoImg.src = '/static/images/atlasviewgraph.png';
                    this.carthagoLogoImg.onload = () => chart.draw();
                }
                const img = this.carthagoLogoImg;
                if (!img.complete) return;

                // Dimensions originales de l'image
                const originalWidth = 500;
                const originalHeight = 110;

                // Ratio d'aspect de l'image
                const aspectRatio = originalWidth / originalHeight;

                // Dimensions souhaitées (plus petites mais proportionnelles)
                const targetHeight = 30; // Hauteur réduite
                const targetWidth = targetHeight * aspectRatio; // Largeur proportionnelle

                const padding = 12;
                const x = chartArea.left + padding;
                const y = chartArea.bottom - targetHeight - padding;

                ctx.save();
                ctx.globalAlpha = 0.8; // Transparence
                ctx.drawImage(img, x, y, targetWidth, targetHeight);
                ctx.restore();
            }
        };
        Chart.register(logoPlugin);
    }

    // NOUVELLE MÉTHODE : Plugin pour les valeurs actuelles
    registerCurrentValuePlugin() {
        const currentValuePlugin = {
            id: 'currentValue',
            afterDraw: (chart) => {
                this.drawCurrentValue(chart);
            }
        };
        Chart.register(currentValuePlugin);
    }

    // NOUVELLE MÉTHODE : Dessiner les valeurs actuelles
    drawCurrentValue(chart) {
        const { ctx, chartArea, scales } = chart;
        const xScale = scales.x;
        const yScale = scales.y;

        if (!chartArea) return;

        ctx.save();

        // Déterminer le type de graphique et la valeur actuelle correspondante
        let currentValue = null;
        let color = '#1976d2';

        if (chart === this.stockChart) {
            currentValue = this.currentPrice;
            color = '#1976d2';
        } else if (chart === this.volumeChart) {
            currentValue = this.currentVolume;
            color = '#666666';
        } else if (chart === this.macdChart) {
            // Pour MACD, on affiche les trois valeurs
            this.drawMACDCurrentValues(chart);
            ctx.restore();
            return;
        } else if (chart === this.rsiChart) {
            currentValue = this.currentRSI;
            color = '#7B1FA2';
        } else if (chart === this.stockChart && this.showIchimoku && this.currentIchimoku) {
            // AJOUT: Afficher les valeurs Ichimoku
            this.drawIchimokuCurrentValues(chart);
            ctx.restore();
            return;
        } else if (chart === this.stockChart && this.showStochastic && this.currentStochastic) {
            // AJOUT: Afficher les valeurs Stochastic
            this.drawStochasticCurrentValues(chart);
            ctx.restore();
            return;
        } else if (chart === this.stockChart && this.showBollinger && this.currentBollinger) {
            // AJOUT: Afficher les valeurs Bollinger
            this.drawBollingerCurrentValues(chart);
            ctx.restore();
            return;
        }

        if (currentValue === null || currentValue === undefined) {
            ctx.restore();
            return;
        }

        // Position Y de la valeur actuelle
        const y = yScale.getPixelForValue(currentValue);

        // Dessiner la ligne horizontale pointillée
        ctx.beginPath();
        ctx.setLineDash([5, 3]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Dessiner le label de valeur actuelle SUR L'AXE DES PRIX
        const labelText = this.formatValue(currentValue, chart);
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const textWidth = ctx.measureText(labelText).width;
        const padding = 4;
        const labelHeight = 16;
        const borderRadius = 3;

        // Position du label SUR L'AXE (à droite du graphique)
        const labelX = chartArea.right + 5; // Juste à droite de l'axe
        const labelY = y - labelHeight / 2; // Centré sur la ligne

        // Background du label (style TradingView)
        ctx.fillStyle = color;
        this.roundRect(ctx, labelX, labelY, textWidth + padding * 2, labelHeight, borderRadius);
        ctx.fill();

        // Texte du label (blanc, centré)
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, labelX + (textWidth + padding * 2) / 2, labelY + labelHeight / 2);

        ctx.restore();
    }

    // AJOUT: NOUVELLES MÉTHODES pour les indicateurs
    calculateIchimoku(high, low, close) {
        return this.technicalIndicators.calculateIchimoku(high, low, close);
    }

    calculateStochastic(high, low, close) {
        return this.technicalIndicators.calculateStochastic(high, low, close);
    }

    calculateWilliamsR(high, low, close) {
        return this.technicalIndicators.calculateWilliamsR(high, low, close);
    }

    // AJOUT: Dessiner les valeurs Ichimoku
    drawIchimokuCurrentValues(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!this.currentIchimoku) return;

        ctx.save();

        const yScale = scales.y;
        const values = [
            { label: 'Tenkan', value: this.currentIchimoku.conversion, color: '#FF4444' },
            { label: 'Kijun', value: this.currentIchimoku.base, color: '#4444FF' },
            { label: 'Span A', value: this.currentIchimoku.leadingSpanA, color: '#44AA44' },
            { label: 'Span B', value: this.currentIchimoku.leadingSpanB, color: '#44AA44' },
            { label: 'Chikou', value: this.currentIchimoku.laggingSpan, color: '#44AA44' }
        ];

        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const padding = 4;
        const lineHeight = 16;
        const labelHeight = 14;
        const borderRadius = 2;

        const startX = chartArea.right + 5;
        let startY = chartArea.top + 10;

        values.forEach((item, index) => {
            const text = `${item.label}: ${item.value !== null ? item.value.toFixed(3) : 'N/A'}`;
            const textWidth = ctx.measureText(text).width;
            const y = startY + (index * lineHeight);

            if (y + labelHeight > chartArea.bottom) return;

            ctx.fillStyle = item.color;
            this.roundRect(ctx, startX, y, textWidth + padding * 2, labelHeight, borderRadius);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, startX + (textWidth + padding * 2) / 2, y + labelHeight/2);
        });

        ctx.restore();
    }

    // AJOUT: Dessiner les valeurs Stochastic
    drawStochasticCurrentValues(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!this.currentStochastic) return;

        ctx.save();

        const yScale = scales.y;
        const values = [
            { label: '%K', value: this.currentStochastic.k, color: '#FF6B6B' },
            { label: '%D', value: this.currentStochastic.d, color: '#4ECDC4' }
        ];

        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const padding = 4;
        const lineHeight = 16;
        const labelHeight = 14;
        const borderRadius = 2;

        const startX = chartArea.right + 5;
        let startY = chartArea.top + 10;

        values.forEach((item, index) => {
            const text = `${item.label}: ${item.value !== null ? item.value.toFixed(1) + '%' : 'N/A'}`;
            const textWidth = ctx.measureText(text).width;
            const y = startY + (index * lineHeight);

            if (y + labelHeight > chartArea.bottom) return;

            ctx.fillStyle = item.color;
            this.roundRect(ctx, startX, y, textWidth + padding * 2, labelHeight, borderRadius);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, startX + (textWidth + padding * 2) / 2, y + labelHeight/2);
        });

        ctx.restore();
    }

    // NOUVELLE MÉTHODE : Plugin pour le dessin de lignes
    registerDrawingPlugin() {
        const drawingPlugin = {
            id: 'drawing',
            afterDraw: (chart) => {
                this.drawLinesOnChart(chart);
            }
        };

        Chart.register(drawingPlugin);
    }

    registerCarthagoLogoPlugin() {
        const logoPlugin = {
            id: 'carthagoLogo',
            afterDraw: (chart) => {
                const { ctx, chartArea } = chart;
                if (!chartArea) return;
                if (!this.carthagoLogoImg) {
                    this.carthagoLogoImg = new window.Image();
                    // Changement du chemin de l'image
                    this.carthagoLogoImg.src = '/static/images/atlasviewgraph.png';
                    this.carthagoLogoImg.onload = () => chart.draw();
                }
                const img = this.carthagoLogoImg;
                if (!img.complete) return;

                // Dimensions originales de l'image
                const originalWidth = 500;
                const originalHeight = 110;

                // Ratio d'aspect de l'image
                const aspectRatio = originalWidth / originalHeight;

                // Dimensions souhaitées (plus petites mais proportionnelles)
                const targetHeight = 30; // Hauteur réduite
                const targetWidth = targetHeight * aspectRatio; // Largeur proportionnelle

                const padding = 12;
                const x = chartArea.left + padding;
                const y = chartArea.bottom - targetHeight - padding;

                ctx.save();
                ctx.globalAlpha = 0.8; // Transparence
                ctx.drawImage(img, x, y, targetWidth, targetHeight);
                ctx.restore();
            }
        };
        Chart.register(logoPlugin);
    }

    // NOUVELLE MÉTHODE : Plugin pour les valeurs actuelles
    registerCurrentValuePlugin() {
        const currentValuePlugin = {
            id: 'currentValue',
            afterDraw: (chart) => {
                this.drawCurrentValue(chart);
            }
        };
        Chart.register(currentValuePlugin);
    }

    // NOUVELLE MÉTHODE : Dessiner les valeurs actuelles
    drawCurrentValue(chart) {
        const { ctx, chartArea, scales } = chart;
        const xScale = scales.x;
        const yScale = scales.y;

        if (!chartArea) return;

        ctx.save();

        // Déterminer le type de graphique et la valeur actuelle correspondante
        let currentValue = null;
        let color = '#1976d2';

        if (chart === this.stockChart) {
            currentValue = this.currentPrice;
            color = '#1976d2';
        } else if (chart === this.volumeChart) {
            currentValue = this.currentVolume;
            color = '#666666';
        } else if (chart === this.macdChart) {
            // Pour MACD, on affiche les trois valeurs
            this.drawMACDCurrentValues(chart);
            ctx.restore();
            return;
        } else if (chart === this.rsiChart) {
            currentValue = this.currentRSI;
            color = '#7B1FA2';
        } else if (chart === this.stockChart && this.showIchimoku && this.currentIchimoku) {
            // AJOUT: Afficher les valeurs Ichimoku
            this.drawIchimokuCurrentValues(chart);
            ctx.restore();
            return;
        } else if (chart === this.stockChart && this.showStochastic && this.currentStochastic) {
            // AJOUT: Afficher les valeurs Stochastic
            this.drawStochasticCurrentValues(chart);
            ctx.restore();
            return;
        } else if (chart === this.stockChart && this.showBollinger && this.currentBollinger) {
            // AJOUT: Afficher les valeurs Bollinger
            this.drawBollingerCurrentValues(chart);
            ctx.restore();
            return;
        }

        if (currentValue === null || currentValue === undefined) {
            ctx.restore();
            return;
        }

        // Position Y de la valeur actuelle
        const y = yScale.getPixelForValue(currentValue);

        // Dessiner la ligne horizontale pointillée
        ctx.beginPath();
        ctx.setLineDash([5, 3]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Dessiner le label de valeur actuelle SUR L'AXE DES PRIX
        const labelText = this.formatValue(currentValue, chart);
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const textWidth = ctx.measureText(labelText).width;
        const padding = 4;
        const labelHeight = 16;
        const borderRadius = 3;

        // Position du label SUR L'AXE (à droite du graphique)
        const labelX = chartArea.right + 5; // Juste à droite de l'axe
        const labelY = y - labelHeight / 2; // Centré sur la ligne

        // Background du label (style TradingView)
        ctx.fillStyle = color;
        this.roundRect(ctx, labelX, labelY, textWidth + padding * 2, labelHeight, borderRadius);
        ctx.fill();

        // Texte du label (blanc, centré)
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, labelX + (textWidth + padding * 2) / 2, labelY + labelHeight / 2);

        ctx.restore();
    }

    // AJOUT: NOUVELLES MÉTHODES pour les indicateurs
    calculateIchimoku(high, low, close) {
        return this.technicalIndicators.calculateIchimoku(high, low, close);
    }

    calculateStochastic(high, low, close) {
        return this.technicalIndicators.calculateStochastic(high, low, close);
    }

    calculateWilliamsR(high, low, close) {
        return this.technicalIndicators.calculateWilliamsR(high, low, close);
    }

    // AJOUT: Dessiner les valeurs Ichimoku
    drawIchimokuCurrentValues(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!this.currentIchimoku) return;

        ctx.save();

        const yScale = scales.y;
        const values = [
            { label: 'Tenkan', value: this.currentIchimoku.conversion, color: '#FF4444' },
            { label: 'Kijun', value: this.currentIchimoku.base, color: '#4444FF' },
            { label: 'Span A', value: this.currentIchimoku.leadingSpanA, color: '#44AA44' },
            { label: 'Span B', value: this.currentIchimoku.leadingSpanB, color: '#44AA44' },
            { label: 'Chikou', value: this.currentIchimoku.laggingSpan, color: '#44AA44' }
        ];

        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const padding = 4;
        const lineHeight = 16;
        const labelHeight = 14;
        const borderRadius = 2;

        const startX = chartArea.right + 5;
        let startY = chartArea.top + 10;

        values.forEach((item, index) => {
            const text = `${item.label}: ${item.value !== null ? item.value.toFixed(3) : 'N/A'}`;
            const textWidth = ctx.measureText(text).width;
            const y = startY + (index * lineHeight);

            if (y + labelHeight > chartArea.bottom) return;

            ctx.fillStyle = item.color;
            this.roundRect(ctx, startX, y, textWidth + padding * 2, labelHeight, borderRadius);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, startX + (textWidth + padding * 2) / 2, y + labelHeight/2);
        });

        ctx.restore();
    }

    // AJOUT: Dessiner les valeurs Stochastic
    drawStochasticCurrentValues(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!this.currentStochastic) return;

        ctx.save();

        const yScale = scales.y;
        const values = [
            { label: '%K', value: this.currentStochastic.k, color: '#FF6B6B' },
            { label: '%D', value: this.currentStochastic.d, color: '#4ECDC4' }
        ];

        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const padding = 4;
        const lineHeight = 16;
        const labelHeight = 14;
        const borderRadius = 2;

        const startX = chartArea.right + 5;
        let startY = chartArea.top + 10;

        values.forEach((item, index) => {
            const text = `${item.label}: ${item.value !== null ? item.value.toFixed(1) + '%' : 'N/A'}`;
            const textWidth = ctx.measureText(text).width;
            const y = startY + (index * lineHeight);

            if (y + labelHeight > chartArea.bottom) return;

            ctx.fillStyle = item.color;
            this.roundRect(ctx, startX, y, textWidth + padding * 2, labelHeight, borderRadius);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, startX + (textWidth + padding * 2) / 2, y + labelHeight/2);
        });

        ctx.restore();
    }

    registerChartPlugins() {
        // Enregistrer le plugin financier si disponible
        if (typeof FinancialController !== 'undefined') {
            Chart.register(FinancialController, CandlestickElement, OhlcElement);
        }

        // Enregistrer le plugin zoom si disponible
        if (typeof ChartZoom !== 'undefined') {
            Chart.register(ChartZoom);
        }

        // Enregistrer le plugin personnalisé pour le curseur de repère
        this.registerCrosshairPlugin();

        // Enregistrer le plugin pour le dessin de lignes
        this.registerDrawingPlugin();

        // Enregistrer le plugin pour le logo Carthago
        this.registerCarthagoLogoPlugin();

        // Enregistrer le plugin pour les valeurs actuelles
        this.registerCurrentValuePlugin();

        // AJOUT: Enregistrer le plugin Ichimoku
        if (typeof IchimokuPlugin !== 'undefined') {
            Chart.register(IchimokuPlugin);
        }

        // AJOUT: Enregistrer le plugin Bollinger Bands
        if (typeof BollingerBandsPlugin !== 'undefined') {
            Chart.register(BollingerBandsPlugin);
        }
    }

    registerCrosshairPlugin() {
        const crosshairPlugin = {
            id: 'crosshair',
            afterDraw: (chart) => {
                const { ctx } = chart;
                const { x, y, visible } = this.crosshair;

                if (!visible || x === null || y === null) return;

                const xAxis = chart.scales.x;
                const yAxis = chart.scales.y;

                // Vérifier si les coordonnées sont dans la zone du graphique
                if (x < xAxis.left || x > xAxis.right || y < yAxis.top || y > yAxis.bottom) return;

                // Dessiner la ligne verticale
                ctx.save();
                ctx.beginPath();
                ctx.setLineDash([5, 3]);
                ctx.strokeStyle = 'rgba(76, 175, 80, 0.8)';
                ctx.lineWidth = 1;
                ctx.moveTo(x, yAxis.top);
                ctx.lineTo(x, yAxis.bottom);
                ctx.stroke();

                // Dessiner la ligne horizontale
                ctx.beginPath();
                ctx.setLineDash([5, 3]);
                ctx.strokeStyle = 'rgba(76, 175, 80, 0.8)';
                ctx.lineWidth = 1;
                ctx.moveTo(xAxis.left, y);
                ctx.lineTo(xAxis.right, y);
                ctx.stroke();
                ctx.restore();

                // Dessiner les labels
                this.drawCrosshairLabels(chart, x, y);
            }
        };

        Chart.register(crosshairPlugin);
    }

    // MÉTHODE : Plugin pour le dessin de lignes
    registerDrawingPlugin() {
        const drawingPlugin = {
            id: 'drawing',
            afterDraw: (chart) => {
                this.drawLinesOnChart(chart);
            }
        };

        Chart.register(drawingPlugin);
    }

    registerCarthagoLogoPlugin() {
        const logoPlugin = {
            id: 'carthagoLogo',
            afterDraw: (chart) => {
                const { ctx, chartArea } = chart;
                if (!chartArea) return;
                if (!this.carthagoLogoImg) {
                    this.carthagoLogoImg = new window.Image();
                    // Changement du chemin de l'image
                    this.carthagoLogoImg.src = '/static/images/atlasviewgraph.png';
                    this.carthagoLogoImg.onload = () => chart.draw();
                }
                const img = this.carthagoLogoImg;
                if (!img.complete) return;

                // Dimensions originales de l'image
                const originalWidth = 500;
                const originalHeight = 110;

                // Ratio d'aspect de l'image
                const aspectRatio = originalWidth / originalHeight;

                // Dimensions souhaitées (plus petites mais proportionnelles)
                const targetHeight = 30; // Hauteur réduite
                const targetWidth = targetHeight * aspectRatio; // Largeur proportionnelle

                const padding = 12;
                const x = chartArea.left + padding;
                const y = chartArea.bottom - targetHeight - padding;

                ctx.save();
                ctx.globalAlpha = 0.8; // Transparence
                ctx.drawImage(img, x, y, targetWidth, targetHeight);
                ctx.restore();
            }
        };
        Chart.register(logoPlugin);
    }

    // NOUVELLE MÉTHODE : Plugin pour les valeurs actuelles
    registerCurrentValuePlugin() {
        const currentValuePlugin = {
            id: 'currentValue',
            afterDraw: (chart) => {
                this.drawCurrentValue(chart);
            }
        };
        Chart.register(currentValuePlugin);
    }

    // NOUVELLE MÉTHODE : Dessiner les valeurs actuelles
    drawCurrentValue(chart) {
        const { ctx, chartArea, scales } = chart;
        const xScale = scales.x;
        const yScale = scales.y;

        if (!chartArea) return;

        ctx.save();

        // Déterminer le type de graphique et la valeur actuelle correspondante
        let currentValue = null;
        let color = '#1976d2';

        if (chart === this.stockChart) {
            currentValue = this.currentPrice;
            color = '#1976d2';
        } else if (chart === this.volumeChart) {
            currentValue = this.currentVolume;
            color = '#666666';
        } else if (chart === this.macdChart) {
            // Pour MACD, on affiche les trois valeurs
            this.drawMACDCurrentValues(chart);
            ctx.restore();
            return;
        } else if (chart === this.rsiChart) {
            currentValue = this.currentRSI;
            color = '#7B1FA2';
        } else if (chart === this.stockChart && this.showIchimoku && this.currentIchimoku) {
            // AJOUT: Afficher les valeurs Ichimoku
            this.drawIchimokuCurrentValues(chart);
            ctx.restore();
            return;
        } else if (chart === this.stockChart && this.showStochastic && this.currentStochastic) {
            // AJOUT: Afficher les valeurs Stochastic
            this.drawStochasticCurrentValues(chart);
            ctx.restore();
            return;
        } else if (chart === this.stockChart && this.showBollinger && this.currentBollinger) {
            // AJOUT: Afficher les valeurs Bollinger
            this.drawBollingerCurrentValues(chart);
            ctx.restore();
            return;
        }

        if (currentValue === null || currentValue === undefined) {
            ctx.restore();
            return;
        }

        // Position Y de la valeur actuelle
        const y = yScale.getPixelForValue(currentValue);

        // Dessiner la ligne horizontale pointillée
        ctx.beginPath();
        ctx.setLineDash([5, 3]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Dessiner le label de valeur actuelle SUR L'AXE DES PRIX
        const labelText = this.formatValue(currentValue, chart);
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const textWidth = ctx.measureText(labelText).width;
        const padding = 4;
        const labelHeight = 16;
        const borderRadius = 3;

        // Position du label SUR L'AXE (à droite du graphique)
        const labelX = chartArea.right + 5; // Juste à droite de l'axe
        const labelY = y - labelHeight / 2; // Centré sur la ligne

        // Background du label (style TradingView)
        ctx.fillStyle = color;
        this.roundRect(ctx, labelX, labelY, textWidth + padding * 2, labelHeight, borderRadius);
        ctx.fill();

        // Texte du label (blanc, centré)
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, labelX + (textWidth + padding * 2) / 2, labelY + labelHeight / 2);

        ctx.restore();
    }

    // NOUVELLE MÉTHODE : Dessiner les valeurs actuelles du MACD
    drawMACDCurrentValues(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!this.currentMACD || !this.currentSignal || !this.currentHistogram) return;

        ctx.save();

        const yScale = scales.y;
        const values = [
            { label: 'MACD', value: this.currentMACD, color: '#2962FF' },
            { label: 'Signal', value: this.currentSignal, color: '#FF6D00' },
            { label: 'Hist', value: this.currentHistogram, color: this.currentHistogram >= 0 ? '#4CAF50' : '#F44336' }
        ];

        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const padding = 4;
        const lineHeight = 16;
        const labelHeight = 14;
        const borderRadius = 2;

        // Position SUR L'AXE (à droite du graphique)
        const startX = chartArea.right + 5;
        let startY = chartArea.top + 10;

        // Dessiner les labels avec fond SUR L'AXE
        values.forEach((item, index) => {
            const text = `${item.label}: ${item.value.toFixed(4)}`;
            const textWidth = ctx.measureText(text).width;
            const y = startY + (index * lineHeight);

            // Vérifier que le label reste dans les limites verticales
            if (y + labelHeight > chartArea.bottom) return;

            // Background du label
            ctx.fillStyle = item.color;
            this.roundRect(ctx, startX, y, textWidth + padding * 2, labelHeight, borderRadius);
            ctx.fill();

            // Texte du label
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, startX + (textWidth + padding * 2) / 2, y + labelHeight/2);
        });

        ctx.restore();
    }

    // NOUVELLE MÉTHODE : Formater les valeurs selon le type de graphique
    formatValue(value, chart) {
        if (chart === this.stockChart) {
            return `${value.toFixed(3)}`;
        } else if (chart === this.volumeChart) {
            if (value >= 1000000) {
                return `${(value / 1000000).toFixed(1)}M`;
            } else if (value >= 1000) {
                return `${(value / 1000).toFixed(1)}K`;
            }
            return value.toLocaleString('fr-FR');
        } else if (chart === this.rsiChart) {
            return `${value.toFixed(2)}`;
        }
        return value.toFixed(4);
    }

    drawCrosshairLabels(chart, x, y) {
        const { ctx } = chart;
        const xAxis = chart.scales.x;
        const yAxis = chart.scales.y;

        // Récupérer la valeur X (date)
        const xValue = xAxis.getValueForPixel(x);
        const date = new Date(xValue);
        const dateLabel = date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }) + ' ' + date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // Récupérer la valeur Y (prix)
        const yValue = yAxis.getValueForPixel(y);
        const priceLabel = yValue !== null && yValue !== undefined && !isNaN(yValue) ?
            yValue.toFixed(3) + ' TND' : 'N/A';

        ctx.save();

        // Style des labels
        const labelPadding = 6;
        const labelHeight = 20;
        const borderRadius = 4;

        // Label de date (en bas)
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const dateLabelWidth = ctx.measureText(dateLabel).width + labelPadding * 2;
        let dateLabelX = x - dateLabelWidth / 2;

        // Ajuster la position pour rester dans les limites
        dateLabelX = Math.max(xAxis.left + 5, Math.min(dateLabelX, xAxis.right - dateLabelWidth - 5));
        const dateLabelY = yAxis.bottom - labelHeight - 5;

        // Background du label date
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.roundRect(ctx, dateLabelX, dateLabelY, dateLabelWidth, labelHeight, borderRadius);
        ctx.fill();

        // Texte date
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dateLabel, dateLabelX + dateLabelWidth / 2, dateLabelY + labelHeight / 2);

        // Label de prix (à DROITE maintenant)
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const priceLabelWidth = ctx.measureText(priceLabel).width + labelPadding * 2;
        const priceLabelX = xAxis.right - priceLabelWidth - 5; // À droite maintenant
        let priceLabelY = y - labelHeight / 2;

        // Ajuster la position verticale pour rester dans les limites
        priceLabelY = Math.max(yAxis.top + 5, Math.min(priceLabelY, yAxis.bottom - labelHeight - 5));

        // Background du label prix
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.roundRect(ctx, priceLabelX, priceLabelY, priceLabelWidth, labelHeight, borderRadius);
        ctx.fill();

        // Texte prix
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(priceLabel, priceLabelX + labelPadding, priceLabelY + labelHeight / 2);

        ctx.restore();
    }

    // Helper pour dessiner des rectangles arrondis
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    // MÉTHODE : Configuration des écouteurs pour le crosshair et le dessin (CORRIGÉE)
    setupCrosshairListeners(canvas, chart) {
        let isPanning = false;
        let lastPanX = null;

        // Déterminer si c'est le graphique principal
        const isMainChart = (chart === this.stockChart);

        // Mouvement de la souris
        canvas.addEventListener('mousemove', (event) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const xAxis = chart.scales.x;
            const yAxis = chart.scales.y;

            // Vérifier si la souris est dans la zone du graphique
            if (x >= xAxis.left && x <= xAxis.right && y >= yAxis.top && y <= yAxis.bottom) {
                this.crosshair.x = x;
                this.crosshair.y = y;
                this.crosshair.visible = true;

                if (isPanning) {
                    canvas.style.cursor = 'grabbing';
                } else {
                    canvas.style.cursor = 'crosshair';
                }
            } else {
                this.crosshair.visible = false;
                canvas.style.cursor = 'default';
            }

            // Gestion du panning (déplacement) - SENS INVERSE
            if (isPanning && lastPanX !== null) {
                const deltaX = x - lastPanX;
                if (Math.abs(deltaX) > 2) { // Seuil minimal pour éviter les micro-mouvements
                    // INVERSE : on utilise deltaX positif au lieu de négatif
                    chart.pan({ x: deltaX });
                    lastPanX = x;
                    chart.draw();
                    // Synchroniser les autres graphiques avec le panning
                    this.syncChartsPanning(deltaX);
                    return; // Ne pas mettre à jour le crosshair pendant le pan
                }
            }

            // Gestion du dessin de lignes - UNIQUEMENT sur le graphique principal
            if (isMainChart && this.isDrawingLine && this.pivotPoint) {
                // Aperçu dynamique de la ligne pivotée
                this.previewEnd = { x, y };
                chart.draw();
                return;
            }

            // Gestion du drag des lignes existantes - UNIQUEMENT sur le graphique principal
            if (isMainChart && this.dragMode && this.selectedLineIndex !== null) {
                const line = this.drawnLines[this.selectedLineIndex];
                if (this.dragMode === 'move') {
                    const dx = x - (line.start.x + line.end.x) / 2 - this.dragOffset.x;
                    const dy = y - (line.start.y + line.end.y) / 2 - this.dragOffset.y;
                    line.start.x += dx; line.start.y += dy;
                    line.end.x += dx; line.end.y += dy;
                } else if (this.dragMode === 'start') {
                    line.start.x = x - this.dragOffset.x;
                    line.start.y = y - this.dragOffset.y;
                } else if (this.dragMode === 'end') {
                    line.end.x = x - this.dragOffset.x;
                    line.end.y = y - this.dragOffset.y;
                }
                chart.draw();
                this.showLineToolbar();
                return;
            }

            chart.draw();

            // Synchroniser les autres graphiques avec le crosshair
            this.syncChartsCrosshair();
        });

        // Début du panning (clic enfoncé) - AVEC GESTION DU DESSIN
        canvas.addEventListener('mousedown', (event) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const xAxis = chart.scales.x;
            const yAxis = chart.scales.y;

            if (x >= xAxis.left && x <= xAxis.right && y >= yAxis.top && y <= yAxis.bottom) {
                // Gestion du dessin de lignes - UNIQUEMENT sur le graphique principal
                if (isMainChart && this.isDrawingLine) {
                    if (!this.pivotPoint) {
                        // Premier clic : placer le pivot
                        this.pivotPoint = { x, y };
                        this.previewEnd = null;
                    } else {
                        // Second clic : fixer la ligne
                        const settings = this.getLineSettings();
                        this.drawnLines.push({
                            start: { ...this.pivotPoint },
                            end: { ...this.previewEnd },
                            color: settings.color,
                            width: settings.width
                        });
                        this.selectedLineIndex = this.drawnLines.length - 1;
                        this.disableLineDrawingMode();
                        this.showLineToolbar();
                        this.updateDrawingButtonState();
                    }
                    chart.draw();
                    return;
                }

                // Sélection ou drag de ligne existante - UNIQUEMENT sur le graphique principal
                if (isMainChart) {
                    const hit = this.getLineHit({ x, y });
                    if (hit) {
                        this.selectedLineIndex = hit.index;
                        this.dragMode = hit.mode;
                        this.dragOffset = { x: x - hit.point.x, y: y - hit.point.y };
                        this.showLineToolbar();
                        this.updateDrawingButtonState();
                        chart.draw();
                    } else {
                        this.selectedLineIndex = null;
                        this.dragMode = null;
                        this.hideLineToolbar();
                        this.updateDrawingButtonState();

                        // Si pas de ligne sélectionnée, activer le panning
                        isPanning = true;
                        lastPanX = x;
                        canvas.style.cursor = 'grabbing';
                        chart.draw();
                    }
                } else {
                    // Pour les autres graphiques, activer directement le panning
                    isPanning = true;
                    lastPanX = x;
                    canvas.style.cursor = 'grabbing';
                    chart.draw();
                }
            } else {
                // Clic en dehors du graphique
                if (isMainChart) {
                    this.selectedLineIndex = null;
                    this.dragMode = null;
                    this.hideLineToolbar();
                    this.updateDrawingButtonState();
                }
                chart.draw();
            }
        });

        // Fin du panning (clic relâché)
        canvas.addEventListener('mouseup', () => {
            isPanning = false;
            lastPanX = null;
            this.dragMode = null;
            canvas.style.cursor = (isMainChart && this.isDrawingLine) ? 'crosshair' : 'default';
            if (this.stockChart) {
                this.stockChart.draw();
            }
            this.syncChartsDraw();
        });

        canvas.addEventListener('mouseleave', () => {
            isPanning = false;
            lastPanX = null;
            this.dragMode = null;
            this.crosshair.visible = false;

            if (isMainChart && this.isDrawingLine && this.pivotPoint) {
                this.previewEnd = null;
                if (this.stockChart) {
                    this.stockChart.draw();
                }
            }

            canvas.style.cursor = 'default';
            if (this.stockChart) {
                this.stockChart.draw();
            }
            this.syncChartsDraw();
        });

        // Clic pour désactiver temporairement le curseur
        canvas.addEventListener('click', (event) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const xAxis = chart.scales.x;
            const yAxis = chart.scales.y;

            // Vérifier si le clic est en dehors du graphique
            if (x < xAxis.left || x > xAxis.right || y < yAxis.top || y > yAxis.bottom) {
                if (isMainChart) {
                    this.selectedLineIndex = null;
                    this.hideLineToolbar();
                    this.updateDrawingButtonState();
                }
                if (this.stockChart) {
                    this.stockChart.draw();
                }
                this.syncChartsDraw();
            }

            if (!isPanning && !this.isDrawingLine && this.crosshair.visible) {
                this.crosshair.visible = false;
                setTimeout(() => {
                    if (this.crosshair.x !== null && this.crosshair.y !== null) {
                        this.crosshair.visible = true;
                    }
                }, 100);
                if (this.stockChart) {
                    this.stockChart.draw();
                }
                this.syncChartsDraw();
            }
        });
    }

// NOUVELLE MÉTHODE: Synchroniser le panning des graphiques
    syncChartsPanning(deltaX) {
        const charts = [this.volumeChart, this.macdChart, this.rsiChart].filter(chart => chart);
        charts.forEach(chart => {
            chart.pan({ x: deltaX });
            chart.draw();
        });
    }

// NOUVELLE MÉTHODE: Synchroniser le crosshair des graphiques
    syncChartsCrosshair() {
        const charts = [this.volumeChart, this.macdChart, this.rsiChart].filter(chart => chart);
        charts.forEach(chart => {
            chart.draw();
        });
    }

// NOUVELLE MÉTHODE: Synchroniser le dessin des graphiques
    syncChartsDraw() {
        const charts = [this.volumeChart, this.macdChart, this.rsiChart].filter(chart => chart);
        charts.forEach(chart => {
            chart.draw();
        });
    }

// MÉTHODES : Outil de dessin
    setupDrawingTools() {
        // Créer la toolbar pour les lignes
        this.createLineToolbar();

        // Configurer les événements
        this.setupLineToolbarEvents();

        // Mettre à jour l'état initial du bouton
        this.updateDrawingButtonState();
    }

    createLineToolbar() {
        // Vérifier si la toolbar existe déjà
        if (document.getElementById('lineToolbar')) return;

        const toolbar = document.createElement('div');
        toolbar.id = 'lineToolbar';
        toolbar.style.cssText = `
        display: none;
        position: absolute;
        z-index: 20;
        background: #fff;
        border: 1px solid #ccc;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        padding: 6px 10px;
        gap: 8px;
        align-items: center;
        min-width: 110px;
    `;

        toolbar.innerHTML = `
        <input type="color" id="toolbarLineColor" style="width: 28px; height: 28px; border: none; background: none; cursor: pointer; margin-right: 6px;">
        <div id="toolbarLineWidthGroup" style="display: flex; gap: 4px; align-items: center; margin-right: 6px;">
            <button class="toolbar-line-width-btn" data-width="1" title="Très fin" style="background: none; border: none; cursor: pointer; padding: 0;">
                <svg width="32" height="20"><line x1="4" y1="10" x2="28" y2="10" stroke="#444" stroke-width="1" stroke-linecap="round"/></svg>
            </button>
            <button class="toolbar-line-width-btn" data-width="2" title="Fin" style="background: none; border: none; cursor: pointer; padding: 0;">
                <svg width="32" height="20"><line x1="4" y1="10" x2="28" y2="10" stroke="#444" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
            <button class="toolbar-line-width-btn" data-width="3" title="Moyen" style="background: none; border: none; cursor: pointer; padding: 0;">
                <svg width="32" height="20"><line x1="4" y1="10" x2="28" y2="10" stroke="#444" stroke-width="3" stroke-linecap="round"/></svg>
            </button>
            <button class="toolbar-line-width-btn" data-width="4" title="Épais" style="background: none; border: none; cursor: pointer; padding: 0;">
                <svg width="32" height="20"><line x1="4" y1="10" x2="28" y2="10" stroke="#444" stroke-width="4" stroke-linecap="round"/></svg>
            </button>
        </div>
        <button id="toolbarDelete" title="Supprimer la ligne" style="background: none; border: none; cursor: pointer; margin-left: 8px; color: #888; font-size: 18px;">
            <i class="fas fa-trash"></i>
        </button>
    `;

        document.body.appendChild(toolbar);
    }

    setupLineToolbarEvents() {
        const colorInput = document.getElementById('toolbarLineColor');
        if (colorInput) {
            colorInput.addEventListener('input', () => {
                if (this.selectedLineIndex !== null && this.drawnLines[this.selectedLineIndex]) {
                    this.drawnLines[this.selectedLineIndex].color = colorInput.value;
                    if (this.stockChart) {
                        this.stockChart.draw();
                    }
                }
            });
        }

        const widthBtns = document.querySelectorAll('.toolbar-line-width-btn');
        widthBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const width = parseInt(btn.getAttribute('data-width'));
                if (this.selectedLineIndex !== null && this.drawnLines[this.selectedLineIndex]) {
                    this.drawnLines[this.selectedLineIndex].width = width;
                    if (this.stockChart) {
                        this.stockChart.draw();
                    }
                    this.showLineToolbar();
                }
            });
        });

        const deleteBtn = document.getElementById('toolbarDelete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (this.selectedLineIndex !== null && this.drawnLines[this.selectedLineIndex]) {
                    this.drawnLines.splice(this.selectedLineIndex, 1);
                    this.selectedLineIndex = null;
                    if (this.stockChart) {
                        this.stockChart.draw();
                    }
                    this.hideLineToolbar();
                    this.updateDrawingButtonState();
                }
            });
        }
    }

    enableLineDrawingMode() {
        this.isDrawingLine = true;
        this.selectedLineIndex = null;
        this.dragMode = null;
        this.pivotPoint = null;
        this.previewEnd = null;

        const canvas = document.getElementById('chartjsStockChart');
        if (canvas) canvas.style.cursor = 'crosshair';

        this.hideLineToolbar();

        if (this.stockChart) {
            this.stockChart.draw();
        }
    }

    disableLineDrawingMode() {
        this.isDrawingLine = false;
        this.dragMode = null;
        this.pivotPoint = null;
        this.previewEnd = null;

        const canvas = document.getElementById('chartjsStockChart');
        if (canvas) canvas.style.cursor = 'crosshair';

        if (this.stockChart) {
            this.stockChart.draw();
        }
    }

// MÉTHODE : Gestion de l'état visuel du bouton
    updateDrawingButtonState() {
        const btn = document.getElementById('drawLineBtn');
        if (!btn) return;

        // Activer le contour gris dans ces cas :
        // 1. Mode dessin activé
        // 2. Ligne sélectionnée
        const shouldBeActive = this.isDrawingLine || this.selectedLineIndex !== null;

        if (shouldBeActive) {
            btn.style.background = '#e5e7eb';
            btn.style.boxShadow = '0 0 0 1.5px #888';
        } else {
            btn.style.background = 'rgba(255,255,255,0.8)';
            btn.style.boxShadow = 'none';
        }
    }

    getLineSettings() {
        const colorInput = document.getElementById('toolbarLineColor');
        const color = colorInput ? colorInput.value : '#1976d2';
        return { color, width: 2 };
    }

    getLineHit(mouse) {
        // Retourne {index, mode, point} si clic sur une ligne ou extrémité
        for (let i = this.drawnLines.length - 1; i >= 0; i--) {
            const line = this.drawnLines[i];
            // Extrémités
            if (this.distance(mouse, line.start) < 8) return { index: i, mode: 'start', point: line.start };
            if (this.distance(mouse, line.end) < 8) return { index: i, mode: 'end', point: line.end };
            // Ligne (distance point-segment)
            if (this.pointLineDistance(mouse, line.start, line.end) < 6) {
                return {
                    index: i,
                    mode: 'move',
                    point: {
                        x: (line.start.x + line.end.x) / 2,
                        y: (line.start.y + line.end.y) / 2
                    }
                };
            }
        }
        return null;
    }

    distance(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    }

    pointLineDistance(p, a, b) {
        // Distance du point p au segment ab
        const l2 = this.distance(a, b) ** 2;
        if (l2 === 0) return this.distance(p, a);
        let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return this.distance(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    }

// MÉTHODE : Dessiner les lignes sur le graphique (CORRIGÉE)
    drawLinesOnChart(chart) {
        const { ctx } = chart;

        // Ne dessiner les lignes que sur le graphique principal
        if (chart !== this.stockChart) return;

        // Dessiner les lignes existantes
        this.drawnLines.forEach((line, i) => {
            this.drawLineOnCanvas(ctx, line, i === this.selectedLineIndex);
        });

        // Aperçu dynamique de la ligne pivotée
        if (this.isDrawingLine && this.pivotPoint && this.previewEnd) {
            const settings = this.getLineSettings();
            this.drawLineOnCanvas(ctx, {
                start: this.pivotPoint,
                end: this.previewEnd,
                color: settings.color,
                width: settings.width
            }, true);
        }

        // Afficher le pivot si en mode tracé (cercle creux discret)
        if (this.isDrawingLine && this.pivotPoint) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.pivotPoint.x, this.pivotPoint.y, 3, 0, 2 * Math.PI);
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = this.getLineSettings().color;
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 1;
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }

    drawLineOnCanvas(ctx, line, selected = false) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(line.start.x, line.start.y);
        ctx.lineTo(line.end.x, line.end.y);
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.width;
        ctx.setLineDash([]); // Toujours plein
        ctx.globalAlpha = 1;
        ctx.stroke();

        // Afficher les points de contrôle uniquement si sélectionné
        if (selected) {
            const radius = 3;
            ctx.beginPath();
            ctx.arc(line.start.x, line.start.y, radius, 0, 2 * Math.PI);
            ctx.arc(line.end.x, line.end.y, radius, 0, 2 * Math.PI);
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = line.color;
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 1;
            ctx.fill(); // Cercle creux
            ctx.stroke();
        }
        ctx.restore();
    }

    showLineToolbar() {
        const toolbar = document.getElementById('lineToolbar');
        if (!toolbar || this.selectedLineIndex === null || !this.drawnLines[this.selectedLineIndex]) {
            if (toolbar) toolbar.style.display = 'none';
            return;
        }

        const line = this.drawnLines[this.selectedLineIndex];
        const canvas = document.getElementById('chartjsStockChart');
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const centerX = (line.start.x + line.end.x) / 2 + rect.left;
        const centerY = (line.start.y + line.end.y) / 2 + rect.top - 38; // au-dessus de la ligne

        toolbar.style.left = `${centerX - toolbar.offsetWidth / 2}px`;
        toolbar.style.top = `${centerY - toolbar.offsetHeight / 2}px`;

        // Synchroniser les valeurs
        const colorInput = document.getElementById('toolbarLineColor');
        if (colorInput) colorInput.value = line.color;

        // Mettre à jour la sélection visuelle des boutons SVG
        const widthBtns = document.querySelectorAll('.toolbar-line-width-btn');
        widthBtns.forEach(btn => {
            if (parseInt(btn.getAttribute('data-width')) === (line.width || 2)) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });

        toolbar.style.display = 'flex';
    }

    hideLineToolbar() {
        const toolbar = document.getElementById('lineToolbar');
        if (toolbar) toolbar.style.display = 'none';
    }

    async loadStocks() {
        const dropdown = document.getElementById('dataChartsSymbol');
        if (!dropdown) return;

        // Vider le dropdown sauf l'option par défaut
        while (dropdown.options.length > 1) {
            dropdown.remove(1);
        }

        let allStocks = [];
        let page = 1;
        let totalPages = 1;

        try {
            // Utiliser la même API que le dropdown principal des actions
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

            // Ajouter les options dans le même format que le dropdown principal
            allStocks.forEach(stock => {
                const option = document.createElement('option');
                option.value = stock.ticker;
                option.textContent = `${stock.ticker} - ${stock.stock_name}`;
                dropdown.appendChild(option);
            });

            console.log(`Chargé ${allStocks.length} actions depuis l'API principale`);
        } catch (error) {
            console.error('Erreur lors du chargement des actions:', error);
            const errorOption = document.createElement('option');
            errorOption.textContent = 'Erreur lors du chargement des actions';
            errorOption.disabled = true;
            dropdown.appendChild(errorOption);
        }
    }

    bindEvents() {
        // Gestionnaire pour le sélecteur d'action
        const symbolSelect = document.getElementById('dataChartsSymbol');
        const lineChartBtn = document.getElementById('lineChartBtn');
        const candleChartBtn = document.getElementById('candleChartBtn');
        const macdChartBtn = document.getElementById('macdChartBtn');
        const rsiChartBtn = document.getElementById('rsiChartBtn');
        const bollingerBtn = document.getElementById('bollingerChartBtn'); // AJOUT: Bouton Bollinger
        const periodSelect = document.getElementById('dataChartsPeriod');
        const granularitySelect = document.getElementById('dataChartsGranularity');
        const resetZoomBtn = document.getElementById('resetZoomBtn');
        const drawLineBtn = document.getElementById('drawLineBtn');

        // CORRECTION : Ajouter l'événement pour le bouton de dessin
        if (drawLineBtn) {
            // Appliquer le même style que les autres boutons
            drawLineBtn.style.display = 'flex';
            drawLineBtn.style.alignItems = 'center';
            drawLineBtn.style.justifyContent = 'center';
            drawLineBtn.style.borderRadius = '4px';
            drawLineBtn.style.padding = '6px';
            drawLineBtn.style.cursor = 'pointer';
            drawLineBtn.style.background = 'rgba(255,255,255,0.8)';
            drawLineBtn.style.border = 'none';

            drawLineBtn.addEventListener('click', () => {
                if (!this.isDrawingLine) {
                    this.enableLineDrawingMode();
                } else {
                    this.disableLineDrawingMode();
                }
                this.updateDrawingButtonState();
            });
        }

        if (symbolSelect) {
            symbolSelect.addEventListener('change', () => this.updateChart());
        }

        // Gestionnaire pour le sélecteur de période (durée)
        if (periodSelect) {
            periodSelect.addEventListener('change', () => {
                if (symbolSelect.value) {
                    this.updateChart();
                }
            });
        }

        // Gestionnaire pour le sélecteur de granularité
        if (granularitySelect) {
            granularitySelect.addEventListener('change', () => {
                if (symbolSelect.value) {
                    this.updateChart();
                }
            });
        }

        // Gestionnaires pour les boutons de type de graphique
        if (lineChartBtn) {
            lineChartBtn.addEventListener('click', () => {
                this.chartType = 'line';
                this.updateChartTypeButtons();
                if (symbolSelect.value) {
                    this.updateChart();
                }
            });
        }

        if (candleChartBtn) {
            candleChartBtn.addEventListener('click', () => {
                this.chartType = 'candlestick';
                this.updateChartTypeButtons();
                if (symbolSelect.value) {
                    this.updateChart();
                }
            });
        }

        // Gestionnaires pour les boutons d'indicateurs
        if (macdChartBtn) {
            macdChartBtn.addEventListener('click', () => {
                this.showMACD = !this.showMACD;
                this.updateIndicatorButtons();
                this.toggleIndicatorChart('macd', this.showMACD);
                if (symbolSelect.value && this.showMACD) {
                    this.updateChart();
                }
            });
        }

        if (rsiChartBtn) {
            rsiChartBtn.addEventListener('click', () => {
                this.showRSI = !this.showRSI;
                this.updateIndicatorButtons();
                this.toggleIndicatorChart('rsi', this.showRSI);
                if (symbolSelect.value && this.showRSI) {
                    this.updateChart();
                }
            });
        }

        // AJOUT: Gestionnaire pour le bouton Bollinger Bands
        if (bollingerBtn) {
            bollingerBtn.addEventListener('click', () => {
                this.showBollinger = !this.showBollinger;
                this.updateIndicatorButtons();
                if (this.showBollinger) {
                    this.updateChart();
                } else {
                    // Masquer les bandes de Bollinger du graphique
                    if (this.stockChart) {
                        this.stockChart.config._bollingerBandsData = null;
                        this.stockChart.update();
                    }
                }
            });
        }

        // AJOUT: Gestionnaires pour les nouveaux indicateurs
        const ichimokuBtn = document.getElementById('ichimokuChartBtn');
        const stochasticBtn = document.getElementById('stochasticChartBtn');
        const williamsRBtn = document.getElementById('williamsRChartBtn');

        if (ichimokuBtn) {
            ichimokuBtn.addEventListener('click', () => {
                this.showIchimoku = !this.showIchimoku;
                this.updateIndicatorButtons();
                if (this.showIchimoku) {
                    this.updateChart();
                } else {
                    // Masquer Ichimoku du graphique
                    if (this.stockChart) {
                        this.stockChart.config._ichimokuData = null;
                        this.stockChart.update();
                    }
                }
            });
        }

        if (stochasticBtn) {
            stochasticBtn.addEventListener('click', () => {
                this.showStochastic = !this.showStochastic;
                this.updateIndicatorButtons();
                this.toggleIndicatorChart('stochastic', this.showStochastic);
                if (symbolSelect.value && this.showStochastic) {
                    this.updateChart();
                }
            });
        }

        if (williamsRBtn) {
            williamsRBtn.addEventListener('click', () => {
                this.showWilliamsR = !this.showWilliamsR;
                this.updateIndicatorButtons();
                this.toggleIndicatorChart('williamsR', this.showWilliamsR);
                if (symbolSelect.value && this.showWilliamsR) {
                    this.updateChart();
                }
            });
        }


        // Bouton de réinitialisation du zoom
        if (resetZoomBtn) {
            resetZoomBtn.addEventListener('click', () => {
                if (this.stockChart) {
                    if (this.stockChart.resetZoom) {
                        this.stockChart.resetZoom();
                    } else {
                        this.stockChart.reset();
                    }
                }
                const charts = [this.volumeChart, this.macdChart, this.rsiChart].filter(chart => chart);
                charts.forEach(chart => {
                    if (chart.resetZoom) {
                        chart.resetZoom();
                    } else {
                        chart.reset();
                    }
                });
            });
        }
    }

    updateChartTypeButtons() {
        const lineBtn = document.getElementById('lineChartBtn');
        const candleBtn = document.getElementById('candleChartBtn');

        if (lineBtn && candleBtn) {
            // Créer les icônes SVG personnalisées si elles n'existent pas encore
            if (!lineBtn.querySelector('svg')) {
                // Icône zone (aire) pour le mode ligne
                lineBtn.innerHTML = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="14" width="18" height="6" rx="2" fill="#bbb"/>
                <path d="M3 16L8 10L13 13L19 6" stroke="#888" stroke-width="2" fill="none"/>
                <polygon points="3,16 8,10 13,13 19,6 19,20 3,20" fill="#bbb" fill-opacity="0.5"/>
            </svg>`;
                lineBtn.title = 'Mode zone';
                lineBtn.style.display = 'flex';
                lineBtn.style.alignItems = 'center';
                lineBtn.style.justifyContent = 'center';
                lineBtn.style.borderRadius = '3px';
                lineBtn.style.padding = '2px';
                lineBtn.style.cursor = 'pointer';
            }

            if (!candleBtn.querySelector('svg')) {
                // Icône bougie (deux bougies) pour le mode chandeliers
                candleBtn.innerHTML = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="8" width="4" height="8" rx="1.5" fill="#fff" stroke="#bbb" stroke-width="1.5"/>
                <rect x="13" y="6" width="4" height="10" rx="1.5" fill="#bbb" stroke="#888" stroke-width="1.5"/>
                <rect x="7" y="5" width="1" height="3" rx="0.5" fill="#bbb"/>
                <rect x="15" y="3" width="1" height="3" rx="0.5" fill="#888"/>
            </svg>`;
                candleBtn.title = 'Mode bougie';
                candleBtn.style.display = 'flex';
                candleBtn.style.alignItems = 'center';
                candleBtn.style.justifyContent = 'center';
                candleBtn.style.borderRadius = '3px';
                candleBtn.style.padding = '2px';
                candleBtn.style.cursor = 'pointer';
            }

            // Gestion du mode actif
            if (this.chartType === 'line') {
                lineBtn.style.background = '#e5e7eb';
                lineBtn.style.boxShadow = '0 0 0 1.5px #888';
                candleBtn.style.background = 'none';
                candleBtn.style.boxShadow = 'none';
            } else if (this.chartType === 'candlestick') {
                candleBtn.style.background = '#e5e7eb';
                candleBtn.style.boxShadow = '0 0 0 1.5px #888';
                lineBtn.style.background = 'none';
                lineBtn.style.boxShadow = 'none';
            }
        }
    }

    // NOUVELLE MÉTHODE: Mettre à jour l'état des boutons indicateurs
    updateIndicatorButtons() {
        const macdBtn = document.getElementById('macdChartBtn');
        const rsiBtn = document.getElementById('rsiChartBtn');
        const bollingerBtn = document.getElementById('bollingerChartBtn'); // AJOUT: Bouton Bollinger

        if (macdBtn) {
            if (this.showMACD) {
                macdBtn.style.background = '#e5e7eb';
                macdBtn.style.boxShadow = '0 0 0 1.5px #888';
            } else {
                macdBtn.style.background = 'rgba(255,255,255,0.8)';
                macdBtn.style.boxShadow = 'none';
            }
        }

        if (rsiBtn) {
            if (this.showRSI) {
                rsiBtn.style.background = '#e5e7eb';
                rsiBtn.style.boxShadow = '0 0 0 1.5px #888';
            } else {
                rsiBtn.style.background = 'rgba(255,255,255,0.8)';
                rsiBtn.style.boxShadow = 'none';
            }
        }

        // AJOUT: Mise à jour du bouton Bollinger
        if (bollingerBtn) {
            if (this.showBollinger) {
                bollingerBtn.style.background = '#e5e7eb';
                bollingerBtn.style.boxShadow = '0 0 0 1.5px #888';
            } else {
                bollingerBtn.style.background = 'rgba(255,255,255,0.8)';
                bollingerBtn.style.boxShadow = 'none';
            }
        }

        // AJOUT: Mise à jour des nouveaux boutons
        const ichimokuBtn = document.getElementById('ichimokuChartBtn');
        const stochasticBtn = document.getElementById('stochasticChartBtn');
        const williamsRBtn = document.getElementById('williamsRChartBtn');

        if (ichimokuBtn) {
            if (this.showIchimoku) {
                ichimokuBtn.style.background = '#e5e7eb';
                ichimokuBtn.style.boxShadow = '0 0 0 1.5px #888';
            } else {
                ichimokuBtn.style.background = 'rgba(255,255,255,0.8)';
                ichimokuBtn.style.boxShadow = 'none';
            }
        }

        if (stochasticBtn) {
            if (this.showStochastic) {
                stochasticBtn.style.background = '#e5e7eb';
                stochasticBtn.style.boxShadow = '0 0 0 1.5px #888';
            } else {
                stochasticBtn.style.background = 'rgba(255,255,255,0.8)';
                stochasticBtn.style.boxShadow = 'none';
            }
        }

        if (williamsRBtn) {
            if (this.showWilliamsR) {
                williamsRBtn.style.background = '#e5e7eb';
                williamsRBtn.style.boxShadow = '0 0 0 1.5px #888';
            } else {
                williamsRBtn.style.background = 'rgba(255,255,255,0.8)';
                williamsRBtn.style.boxShadow = 'none';
            }
        }
    }

    // NOUVELLE MÉTHODE: Afficher/Masquer les graphiques indicateurs
    toggleIndicatorChart(type, show) {
        const area = document.getElementById(`${type}ChartsArea`);
        if (area) {
            area.style.display = show ? 'block' : 'none';
        }

        // Si on masque un indicateur, détruire le graphique
        if (!show) {
            if (type === 'macd' && this.macdChart) {
                this.macdChart.destroy();
                this.macdChart = null;
            } else if (type === 'rsi' && this.rsiChart) {
                this.rsiChart.destroy();
                this.rsiChart = null;
            } else if (type === 'stochastic' && this.stochasticChart) {
                this.stochasticChart.destroy();
                this.stochasticChart = null;
            } else if (type === 'williamsR' && this.williamsRChart) {
                this.williamsRChart.destroy();
                this.williamsRChart = null;
            }
        }
    }

    // Méthode pour calculer les moyennes mobiles
    calculateMovingAverages(prices, periods = [20, 50, 200]) {
        const movingAverages = {};

        periods.forEach(period => {
            movingAverages[`ma${period}`] = [];

            for (let i = 0; i < prices.length; i++) {
                if (i < period - 1) {
                    movingAverages[`ma${period}`].push(null);
                } else {
                    const slice = prices.slice(i - period + 1, i + 1);
                    const sum = slice.reduce((a, b) => a + b, 0);
                    const average = sum / period;
                    movingAverages[`ma${period}`].push(average);
                }
            }
        });

        return movingAverages;
    }

    // NOUVELLE MÉTHODE: Calculer le MACD
    calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const emaFast = this.calculateEMA(prices, fastPeriod);
        const emaSlow = this.calculateEMA(prices, slowPeriod);

        const macdLine = [];
        for (let i = 0; i < prices.length; i++) {
            if (emaFast[i] !== null && emaSlow[i] !== null) {
                macdLine.push(emaFast[i] - emaSlow[i]);
            } else {
                macdLine.push(null);
            }
        }

        const signalLine = this.calculateEMA(macdLine.filter(val => val !== null), signalPeriod);
        const histogram = [];

        for (let i = 0; i < macdLine.length; i++) {
            if (macdLine[i] !== null && signalLine[i] !== null) {
                histogram.push(macdLine[i] - signalLine[i]);
            } else {
                histogram.push(null);
            }
        }

        return {
            macdLine,
            signalLine,
            histogram
        };
    }

    // NOUVELLE MÉTHODE: Calculer l'EMA (Exponential Moving Average)
    calculateEMA(data, period) {
        const ema = [];
        const multiplier = 2 / (period + 1);

        // Premier point EMA est une SMA simple
        let sum = 0;
        for (let i = 0; i < period; i++) {
            if (i < data.length) {
                sum += data[i];
                ema.push(null);
            }
        }

        if (period - 1 < data.length) {
            ema[period - 1] = sum / period;
        }

        // Calculer les EMA suivants
        for (let i = period; i < data.length; i++) {
            ema[i] = (data[i] - ema[i-1]) * multiplier + ema[i-1];
        }

        return ema;
    }

    // NOUVELLE MÉTHODE: Calculer le RSI
    calculateRSI(prices, period = 14) {
        const gains = [];
        const losses = [];

        // Calculer les gains et pertes
        for (let i = 1; i < prices.length; i++) {
            const difference = prices[i] - prices[i-1];
            gains.push(difference > 0 ? difference : 0);
            losses.push(difference < 0 ? Math.abs(difference) : 0);
        }

        // Calculer les moyennes des gains et pertes
        let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
        let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

        const rsi = [null]; // Premier point est null

        for (let i = period; i < prices.length; i++) {
            if (avgLoss === 0) {
                rsi.push(100);
            } else {
                const rs = avgGain / avgLoss;
                rsi.push(100 - (100 / (1 + rs)));
            }

            // Mettre à jour les moyennes (FIX: utiliser gainsIndex car gains/losses ont un décalage)
            // gains[0] = différence entre prices[1] et prices[0]
            // donc pour prices[i], utiliser gains[i-1]
            const gainsIndex = i - 1;
            if (gainsIndex >= 0 && gainsIndex < gains.length) {
                avgGain = ((avgGain * (period - 1)) + gains[gainsIndex]) / period;
                avgLoss = ((avgLoss * (period - 1)) + losses[gainsIndex]) / period;
            }
        }

        return rsi;
    }

    // Méthode pour filtrer les données selon la période sélectionnée
    filterDataByPeriod(timestamps, prices, period) {
        const now = Math.floor(Date.now() / 1000);
        let cutoffTime;

        switch (period) {
            case '1D': cutoffTime = now - (24 * 60 * 60); break;
            case '1W': cutoffTime = now - (7 * 24 * 60 * 60); break;
            case '1M': cutoffTime = now - (30 * 24 * 60 * 60); break;
            case '3M': cutoffTime = now - (90 * 24 * 60 * 60); break;
            case '6M': cutoffTime = now - (180 * 24 * 60 * 60); break;
            case '1Y': cutoffTime = now - (365 * 24 * 60 * 60); break;
            case '3Y': cutoffTime = now - (3 * 365 * 24 * 60 * 60); break;
            case '5Y': cutoffTime = now - (5 * 365 * 24 * 60 * 60); break;
            case 'YTD':
                const currentYear = new Date().getFullYear();
                cutoffTime = Math.floor(new Date(currentYear, 0, 1).getTime() / 1000);
                break;
            case 'MAX':
                return { filteredTimestamps: [...timestamps], filteredPrices: [...prices] };
            default: cutoffTime = now - (90 * 24 * 60 * 60);
        }

        const filteredTimestamps = [];
        const filteredPrices = [];

        for (let i = 0; i < timestamps.length; i++) {
            if (timestamps[i] >= cutoffTime) {
                filteredTimestamps.push(timestamps[i]);
                filteredPrices.push(prices[i]);
            }
        }

        if (filteredTimestamps.length === 0 && timestamps.length > 0) {
            const pointsToTake = Math.min(10, timestamps.length);
            const startIndex = timestamps.length - pointsToTake;
            return {
                filteredTimestamps: timestamps.slice(startIndex),
                filteredPrices: prices.slice(startIndex)
            };
        }

        return { filteredTimestamps, filteredPrices };
    }

    // Fonction pour agréger les données par période (granularité)
    aggregateDataByPeriod(timestamps, prices, period) {
        if (!timestamps.length || !prices.length) return { aggTimestamps: [], aggPrices: [] };

        const result = [];
        const resultTimestamps = [];
        let group = [];
        let groupTimestamps = [];
        let lastKey = null;

        function getKey(ts) {
            const date = new Date(ts * 1000);
            switch (period) {
                case '1D': return date.toISOString().slice(0, 10);
                case '1W': {
                    const d = new Date(date);
                    d.setDate(d.getDate() - d.getDay());
                    return d.toISOString().slice(0, 10);
                }
                case '1M': return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                case '3M': {
                    const quarter = Math.floor(date.getMonth() / 3) + 1;
                    return `${date.getFullYear()}-Q${quarter}`;
                }
                case '1Y': return `${date.getFullYear()}`;
                default: return date.toISOString().slice(0, 10);
            }
        }

        for (let i = 0; i < timestamps.length; i++) {
            const key = getKey(timestamps[i]);
            if (lastKey !== null && key !== lastKey) {
                result.push(group[group.length - 1]);
                resultTimestamps.push(groupTimestamps[groupTimestamps.length - 1]);
                group = [];
                groupTimestamps = [];
            }
            group.push(prices[i]);
            groupTimestamps.push(timestamps[i]);
            lastKey = key;
        }

        if (group.length) {
            result.push(group[group.length - 1]);
            resultTimestamps.push(groupTimestamps[groupTimestamps.length - 1]);
        }

        return { aggTimestamps: resultTimestamps, aggPrices: result };
    }

    // CORRECTION: Agréger les volumes correctement - utiliser la même méthode que les prix
    aggregateVolumeData(timestamps, volumes, period) {
        if (!timestamps.length || !volumes.length) return { aggTimestamps: [], aggVolumes: [] };

        const result = [];
        const resultTimestamps = [];
        let group = [];
        let groupTimestamps = [];
        let lastKey = null;

        function getKey(ts) {
            const date = new Date(ts * 1000);
            switch (period) {
                case '1D': return date.toISOString().slice(0, 10);
                case '1W': {
                    const d = new Date(date);
                    d.setDate(d.getDate() - d.getDay());
                    return d.toISOString().slice(0, 10);
                }
                case '1M': return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                case '3M': {
                    const quarter = Math.floor(date.getMonth() / 3) + 1;
                    return `${date.getFullYear()}-Q${quarter}`;
                }
                case '1Y': return `${date.getFullYear()}`;
                default: return date.toISOString().slice(0, 10);
            }
        }

        for (let i = 0; i < timestamps.length; i++) {
            const key = getKey(timestamps[i]);
            if (lastKey !== null && key !== lastKey) {
                // CORRECTION: Pour les volumes, on prend le DERNIER volume du groupe (comme pour les prix)
                // au lieu de faire la somme qui donne des valeurs incorrectes
                result.push(group[group.length - 1]);
                resultTimestamps.push(groupTimestamps[groupTimestamps.length - 1]);
                group = [];
                groupTimestamps = [];
            }
            group.push(volumes[i] || 0);
            groupTimestamps.push(timestamps[i]);
            lastKey = key;
        }

        if (group.length) {
            result.push(group[group.length - 1]);
            resultTimestamps.push(groupTimestamps[groupTimestamps.length - 1]);
        }

        return { aggTimestamps: resultTimestamps, aggVolumes: result };
    }

    // Prépare les données pour un graphique en chandeliers
    prepareCandleData(timestamps, prices) {
        const candleData = [];

        if (timestamps.length < 2) {
            return candleData;
        }

        for (let i = 1; i < timestamps.length; i++) {
            const previousPrice = prices[i - 1];
            const currentPrice = prices[i];

            const variation = Math.abs(currentPrice - previousPrice) * 0.3;
            const high = Math.max(currentPrice, previousPrice) + variation;
            const low = Math.min(currentPrice, previousPrice) - variation;

            candleData.push({
                x: timestamps[i] * 1000,
                o: previousPrice,
                h: high,
                l: low,
                c: currentPrice
            });
        }

        return candleData;
    }

    // Prépare les données pour un graphique en ligne
    prepareLineData(timestamps, prices) {
        return timestamps.map((timestamp, index) => ({
            x: timestamp * 1000,
            y: prices[index]
        }));
    }

    // NOUVELLE MÉTHODE: Préparer les données de volume
    prepareVolumeData(timestamps, volumes) {
        return timestamps.map((timestamp, index) => ({
            x: timestamp * 1000,
            y: volumes[index] || 0
        }));
    }

    // NOUVELLE MÉTHODE: Préparer les données MACD
    prepareMACDData(timestamps, macdData) {
        const { macdLine, signalLine, histogram } = macdData;

        const macdLineData = timestamps.map((timestamp, index) => ({
            x: timestamp * 1000,
            y: macdLine[index] !== null ? macdLine[index] : null
        }));

        const signalLineData = timestamps.map((timestamp, index) => ({
            x: timestamp * 1000,
            y: signalLine[index] !== null ? signalLine[index] : null
        }));

        const histogramData = timestamps.map((timestamp, index) => ({
            x: timestamp * 1000,
            y: histogram[index] !== null ? histogram[index] : null
        }));

        return { macdLineData, signalLineData, histogramData };
    }

    // NOUVELLE MÉTHODE: Préparer les données RSI
    prepareRSIData(timestamps, rsi) {
        return timestamps.map((timestamp, index) => ({
            x: timestamp * 1000,
            y: rsi[index] !== null ? rsi[index] : null
        }));
    }

    // MÉTHODE CORRIGÉE: Récupérer les données du jour en cours
    async fetchTodayData(symbol) {
        try {
            const response = await fetch('https://data.irbe7.com/api/data');
            if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);

            const data = await response.json();
            console.log('🔍 Données brutes API:', data);

            if (!Array.isArray(data)) {
                console.error('❌ Structure API invalide - tableau attendu');
                return null;
            }

            // Trouver l'action correspondante
            const todayData = data.find(item =>
                item.referentiel && item.referentiel.ticker === symbol
            );

            console.log(`🔍 Données trouvées pour ${symbol}:`, todayData);

            if (todayData) {
                // Retourner les données formatées selon la structure de l'API
                return {
                    referentiel: todayData.referentiel,
                    close: todayData.last || todayData.close, // Utiliser "last" pour le prix actuel
                    volume: todayData.volume || 0,
                    change: todayData.change || 0,
                    high: todayData.high || 0,
                    low: todayData.low || 0,
                    open: todayData.open || 0,
                    // Champs supplémentaires disponibles
                    last: todayData.last, // Prix actuel en temps réel
                    isin: todayData.isin,
                    time: todayData.time,
                    timestamp: new Date().getTime()
                };
            }

            console.warn(`⚠️ Aucune donnée trouvée pour le symbole: ${symbol}`);
            return null;

        } catch (error) {
            console.error('Erreur lors de la récupération des données du jour:', error);
            return null;
        }
    }
    async updateChart() {
        const symbolSelect = document.getElementById('dataChartsSymbol');
        const chartArea = document.getElementById('dataChartsArea');
        const volumeArea = document.getElementById('volumeChartsArea');
        const macdArea = document.getElementById('macdChartsArea');
        const rsiArea = document.getElementById('rsiChartsArea');
        const periodSelect = document.getElementById('dataChartsPeriod');
        const granularitySelect = document.getElementById('dataChartsGranularity');

        if (!symbolSelect || !chartArea || !volumeArea) return;

        const symbol = symbolSelect.value;
        if (!symbol) {
            chartArea.innerHTML = '';
            volumeArea.style.display = 'none';
            macdArea.style.display = 'none';
            rsiArea.style.display = 'none';
            return;
        }

        const period = periodSelect ? periodSelect.value : '3M';
        const granularity = granularitySelect ? granularitySelect.value : '1D';

        chartArea.innerHTML = '<div class="loading" style="display:flex;align-items:center;justify-content:center;height:100%;font-size:1.2rem;color:#666;">Chargement des données...</div>';
        volumeArea.style.display = 'none';
        if (!this.showMACD) macdArea.style.display = 'none';
        if (!this.showRSI) rsiArea.style.display = 'none';
        // AJOUT: Masquer les nouveaux graphiques par défaut
        if (!this.showStochastic) document.getElementById('stochasticChartsArea').style.display = 'none';
        if (!this.showWilliamsR) document.getElementById('williamsRChartsArea').style.display = 'none';

        try {
            // Récupérer les données historiques
            const response = await fetch(`/api/dataCharts/history/${symbol}`);
            if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);

            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Erreur inconnue');

            const data = result.data;
            if (!data || !data.t || !data.c || data.t.length === 0) {
                throw new Error(`Aucune donnée disponible pour ${symbol}.`);
            }

            // Récupérer les données du jour en cours
            const todayData = await this.fetchTodayData(symbol);

            // Fusionner les données historiques avec les données du jour
            let allTimestamps = [...data.t];
            let allPrices = [...data.c];
            let allVolumes = data.v ? [...data.v] : [];

            if (todayData && todayData.last && todayData.last > 0) {
                const now = new Date();
                const currentTimestamp = Math.floor(now.getTime() / 1000);
                const today = new Date();

                // Vérifier si le dernier point historique est d'aujourd'hui
                let shouldAddNewPoint = true;
                if (allTimestamps.length > 0) {
                    const lastHistoricalTimestamp = allTimestamps[allTimestamps.length - 1];
                    const lastHistoricalDate = new Date(lastHistoricalTimestamp * 1000);

                    const isSameDay = lastHistoricalDate.getDate() === today.getDate() &&
                        lastHistoricalDate.getMonth() === today.getMonth() &&
                        lastHistoricalDate.getFullYear() === today.getFullYear();

                    if (isSameDay) {
                        // Remplacer le point d'aujourd'hui par la valeur actuelle
                        console.log(`🔄 Mise à jour point actuel: ${todayData.last} TND`);
                        allPrices[allPrices.length - 1] = todayData.last;
                        if (todayData.volume !== undefined) {
                            allVolumes[allVolumes.length - 1] = todayData.volume;
                        }
                        shouldAddNewPoint = false;
                    }
                }

                if (shouldAddNewPoint) {
                    // Ajouter un nouveau point pour aujourd'hui
                    console.log(`✅ Nouveau point ajouté: ${todayData.last} TND`);
                    allTimestamps.push(currentTimestamp);
                    allPrices.push(todayData.last);
                    if (todayData.volume !== undefined) {
                        allVolumes.push(todayData.volume);
                    }
                }

                // Mettre à jour la valeur actuelle pour l'affichage
                this.currentPrice = todayData.last;
                this.currentVolume = todayData.volume || null;
            }

            const { filteredTimestamps, filteredPrices } = this.filterDataByPeriod(allTimestamps, allPrices, period);
            if (filteredTimestamps.length === 0) throw new Error(`Pas assez de données pour ${period}`);

            const { aggTimestamps, aggPrices } = this.aggregateDataByPeriod(filteredTimestamps, filteredPrices, granularity);
            if (aggTimestamps.length === 0) throw new Error(`Pas assez de données pour ${granularity}`);

            // CORRECTION: Traitement des volumes - utiliser les mêmes timestamps filtrés
            let aggVolumes = [];
            const hasVolumeData = allVolumes.length > 0;
            if (hasVolumeData) {
                // Filtrer les volumes avec les mêmes timestamps que les prix
                const filteredVolumes = [];
                for (let i = 0; i < allTimestamps.length; i++) {
                    if (filteredTimestamps.includes(allTimestamps[i])) {
                        filteredVolumes.push(allVolumes[i] || 0);
                    }
                }

                // Agréger les volumes avec la même méthode que les prix
                const { aggTimestamps: volumeAggTimestamps, aggVolumes: volumeAgg } = this.aggregateVolumeData(filteredTimestamps, filteredVolumes, granularity);
                aggVolumes = volumeAgg;
            }

            console.log(`Données agrégées pour ${symbol} (${period}, ${granularity}):`, {
                timestamps: aggTimestamps.length,
                samplePrices: aggPrices.slice(0, 5),
                hasVolume: hasVolumeData,
                sampleVolumes: aggVolumes.slice(0, 5),
                hasTodayData: !!todayData
            });

            // NOUVEAU: Mettre à jour les valeurs actuelles
            this.currentPrice = aggPrices[aggPrices.length - 1];
            this.currentVolume = hasVolumeData ? aggVolumes[aggVolumes.length - 1] : null;

            const movingAverages = this.calculateMovingAverages(aggPrices, [20, 50, 200]);

            // NOUVEAU: Calculer les indicateurs techniques
            let macdData = null;
            let rsiData = null;
            let bollingerData = null; // AJOUT: Variable pour Bollinger
            // AJOUT: Calculer les nouveaux indicateurs
            let ichimokuData = null;
            let stochasticData = null;
            let williamsRData = null;

            if (this.showIchimoku) {
                ichimokuData = this.calculateIchimoku(aggPrices, aggPrices, aggPrices);
                this.currentIchimoku = this.technicalIndicators.getCurrentIchimokuValues(ichimokuData);
            }

            if (this.showStochastic) {
                stochasticData = this.calculateStochastic(aggPrices, aggPrices, aggPrices);
                this.currentStochastic = this.technicalIndicators.getCurrentStochasticValues(stochasticData);
            }

            if (this.showWilliamsR) {
                williamsRData = this.calculateWilliamsR(aggPrices, aggPrices, aggPrices);
                this.currentWilliamsR = this.technicalIndicators.getCurrentWilliamsRValue(williamsRData);
            }

            if (this.showMACD) {
                macdData = this.calculateMACD(aggPrices);
                // Mettre à jour les valeurs actuelles MACD
                this.currentMACD = macdData.macdLine[macdData.macdLine.length - 1];
                this.currentSignal = macdData.signalLine[macdData.signalLine.length - 1];
                this.currentHistogram = macdData.histogram[macdData.histogram.length - 1];
            }

            if (this.showRSI) {
                rsiData = this.calculateRSI(aggPrices);
                // Mettre à jour la valeur actuelle RSI
                this.currentRSI = rsiData[rsiData.length - 1];
            }

            // AJOUT: Calculer les Bandes de Bollinger
            if (this.showBollinger) {
                this.bollingerCalculator = new BollingerBandsCalculator(20, 2);
                bollingerData = this.bollingerCalculator.calculate(aggPrices);

                // Mettre à jour les valeurs actuelles
                this.currentBollinger = this.bollingerCalculator.getCurrentValues(bollingerData);
            }

            if (this.showIchimoku) {
                // Pour Ichimoku, nous avons besoin des high/low/close
                ichimokuData = this.calculateIchimoku(aggPrices, aggPrices, aggPrices); // Note: utiliser les mêmes données pour high/low/close en attendant
                this.currentIchimoku = this.technicalIndicators.getCurrentIchimokuValues(ichimokuData);
            }

            if (this.showStochastic) {
                stochasticData = this.calculateStochastic(aggPrices, aggPrices, aggPrices);
                this.currentStochastic = this.technicalIndicators.getCurrentStochasticValues(stochasticData);
            }

            if (this.showWilliamsR) {
                williamsRData = this.calculateWilliamsR(aggPrices, aggPrices, aggPrices);
                this.currentWilliamsR = this.technicalIndicators.getCurrentWilliamsRValue(williamsRData);
            }

            const selectedOption = symbolSelect.options[symbolSelect.selectedIndex];
            const stockName = selectedOption ? selectedOption.textContent : symbol;
            const stockFullName = selectedOption ? selectedOption.textContent.split(' - ')[1] || symbol : symbol;

            chartArea.innerHTML = '';
            volumeArea.innerHTML = '';
            if (this.showMACD) macdArea.innerHTML = '';
            if (this.showRSI) rsiArea.innerHTML = '';

            // Créer le conteneur principal
            const chartContainer = document.createElement('div');
            chartContainer.style.position = 'relative';
            chartContainer.style.width = '100%';
            chartContainer.style.height = '100%';
            chartArea.appendChild(chartContainer);

            const canvas = document.createElement('canvas');
            canvas.id = 'chartjsStockChart';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.cursor = 'crosshair';
            chartContainer.appendChild(canvas);

            let datasets = [];

            if (this.chartType === 'line') {
                const lineData = this.prepareLineData(aggTimestamps, aggPrices);

                datasets = [
                    {
                        label: '',
                        data: lineData,
                        borderColor: '#4682b4',
                        backgroundColor: 'rgba(70, 130, 180, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 0
                    }
                ];

                // Ajouter les moyennes mobiles
                const ma20 = movingAverages.ma20;
                const ma50 = movingAverages.ma50;
                const ma200 = movingAverages.ma200;

                if (ma20.length > 0) {
                    const ma20Data = this.prepareLineData(aggTimestamps, ma20).filter(point => point.y !== null);
                    datasets.push({
                        label: 'MA20',
                        data: ma20Data,
                        borderColor: '#FF6600',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0
                    });
                }

                if (ma50.length > 0) {
                    const ma50Data = this.prepareLineData(aggTimestamps, ma50).filter(point => point.y !== null);
                    datasets.push({
                        label: 'MA50',
                        data: ma50Data,
                        borderColor: '#00FF00',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0
                    });
                }

                if (ma200.length > 0) {
                    const ma200Data = this.prepareLineData(aggTimestamps, ma200).filter(point => point.y !== null);
                    datasets.push({
                        label: 'MA200',
                        data: ma200Data,
                        borderColor: '#FF00FF',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0
                    });
                }

            } else if (this.chartType === 'candlestick') {
                const candleData = this.prepareCandleData(aggTimestamps, aggPrices);

                datasets = [
                    {
                        label: '',
                        data: candleData,
                        type: 'candlestick',
                        color: {
                            up: '#4CAF50',
                            down: '#F44336',
                            unchanged: '#999'
                        }
                    }
                ];


                // Ajouter les moyennes mobiles
                const ma20 = movingAverages.ma20;
                const ma50 = movingAverages.ma50;
                const ma200 = movingAverages.ma200;

                if (ma20.length > 0) {
                    const ma20Data = this.prepareLineData(aggTimestamps, ma20).filter(point => point.y !== null);
                    datasets.push({
                        label: 'MA20',
                        data: ma20Data,
                        type: 'line',
                        borderColor: '#FF6600',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0
                    });
                }

                if (ma50.length > 0) {
                    const ma50Data = this.prepareLineData(aggTimestamps, ma50).filter(point => point.y !== null);
                    datasets.push({
                        label: 'MA50',
                        data: ma50Data,
                        type: 'line',
                        borderColor: '#00FF00',
                        borderWidth : 1,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0
                    });
                }

                if (ma200.length > 0) {
                    const ma200Data = this.prepareLineData(aggTimestamps, ma200).filter(point => point.y !== null);
                    datasets.push({
                        label: 'MA200',
                        data: ma200Data,
                        type: 'line',
                        borderColor: '#FF00FF',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0
                    });
                }
            }

            const config = {
                type: this.chartType === 'line' ? 'line' : 'candlestick',
                data: { datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: `Graphique ${stockFullName}`,
                            font: { size: 16, weight: 'bold' },
                            color: '#263238'
                        },
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                filter: (item) => item.text !== ''
                            }
                        },
                        tooltip: { enabled: false },
                        zoom: {
                            pan: {
                                enabled: true,
                                mode: 'x',
                                modifierKey: null,
                                scaleMode: 'x',
                                threshold: 10
                            },
                            zoom: {
                                wheel: {
                                    enabled: true,
                                    speed: 0.05,
                                    modifierKey: null
                                },
                                pinch: {
                                    enabled: false
                                },
                                mode: 'x',
                                drag: {
                                    enabled: false,
                                }
                            },
                            limits: {
                                x: { min: 'original', max: 'original' },
                                y: { min: 'original', max: 'original' }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'day',
                                displayFormats: { day: 'dd/MM/yyyy' }
                            },
                            title: { display: true, text: 'Date' },
                            ticks: {
                                maxRotation: 0,
                                autoSkip: true,
                                maxTicksLimit: 8
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        },
                        y: {
                            type: 'linear',
                            position: 'right', // AXE DES PRIX À DROITE
                            title: { display: true, text: 'Prix (TND)' },
                            ticks: {
                                callback: (value) => {
                                    if (value !== null && value !== undefined && !isNaN(value)) {
                                        return value.toFixed(3) + ' TND';
                                    }
                                    return '';
                                }
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        }
                    },
                    interaction: {
                        mode: 'nearest',
                        intersect: false,
                        axis: 'x'
                    },
                    elements: {
                        point: {
                            radius: 0,
                            hoverRadius: 0
                        }
                    }
                }
            };

            if (this.stockChart) {
                this.stockChart.destroy();
            }

            this.stockChart = new Chart(canvas, config);
            this.setupCrosshairListeners(canvas, this.stockChart);

            // AJOUT: Stocker les données Ichimoku dans le graphique
            if (this.showIchimoku && ichimokuData) {
                this.stockChart.config._ichimokuData = {
                    ...ichimokuData,
                    timestamps: aggTimestamps.map(ts => ts * 1000)
                };
            }

            // AJOUT: Stocker les données Bollinger dans le graphique
            if (this.showBollinger && bollingerData) {
                this.stockChart.config._bollingerBandsData = {
                    ...bollingerData,
                    timestamps: aggTimestamps.map(ts => ts * 1000)
                };
            }

            // Créer le graphique de volume si les données sont disponibles
            if (hasVolumeData && aggVolumes.length > 0) {
                this.createVolumeChart(aggTimestamps, aggVolumes);
                volumeArea.style.display = 'block';
            } else {
                volumeArea.style.display = 'none';
            }

            // NOUVEAU: Créer le graphique MACD si activé
            if (this.showMACD && macdData) {
                this.createMACDChart(aggTimestamps, macdData);
                macdArea.style.display = 'block';
            }

            // NOUVEAU: Créer le graphique RSI si activé
            if (this.showRSI && rsiData) {
                this.createRSIChart(aggTimestamps, rsiData);
                rsiArea.style.display = 'block';
            }
            // AJOUT: Créer les nouveaux graphiques indicateurs
            if (this.showStochastic && stochasticData) {
                this.createStochasticChart(aggTimestamps, stochasticData);
                document.getElementById('stochasticChartsArea').style.display = 'block';
            }

            if (this.showWilliamsR && williamsRData) {
                this.createWilliamsRChart(aggTimestamps, williamsRData);
                document.getElementById('williamsRChartsArea').style.display = 'block';
            }

            const resetZoomBtn = document.getElementById('resetZoomBtn');
            if (resetZoomBtn) {
                resetZoomBtn.style.display = 'inline-block';
            }

            // Recréer le bouton de dessin après la mise à jour du graphique
            setTimeout(() => {
                this.setupDrawingTools();
            }, 100);

        } catch (error) {
            console.error('Erreur lors de la mise à jour du graphique:', error);
            chartArea.innerHTML = '<div class="error" style="display:flex;align-items:center;justify-content:center;height:100%;color:#d32f2f;font-size:1.2rem;">Erreur : ' + error.message + '</div>';
            volumeArea.style.display = 'none';
            if (this.showMACD) macdArea.style.display = 'none';
            if (this.showRSI) rsiArea.style.display = 'none';
            if (this.showStochastic) document.getElementById('stochasticChartsArea').style.display = 'none';
            if (this.showWilliamsR) document.getElementById('williamsRChartsArea').style.display = 'none';
        }

    }

    // NOUVELLE MÉTHODE: Créer le graphique de volume
    createVolumeChart(timestamps, volumes) {
        const volumeArea = document.getElementById('volumeChartsArea');
        if (!volumeArea) return;

        volumeArea.innerHTML = '';

        const volumeContainer = document.createElement('div');
        volumeContainer.style.position = 'relative';
        volumeContainer.style.width = '100%';
        volumeContainer.style.height = '100%';
        volumeArea.appendChild(volumeContainer);

        const canvas = document.createElement('canvas');
        canvas.id = 'chartjsVolumeChart';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        volumeContainer.appendChild(canvas);

        const volumeData = this.prepareVolumeData(timestamps, volumes);

        const config = {
            type: 'bar',
            data: {
                datasets: [{
                    label: 'Volume',
                    data: volumeData,
                    backgroundColor: (context) => {
                        const index = context.dataIndex;
                        if (index === 0) return 'rgba(100, 100, 100, 0.6)';

                        const currentVolume = volumes[index];
                        const previousVolume = volumes[index - 1];

                        if (currentVolume > previousVolume) {
                            return 'rgba(76, 175, 80, 0.6)'; // Vert pour volume croissant
                        } else if (currentVolume < previousVolume) {
                            return 'rgba(244, 67, 54, 0.6)'; // Rouge pour volume décroissant
                        } else {
                            return 'rgba(100, 100, 100, 0.6)'; // Gris pour volume stable
                        }
                    },
                    borderColor: 'rgba(100, 100, 100, 0.8)',
                    borderWidth: 1,
                    barPercentage: 0.9,
                    categoryPercentage: 0.8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                return `Volume: ${value.toLocaleString('fr-FR')}`;
                            }
                        }
                    },
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'x',
                            modifierKey: null,
                            scaleMode: 'x',
                            threshold: 10
                        },
                        zoom: {
                            wheel: {
                                enabled: true,
                                speed: 0.05,
                                modifierKey: null
                            },
                            pinch: {
                                enabled: false
                            },
                            mode: 'x',
                            drag: {
                                enabled: false,
                            }
                        },
                        limits: {
                            x: { min: 'original', max: 'original' },
                            y: { min: 'original', max: 'original' }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: { day: 'dd/MM/yyyy' }
                        },
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 8,
                            font: {
                                size: 9
                            }
                        },
                        padding: 0,
                        margin: 0
                    },
                    y: {
                        type: 'linear',
                        position: 'right',
                        title: {
                            display: false,
                        },
                        ticks: {
                            callback: function(value) {
                                if (value >= 1000000) {
                                    return (value / 1000000).toFixed(1) + 'M';
                                } else if (value >= 1000) {
                                    return (value / 1000).toFixed(1) + 'K';
                                }
                                return value;
                            },
                            font: {
                                size: 8
                            },
                            padding: 2
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        padding: 0,
                        margin: 0
                    }
                },
                interaction: {
                    mode: 'nearest',
                    intersect: false,
                    axis: 'x'
                },
                layout: {
                    padding: {
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0
                    }
                }
            }
        };

        if (this.volumeChart) {
            this.volumeChart.destroy();
        }

        this.volumeChart = new Chart(canvas, config);
    }

    // MÉTHODE CORRIGÉE: Créer le graphique MACD avec histogramme visible
    createMACDChart(timestamps, macdData) {
        const macdArea = document.getElementById('macdChartsArea');
        if (!macdArea) return;

        macdArea.innerHTML = '';

        const macdContainer = document.createElement('div');
        macdContainer.style.position = 'relative';
        macdContainer.style.width = '100%';
        macdContainer.style.height = '100%';
        macdArea.appendChild(macdContainer);

        const canvas = document.createElement('canvas');
        canvas.id = 'chartjsMACDChart';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        macdContainer.appendChild(canvas);

        const { macdLineData, signalLineData, histogramData } = this.prepareMACDData(timestamps, macdData);

        // NOUVEAU: Créer un dataset séparé pour l'histogramme
        const histogramDataset = {
            label: 'Histogramme',
            data: histogramData,
            type: 'bar',
            backgroundColor: (context) => {
                const value = context.parsed.y;
                if (value === null || value === undefined) return 'transparent';
                return value >= 0 ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)';
            },
            borderColor: (context) => {
                const value = context.parsed.y;
                if (value === null || value === undefined) return 'transparent';
                return value >= 0 ? 'rgba(76, 175, 80, 1)' : 'rgba(244, 67, 54, 1)';
            },
            borderWidth: 1,
            barPercentage: 0.8,
            categoryPercentage: 0.9,
            order: 1 // Mettre l'histogramme en arrière-plan
        };

        const config = {
            type: 'line',
            data: {
                datasets: [
                    // Histogramme en premier (arrière-plan)
                    histogramDataset,
                    // Lignes MACD et Signal par-dessus
                    {
                        label: 'MACD',
                        data: macdLineData,
                        borderColor: '#2962FF',
                        backgroundColor: 'rgba(41, 98, 255, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0,
                        tension: 0.4,
                        cubicInterpolationMode: 'monotone',
                        order: 2
                    },
                    {
                        label: 'Signal',
                        data: signalLineData,
                        borderColor: '#FF6D00',
                        backgroundColor: 'rgba(255, 109, 0, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0,
                        tension: 0.4,
                        cubicInterpolationMode: 'monotone',
                        order: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            font: {
                                size: 10
                            },
                            usePointStyle: true,
                            filter: (legendItem, chartData) => {
                                // Masquer la légende de l'histogramme pour garder seulement MACD et Signal
                                return legendItem.text !== 'Histogramme';
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'MACD (12,26,9)',
                        font: { size: 12, weight: 'bold' },
                        color: '#263238'
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#555',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(4);
                                }
                                return label;
                            }
                        }
                    },
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'x',
                            modifierKey: null,
                            scaleMode: 'x'
                        },
                        zoom: {
                            wheel: {
                                enabled: true,
                                speed: 0.05,
                                modifierKey: null
                            },
                            mode: 'x'
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: { day: 'dd/MM/yyyy' }
                        },
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 8,
                            font: {
                                size: 9
                            },
                            color: '#666'
                        },
                        padding: 0
                    },
                    y: {
                        type: 'linear',
                        position: 'right',
                        ticks: {
                            font: {
                                size: 9
                            },
                            color: '#666',
                            callback: function(value) {
                                return value.toFixed(3);
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                elements: {
                    point: {
                        radius: 0,
                        hoverRadius: 4
                    }
                }
            }
        };

        // Plugin pour la ligne zéro et les zones alternées
        const macdZonesPlugin = {
            id: 'macdZones',
            beforeDraw: (chart) => {
                const { ctx, chartArea, scales } = chart;
                const xScale = scales.x;
                const yScale = scales.y;

                ctx.save();

                // Dessiner la ligne zéro
                ctx.beginPath();
                ctx.setLineDash([2, 2]);
                ctx.strokeStyle = 'rgba(120, 120, 120, 0.6)';
                ctx.lineWidth = 1;
                const zeroY = yScale.getPixelForValue(0);
                ctx.moveTo(chartArea.left, zeroY);
                ctx.lineTo(chartArea.right, zeroY);
                ctx.stroke();
                ctx.setLineDash([]);

                // Calculer et dessiner les zones alternées
                const zones = this.calculateMACDZones(histogramData);

                zones.forEach(zone => {
                    if (zone.startIndex !== null && zone.endIndex !== null && zone.endIndex < histogramData.length) {
                        const startX = xScale.getPixelForValue(histogramData[zone.startIndex].x);
                        const endX = xScale.getPixelForValue(histogramData[zone.endIndex].x);

                        ctx.fillStyle = zone.type === 'bullish'
                            ? 'rgba(76, 175, 80, 0.08)'
                            : 'rgba(244, 67, 54, 0.08)';
                        ctx.fillRect(startX, chartArea.top, endX - startX, chartArea.bottom - chartArea.top);
                    }
                });

                ctx.restore();
            }
        };

        config.plugins = config.plugins || {};
        config.plugins.macdZones = macdZonesPlugin;

        if (this.macdChart) {
            this.macdChart.destroy();
        }

        this.macdChart = new Chart(canvas, config);
    }

    // MÉTHODE AMÉLIORÉE: Calculer les zones alternées du MACD
    calculateMACDZones(histogramData) {
        const zones = [];
        let currentZone = null;

        for (let i = 0; i < histogramData.length; i++) {
            const point = histogramData[i];
            if (point.y === null || point.y === undefined) continue;

            const isBullish = point.y >= 0;

            if (currentZone === null) {
                // Commencer une nouvelle zone
                currentZone = {
                    type: isBullish ? 'bullish' : 'bearish',
                    startIndex: i,
                    endIndex: i
                };
            } else if (currentZone.type === (isBullish ? 'bullish' : 'bearish')) {
                // Continuer la zone actuelle
                currentZone.endIndex = i;
            } else {
                // Changer de zone
                zones.push({...currentZone});
                currentZone = {
                    type: isBullish ? 'bullish' : 'bearish',
                    startIndex: i,
                    endIndex: i
                };
            }
        }

        // Ajouter la dernière zone
        if (currentZone !== null) {
            zones.push(currentZone);
        }

        return zones;
    }

    // MÉTHODE AMÉLIORÉE: Créer le graphique RSI avec bandes de zones
    createRSIChart(timestamps, rsi) {
        const rsiArea = document.getElementById('rsiChartsArea');
        if (!rsiArea) return;

        rsiArea.innerHTML = '';

        const rsiContainer = document.createElement('div');
        rsiContainer.style.position = 'relative';
        rsiContainer.style.width = '100%';
        rsiContainer.style.height = '100%';
        rsiArea.appendChild(rsiContainer);

        const canvas = document.createElement('canvas');
        canvas.id = 'chartjsRSIChart';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        rsiContainer.appendChild(canvas);

        // CORRECTION: S'assurer que le RSI a la même longueur que les timestamps
        const adjustedRSI = [...rsi];
        while (adjustedRSI.length < timestamps.length) {
            adjustedRSI.unshift(null);
        }

        const rsiData = this.prepareRSIData(timestamps, adjustedRSI);

        const config = {
            type: 'line',
            data: {
                datasets: [{
                    label: 'RSI (14)',
                    data: rsiData,
                    borderColor: '#7B1FA2',
                    backgroundColor: 'rgba(123, 31, 162, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    pointRadius : 0,
                    tension: 0.4,
                    cubicInterpolationMode: 'monotone'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            font: {
                                size: 10
                            },
                            usePointStyle: true
                        }
                    },
                    title: {
                        display: true,
                        text: 'RSI - Relative Strength Index',
                        font: { size: 12, weight: 'bold' },
                        color: '#263238'
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: function(context) {
                                return `RSI: ${context.parsed.y?.toFixed(2) || 'N/A'}`;
                            }
                        }
                    },
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'x',
                            modifierKey: null,
                            scaleMode: 'x'
                        },
                        zoom: {
                            wheel: {
                                enabled: true,
                                speed: 0.05,
                                modifierKey: null
                            },
                            mode: 'x'
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: { day: 'dd/MM/yyyy' }
                        },
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 8,
                            font: {
                                size: 9
                            },
                            color: '#666'
                        },
                        padding: 0
                    },
                    y: {
                        type: 'linear',
                        min: 0,
                        max: 100,
                        position: 'right',
                        ticks: {
                            font: {
                                size: 9
                            },
                            color: '#666',
                            callback: function(value) {
                                return value + '%';
                            },
                            stepSize: 25
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                elements: {
                    point: {
                        radius: 0,
                        hoverRadius: 4
                    }
                }
            }
        };

        // Plugin pour les bandes RSI colorées avec style amélioré
        const rsiZonesPlugin = {
            id: 'rsiZones',
            beforeDraw: (chart) => {
                const { ctx, chartArea, scales } = chart;
                const { top, bottom, left, right } = chartArea;
                const yScale = scales.y;

                // Zone de surachat (70-100) - Rouge avec bande
                const overboughtTop = yScale.getPixelForValue(100);
                const overboughtBottom = yScale.getPixelForValue(70);

                ctx.save();

                // Bande de surachat - Rouge
                ctx.fillStyle = 'rgba(244, 67, 54, 0.15)';
                ctx.fillRect(left, overboughtBottom, right - left, overboughtTop - overboughtBottom);

                // Zone neutre supérieure (50-70) - Orange clair
                const neutralTop = yScale.getPixelForValue(70);
                const neutralMiddle = yScale.getPixelForValue(50);

                ctx.fillStyle = 'rgba(255, 193, 7, 0.08)';
                ctx.fillRect(left, neutralMiddle, right - left, neutralTop - neutralMiddle);

                // Zone neutre inférieure (30-50) - Jaune clair
                const neutralBottom = yScale.getPixelForValue(30);

                ctx.fillStyle = 'rgba(255, 235, 59, 0.08)';
                ctx.fillRect(left, neutralBottom, right - left, neutralMiddle - neutralBottom);

                // Zone de survente (0-30) - Vert avec bande
                const oversoldTop = yScale.getPixelForValue(30);
                const oversoldBottom = yScale.getPixelForValue(0);

                ctx.fillStyle = 'rgba(76, 175, 80, 0.15)';
                ctx.fillRect(left, oversoldBottom, right - left, oversoldTop - oversoldBottom);
                ctx.restore();

                // Lignes de séparation avec style amélioré
                ctx.save();
                ctx.setLineDash([3, 3]);
                ctx.lineWidth = 1;

                // Ligne surachat (70)
                ctx.strokeStyle = 'rgba(244, 67, 54, 0.7)';
                ctx.beginPath();
                ctx.moveTo(left, overboughtBottom);
                ctx.lineTo(right, overboughtBottom);
                ctx.stroke();

                // Ligne survente (30)
                ctx.strokeStyle = 'rgba(76, 175, 80, 0.7)';
                ctx.beginPath();
                ctx.moveTo(left, neutralBottom);
                ctx.lineTo(right, neutralBottom);
                ctx.stroke();

                // Ligne médiane (50)
                ctx.strokeStyle = 'rgba(120, 120, 120, 0.5)';
                ctx.setLineDash([2, 2]);
                const medianY = yScale.getPixelForValue(50);
                ctx.beginPath();
                ctx.moveTo(left, medianY);
                ctx.lineTo(right, medianY);
                ctx.stroke();

                ctx.restore();

                // Labels des zones avec style amélioré
                ctx.save();
                ctx.font = 'bold 10px Arial';
                ctx.fillStyle = '#F44336';
                ctx.textAlign = 'right';
                ctx.fillText('SURACHAT', right - 8, overboughtBottom + 12);

                ctx.fillStyle = '#4CAF50';
                ctx.fillText('SURVENTE', right - 8, neutralBottom + 12);

                ctx.fillStyle = '#666';
                ctx.font = '9px Arial';
                ctx.textAlign = 'left';
                ctx.fillText('Neutre', left + 5, medianY + 4);

                ctx.textAlign = 'right';
                ctx.fillText('70', right - 5, overboughtBottom - 3);
                ctx.fillText('30', right - 5, neutralBottom - 3);
                ctx.fillText('50', right - 5, medianY - 3);
                ctx.restore();
            }
        };

        config.plugins = config.plugins || {};
        config.plugins.rsiZones = rsiZonesPlugin;

        if (this.rsiChart) {
            this.rsiChart.destroy();
        }

        this.rsiChart = new Chart(canvas, config);
    }
    // AJOUT: Créer le graphique Stochastic
    createStochasticChart(timestamps, stochasticData) {
        const stochasticArea = document.getElementById('stochasticChartsArea');
        if (!stochasticArea) return;

        stochasticArea.innerHTML = '';

        const stochasticContainer = document.createElement('div');
        stochasticContainer.style.position = 'relative';
        stochasticContainer.style.width = '100%';
        stochasticContainer.style.height = '100%';
        stochasticArea.appendChild(stochasticContainer);

        const canvas = document.createElement('canvas');
        canvas.id = 'chartjsStochasticChart';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        stochasticContainer.appendChild(canvas);

        const { k, d } = stochasticData;

        const kData = timestamps.map((timestamp, index) => ({
            x: timestamp * 1000,
            y: k[index] !== null ? k[index] : null
        }));

        const dData = timestamps.map((timestamp, index) => ({
            x: timestamp * 1000,
            y: d[index] !== null ? d[index] : null
        }));

        const config = {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: '%K',
                        data: kData,
                        borderColor: '#FF6B6B',
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0,
                        tension: 0.4,
                        cubicInterpolationMode: 'monotone'
                    },
                    {
                        label: '%D',
                        data: dData,
                        borderColor: '#4ECDC4',
                        backgroundColor: 'rgba(78, 205, 196, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0,
                        tension: 0.4,
                        cubicInterpolationMode: 'monotone'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            font: {
                                size: 10
                            },
                            usePointStyle: true
                        }
                    },
                    title: {
                        display: true,
                        text: 'Stochastic Oscillator (14,3)',
                        font: { size: 12, weight: 'bold' },
                        color: '#263238'
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(1) + '%';
                                }
                                return label;
                            }
                        }
                    },
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'x',
                            modifierKey: null,
                            scaleMode: 'x'
                        },
                        zoom: {
                            wheel: {
                                enabled: true,
                                speed: 0.05,
                                modifierKey: null
                            },
                            mode: 'x'
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: { day: 'dd/MM/yyyy' }
                        },
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 8,
                            font: {
                                size: 9
                            },
                            color: '#666'
                        },
                        padding: 0
                    },
                    y: {
                        type: 'linear',
                        min: 0,
                        max: 100,
                        position: 'right',
                        ticks: {
                            font: {
                                size: 9
                            },
                            color: '#666',
                            callback: function(value) {
                                return value + '%';
                            },
                            stepSize: 20
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                elements: {
                    point: {
                        radius: 0,
                        hoverRadius: 4
                    }
                }
            }
        };

        // Plugin pour les zones Stochastic
        const stochasticZonesPlugin = {
            id: 'stochasticZones',
            beforeDraw: (chart) => {
                const { ctx, chartArea, scales } = chart;
                const { top, bottom, left, right } = chartArea;
                const yScale = scales.y;

                ctx.save();

                // Zone de surachat (80-100)
                const overboughtTop = yScale.getPixelForValue(100);
                const overboughtBottom = yScale.getPixelForValue(80);
                ctx.fillStyle = 'rgba(244, 67, 54, 0.1)';
                ctx.fillRect(left, overboughtBottom, right - left, overboughtTop - overboughtBottom);

                // Zone de survente (0-20)
                const oversoldTop = yScale.getPixelForValue(20);
                const oversoldBottom = yScale.getPixelForValue(0);
                ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
                ctx.fillRect(left, oversoldBottom, right - left, oversoldTop - oversoldBottom);

                // Lignes de séparation
                ctx.setLineDash([3, 3]);
                ctx.lineWidth = 1;

                // Ligne surachat (80)
                ctx.strokeStyle = 'rgba(244, 67, 54, 0.6)';
                ctx.beginPath();
                ctx.moveTo(left, overboughtBottom);
                ctx.lineTo(right, overboughtBottom);
                ctx.stroke();

                // Ligne survente (20)
                ctx.strokeStyle = 'rgba(76, 175, 80, 0.6)';
                ctx.beginPath();
                ctx.moveTo(left, oversoldTop);
                ctx.lineTo(right, oversoldTop);
                ctx.stroke();

                // Ligne médiane (50)
                ctx.strokeStyle = 'rgba(120, 120, 120, 0.4)';
                const medianY = yScale.getPixelForValue(50);
                ctx.beginPath();
                ctx.moveTo(left, medianY);
                ctx.lineTo(right, medianY);
                ctx.stroke();

                ctx.restore();

                // Labels
                ctx.save();
                ctx.font = 'bold 10px Arial';
                ctx.fillStyle = '#F44336';
                ctx.textAlign = 'right';
                ctx.fillText('SURACHAT', right - 8, overboughtBottom + 12);

                ctx.fillStyle = '#4CAF50';
                ctx.fillText('SURVENTE', right - 8, oversoldTop + 12);

                ctx.restore();
            }
        };

        config.plugins = config.plugins || {};
        config.plugins.stochasticZones = stochasticZonesPlugin;

        if (this.stochasticChart) {
            this.stochasticChart.destroy();
        }

        this.stochasticChart = new Chart(canvas, config);
    }

// AJOUT: Créer le graphique Williams %R
    createWilliamsRChart(timestamps, williamsRData) {
        const williamsRArea = document.getElementById('williamsRChartsArea');
        if (!williamsRArea) return;

        williamsRArea.innerHTML = '';

        const williamsRContainer = document.createElement('div');
        williamsRContainer.style.position = 'relative';
        williamsRContainer.style.width = '100%';
        williamsRContainer.style.height = '100%';
        williamsRArea.appendChild(williamsRContainer);

        const canvas = document.createElement('canvas');
        canvas.id = 'chartjsWilliamsRChart';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        williamsRContainer.appendChild(canvas);

        const williamsRChartData = timestamps.map((timestamp, index) => ({
            x: timestamp * 1000,
            y: williamsRData[index] !== null ? williamsRData[index] : null
        }));

        const config = {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Williams %R',
                    data: williamsRChartData,
                    borderColor: '#9C27B0',
                    backgroundColor: 'rgba(156, 39, 176, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0,
                    tension: 0.4,
                    cubicInterpolationMode: 'monotone'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            font: {
                                size: 10
                            },
                            usePointStyle: true
                        }
                    },
                    title: {
                        display: true,
                        text: 'Williams %R (14)',
                        font: { size: 12, weight: 'bold' },
                        color: '#263238'
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: function(context) {
                                return `Williams %R: ${context.parsed.y?.toFixed(1) + '%' || 'N/A'}`;
                            }
                        }
                    },
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'x',
                            modifierKey: null,
                            scaleMode: 'x'
                        },
                        zoom: {
                            wheel: {
                                enabled: true,
                                speed: 0.05,
                                modifierKey: null
                            },
                            mode: 'x'
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: { day: 'dd/MM/yyyy' }
                        },
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 8,
                            font: {
                                size: 9
                            },
                            color: '#666'
                        },
                        padding: 0
                    },
                    y: {
                        type: 'linear',
                        min: -100,
                        max: 0,
                        position: 'right',
                        ticks: {
                            font: {
                                size: 9
                            },
                            color: '#666',
                            callback: function(value) {
                                return value + '%';
                            },
                            stepSize: 20
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                elements: {
                    point: {
                        radius: 0,
                        hoverRadius: 4
                    }
                }
            }
        };

        // Plugin pour les zones Williams %R
        const williamsRZonesPlugin = {
            id: 'williamsRZones',
            beforeDraw: (chart) => {
                const { ctx, chartArea, scales } = chart;
                const { top, bottom, left, right } = chartArea;
                const yScale = scales.y;

                ctx.save();

                // Zone de surachat (-20 à 0)
                const overboughtTop = yScale.getPixelForValue(0);
                const overboughtBottom = yScale.getPixelForValue(-20);
                ctx.fillStyle = 'rgba(244, 67, 54, 0.1)';
                ctx.fillRect(left, overboughtBottom, right - left, overboughtTop - overboughtBottom);

                // Zone de survente (-80 à -100)
                const oversoldTop = yScale.getPixelForValue(-80);
                const oversoldBottom = yScale.getPixelForValue(-100);
                ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
                ctx.fillRect(left, oversoldBottom, right - left, oversoldTop - oversoldBottom);

                // Lignes de séparation
                ctx.setLineDash([3, 3]);
                ctx.lineWidth = 1;

                // Ligne surachat (-20)
                ctx.strokeStyle = 'rgba(244, 67, 54, 0.6)';
                ctx.beginPath();
                ctx.moveTo(left, overboughtBottom);
                ctx.lineTo(right, overboughtBottom);
                ctx.stroke();

                // Ligne survente (-80)
                ctx.strokeStyle = 'rgba(76, 175, 80, 0.6)';
                ctx.beginPath();
                ctx.moveTo(left, oversoldTop);
                ctx.lineTo(right, oversoldTop);
                ctx.stroke();

                ctx.restore();

                // Labels
                ctx.save();
                ctx.font = 'bold 10px Arial';
                ctx.fillStyle = '#F44336';
                ctx.textAlign = 'right';
                ctx.fillText('SURACHAT', right - 8, overboughtBottom + 12);

                ctx.fillStyle = '#4CAF50';
                ctx.fillText('SURVENTE', right - 8, oversoldTop + 12);

                ctx.restore();
            }
        };

        config.plugins = config.plugins || {};
        config.plugins.williamsRZones = williamsRZonesPlugin;

        if (this.williamsRChart) {
            this.williamsRChart.destroy();
        }

        this.williamsRChart = new Chart(canvas, config);
    }

    setupFullscreenChart() {
        const btn = document.getElementById('fullscreenDataChartBtn');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const container = document.getElementById('dataChartsContainer');
            if (!container) return;

            if (!document.fullscreenElement) {
                if (container.requestFullscreen) container.requestFullscreen();
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
        });

        document.addEventListener('fullscreenchange', () => {
            const iconElement = btn.querySelector('i');
            if (iconElement) {
                if (document.fullscreenElement) {
                    iconElement.classList.remove('fa-expand');
                    iconElement.classList.add('fa-compress');
                } else {
                    iconElement.classList.remove('fa-compress');
                    iconElement.classList.add('fa-expand');
                }
            }

            // Redimensionner tous les graphiques
            const charts = [this.stockChart, this.volumeChart, this.macdChart, this.rsiChart].filter(chart => chart);
            charts.forEach(chart => {
                setTimeout(() => chart.resize(), 100);
            });
        });
    }

    // Méthode alternative combinant les canvas individuels
    // Méthode alternative combinant les canvas individuels
    setupDownloadChart() {
        const btn = document.getElementById('downloadDataChartBtn');
        if (!btn) return;

        btn.addEventListener('click', () => {
            let stockFullName = 'Action';
            const symbolSelect = document.getElementById('dataChartsSymbol');

            if (symbolSelect && symbolSelect.value) {
                const selectedOption = symbolSelect.options[symbolSelect.selectedIndex];
                stockFullName = selectedOption.textContent.split(' - ')[1] || selectedOption.value;
                stockFullName = stockFullName.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_');
            }

            const canvases = [];

            // Récupérer tous les canvas des graphiques visibles (UNE SEULE FOIS)
            if (this.stockChart) canvases.push(this.stockChart.canvas);
            if (this.volumeChart && document.getElementById('volumeChartsArea').style.display !== 'none') {
                canvases.push(this.volumeChart.canvas);
            }
            if (this.macdChart && document.getElementById('macdChartsArea').style.display !== 'none') {
                canvases.push(this.macdChart.canvas);
            }
            if (this.rsiChart && document.getElementById('rsiChartsArea').style.display !== 'none') {
                canvases.push(this.rsiChart.canvas);
            }
            // AJOUT: Nouveaux graphiques
            if (this.stochasticChart && document.getElementById('stochasticChartsArea').style.display !== 'none') {
                canvases.push(this.stochasticChart.canvas);
            }
            if (this.williamsRChart && document.getElementById('williamsRChartsArea').style.display !== 'none') {
                canvases.push(this.williamsRChart.canvas);
            }

            if (canvases.length === 0) return;

            // Créer un canvas combiné
            const totalHeight = canvases.reduce((sum, canvas) => sum + canvas.height, 0);
            const maxWidth = Math.max(...canvases.map(canvas => canvas.width));

            const combinedCanvas = document.createElement('canvas');
            combinedCanvas.width = maxWidth;
            combinedCanvas.height = totalHeight;
            const ctx = combinedCanvas.getContext('2d');

            // Dessiner tous les canvas les uns sous les autres
            let currentY = 0;
            canvases.forEach(canvas => {
                ctx.drawImage(canvas, 0, currentY);
                currentY += canvas.height;
            });

            // Télécharger avec nom personnalisé
            const link = document.createElement('a');
            const fileName = `graphique_${stockFullName}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.png`;
            link.href = combinedCanvas.toDataURL('image/png');
            link.download = fileName;
            link.click();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.dataChartsInstance = new DataCharts();
});