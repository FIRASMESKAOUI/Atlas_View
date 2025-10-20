// indicators.js - Indicateurs techniques supplémentaires

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

        // Trouver le premier index où les deux spans ont des valeurs
        let startIndex = 0;
        for (let i = 0; i < timestamps.length; i++) {
            if (leadingSpanA[i] !== null && leadingSpanB[i] !== null) {
                startIndex = i;
                break;
            }
        }

        // Créer des tableaux pour les zones
        const upperPath = [];
        const lowerPath = [];

        // Construire les chemins pour la zone du nuage
        for (let i = startIndex; i < timestamps.length; i++) {
            if (leadingSpanA[i] === null || leadingSpanB[i] === null) continue;

            const x = xScale.getPixelForValue(timestamps[i]);
            const yA = yScale.getPixelForValue(leadingSpanA[i]);
            const yB = yScale.getPixelForValue(leadingSpanB[i]);

            // Déterminer quelle est la borne supérieure et inférieure
            if (leadingSpanA[i] > leadingSpanB[i]) {
                upperPath.push({ x, y: yA });
                lowerPath.push({ x, y: yB });
            } else {
                upperPath.push({ x, y: yB });
                lowerPath.push({ x, y: yA });
            }
        }

        if (upperPath.length === 0 || lowerPath.length === 0) return;

        // Dessiner la zone du nuage
        ctx.beginPath();

        // Dessiner le chemin supérieur
        for (let i = 0; i < upperPath.length; i++) {
            if (i === 0) {
                ctx.moveTo(upperPath[i].x, upperPath[i].y);
            } else {
                ctx.lineTo(upperPath[i].x, upperPath[i].y);
            }
        }

        // Dessiner le chemin inférieur en sens inverse
        for (let i = lowerPath.length - 1; i >= 0; i--) {
            ctx.lineTo(lowerPath[i].x, lowerPath[i].y);
        }

        ctx.closePath();

        // Déterminer la couleur du nuage basée sur la dernière valeur
        const lastIndex = leadingSpanA.length - 1;
        let cloudColor;

        if (lastIndex >= 0 && leadingSpanA[lastIndex] !== null && leadingSpanB[lastIndex] !== null) {
            cloudColor = leadingSpanA[lastIndex] > leadingSpanB[lastIndex]
                ? 'rgba(76, 175, 80, 0.2)'  // Vert plus visible
                : 'rgba(244, 67, 54, 0.2)'; // Rouge plus visible
        } else {
            // Couleur par défaut si pas de données récentes
            cloudColor = 'rgba(120, 120, 120, 0.15)';
        }

        ctx.fillStyle = cloudColor;
        ctx.fill();

        // Optionnel: Ajouter une bordure pour mieux voir les limites
        ctx.strokeStyle = cloudColor.replace('0.2', '0.5');
        ctx.lineWidth = 0.5;
        ctx.stroke();
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