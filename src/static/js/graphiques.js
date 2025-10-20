// Module pour la gestion des graphiques avancés
// Ce module s'occupe de l'affichage et de la manipulation des graphiques financiers

// Variables globales
let mainChart = null;
let currentSymbol = "TUNINDEX";
let currentPeriod = "3M";
let currentChartType = "line";
let marketData = {};

// Initialisation du module
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM chargé - Initialisation du module graphiques');

    // Ajouter un event listener pour la navigation
    setupNavigation();

    // Initialiser les contrôles
    setupControls();
});

// Configuration de la navigation
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === '#graphiques') {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Navigation vers la section graphiques');

                // Afficher la section graphiques
                showGraphiquesSection();
            });
        }
    });

    // Vérifier si la section graphique est active au chargement
    if (window.location.hash === '#graphiques') {
        console.log('Section graphiques active au chargement');
        // Laisser un peu de temps au DOM pour se charger complètement
        setTimeout(showGraphiquesSection, 100);
    }
}

// Fonction pour afficher la section graphiques
function showGraphiquesSection() {
    console.log('Affichage de la section graphiques');

    // Masquer toutes les sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Désactiver tous les liens de navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Activer la section graphiques
    const graphiquesSection = document.getElementById('graphiques');
    if (graphiquesSection) {
        graphiquesSection.classList.add('active');
    }

    // Activer le lien de navigation
    const graphiquesLink = document.querySelector('.nav-link[href="#graphiques"]');
    if (graphiquesLink) {
        graphiquesLink.classList.add('active');
    }

    // Mettre à jour les données des indices
    updateMarketIndices();

    // Initialiser les graphiques des indices
    if (typeof initIndexCharts === 'function') {
        console.log('Appel de la fonction initIndexCharts pour afficher les graphiques');
        initIndexCharts();
    } else {
        console.error('La fonction initIndexCharts n\'est pas disponible');
    }

    // Initialiser le graphique principal
    initMainChart();
}

// Configuration des contrôles
function setupControls() {
    // Event listener pour le bouton "Appliquer"
    const applyButton = document.getElementById('apply-chart-settings');
    if (applyButton) {
        applyButton.addEventListener('click', applyChartSettings);
    }

    // Initialiser la liste des symboles
    populateSymbols();
}

// Fonction pour remplir la liste des symboles (actions)
async function populateSymbols() {
    try {
        const symbolSelect = document.getElementById('chart-symbol');
        if (!symbolSelect) return;

        // Conserver les options d'indices existantes
        const defaultOptions = Array.from(symbolSelect.options)
            .filter(option => ['TUNINDEX', 'TUNINDEX20'].includes(option.value));

        // Vider le select
        symbolSelect.innerHTML = '';

        // Remettre les options d'indices
        defaultOptions.forEach(option => {
            symbolSelect.appendChild(option);
        });

        // Essayer de récupérer les actions depuis l'API
        try {
            const response = await fetch('/api/stocks');
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const stocks = await response.json();

            // Ajouter les actions
            if (stocks && stocks.length > 0) {
                // Créer un groupe d'options pour les actions
                const stocksGroup = document.createElement('optgroup');
                stocksGroup.label = "Actions";

                // Ajouter chaque action au groupe
                stocks.forEach(stock => {
                    const option = document.createElement('option');
                    option.value = stock.symbol || stock.isin;
                    option.textContent = `${stock.name || stock.symbol} (${stock.symbol || stock.isin})`;
                    stocksGroup.appendChild(option);
                });

                // Ajouter le groupe au select
                symbolSelect.appendChild(stocksGroup);
            }
        } catch (apiError) {
            console.warn('Erreur lors de la récupération des actions:', apiError);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des symboles:', error);
    }
}

// Fonction pour initialiser le graphique principal
function initMainChart() {
    const canvas = document.getElementById('mainChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Si un graphique existe déjà, le détruire
    if (mainChart) {
        mainChart.destroy();
        mainChart = null;
    }

    // Configuration initiale du graphique
    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: currentSymbol,
                data: [],
                borderColor: currentSymbol === 'TUNINDEX' ? '#3182ce' : '#38a169',
                backgroundColor: currentSymbol === 'TUNINDEX' ? '#3182ce30' : '#38a16930',
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
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            month: 'MMM yyyy'
                        }
                    },
                    title: {
                        display: false
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Valeur'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `${currentSymbol} - ${currentPeriod}`,
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(tooltipItems) {
                            // Formater la date pour l'infobulle
                            const date = new Date(tooltipItems[0].parsed.x);
                            return date.toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            });
                        },
                        label: function(context) {
                            return `${context.dataset.label}: ${formatNumberFallback(context.parsed.y, 2)}`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            }
        }
    });

    // Charger les données
    loadChartData();
}

// Fonction pour appliquer les paramètres du graphique
function applyChartSettings() {
    const chartTypeSelect = document.getElementById('chart-type');
    const chartPeriodSelect = document.getElementById('chart-period');
    const chartSymbolSelect = document.getElementById('chart-symbol');

    if (!chartTypeSelect || !chartPeriodSelect || !chartSymbolSelect) return;

    // Récupérer les valeurs sélectionnées
    const newChartType = chartTypeSelect.value;
    const newPeriod = chartPeriodSelect.value;
    const newSymbol = chartSymbolSelect.value;

    // Vérifier si les valeurs ont changé
    const hasChanged = newChartType !== currentChartType ||
                       newPeriod !== currentPeriod ||
                       newSymbol !== currentSymbol;

    if (!hasChanged) return;

    // Mettre à jour les variables globales
    currentChartType = newChartType;
    currentPeriod = newPeriod;
    currentSymbol = newSymbol;

    // Mettre à jour le graphique
    updateChartType();
    loadChartData();
}

// Fonction pour mettre à jour le type de graphique
function updateChartType() {
    if (!mainChart) return;

    // Mettre à jour les options du graphique selon le type
    const datasets = mainChart.data.datasets;
    const color = currentSymbol === 'TUNINDEX' ? '#3182ce' :
                  currentSymbol === 'TUNINDEX20' ? '#38a169' : '#3b82f6';
    const colorWithAlpha = color + '30';

    // Mettre à jour le dataset
    if (datasets && datasets.length > 0) {
        datasets[0].borderColor = color;
        if (currentChartType === 'area') {
            datasets[0].backgroundColor = colorWithAlpha;
            datasets[0].fill = true;
        } else if (currentChartType === 'line') {
            datasets[0].backgroundColor = color;
            datasets[0].fill = false;
        } else {
            datasets[0].backgroundColor = color;
            datasets[0].fill = false;
        }
        datasets[0].pointRadius = 0;
        datasets[0].tension = 0.2;
    }

    // Mettre à jour le titre
    if (mainChart.options.plugins.title) {
        mainChart.options.plugins.title.text = `${currentSymbol} - ${currentPeriod}`;
    }

    // Appliquer le type de graphique
    mainChart.config.type = currentChartType === 'candlestick' ? 'bar' : currentChartType === 'area' ? 'line' : currentChartType;

    // Actualiser le graphique
    mainChart.update();
}

// Fonction pour charger les données du graphique
async function loadChartData() {
    if (!mainChart) return;

    // Afficher l'animation de chargement
    showLoading();

    try {
        // Déterminer l'ISIN pour les indices
        let isin = null;
        if (currentSymbol === 'TUNINDEX') {
            isin = TUNINDEX_ISIN;
        } else if (currentSymbol === 'TUNINDEX20') {
            isin = TUNINDEX20_ISIN;
        }

        // Récupérer les données
        let data;
        if (isin) {
            // C'est un indice, utiliser l'API d'indices
            data = await fetchIndexHistory(isin);
        } else {
            // C'est une action, utiliser l'API des actions
            data = await fetchStockHistory(currentSymbol);
        }

        // --- Ajout pour le type chandelier ---
        if (currentChartType === 'candlestick' && data && data.length > 1) {
            // Générer les bougies (open = close veille, close = close du jour)
            const candles = [];
            for (let i = 1; i < data.length; i++) {
                const prev = data[i - 1];
                const curr = data[i];
                const open = prev.y;
                const close = curr.y;
                candles.push({
                    x: curr.x,
                    o: open,
                    c: close,
                    backgroundColor: close > open ? '#38a169' : '#e53e3e', // vert ou rouge
                    borderColor: close > open ? '#38a169' : '#e53e3e',
                });
            }
            // Adapter le dataset pour Chart.js (type bar)
            mainChart.data.datasets[0].data = candles.map(c => ({x: c.x, y: [c.o, c.c]}));
            mainChart.data.datasets[0].backgroundColor = candles.map(c => c.backgroundColor);
            mainChart.data.datasets[0].borderColor = candles.map(c => c.borderColor);
            mainChart.data.datasets[0].label = currentSymbol;
            mainChart.update();
        } else if (data && data.length > 0) {
            // Cas standard (ligne, area, etc.)
            mainChart.data.datasets[0].data = data;
            mainChart.data.datasets[0].label = currentSymbol;
            mainChart.update();
        }
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        // Afficher un message d'erreur à l'utilisateur
        showToast('Erreur lors du chargement des données', 'error');
    } finally {
        // Masquer l'animation de chargement
        hideLoading();
    }
}

// Fonction pour récupérer l'historique d'une action
async function fetchStockHistory(symbol) {
    try {
        // Convertir la période en paramètre API
        const period = getPeriodParam();

        // Récupérer les données de l'API
        const response = await fetch(`/api/stocks/${symbol}/history?period=${period}`);
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();

        // Vérifier que les données sont valides
        if (!data || !Array.isArray(data)) {
            throw new Error('Format de données invalide');
        }

        // Formater les données pour le graphique
        return data.map(item => ({
            x: new Date(item.date),
            y: item.close || item.value
        }));
    } catch (error) {
        console.error(`Erreur lors de la récupération de l'historique de l'action ${symbol}:`, error);

        // Données de démonstration pour une action
        return getDemoStockData(symbol);
    }
}

// Fonction de secours pour formater les nombres
function formatNumberFallback(num, decimals = 2) {
    // Utiliser la fonction globale si elle existe
    if (typeof window.formatNumber === 'function') {
        return window.formatNumber(num, decimals);
    }

    // Sinon, utiliser cette implémentation de secours
    if (num === null || num === undefined || isNaN(num)) return '-';

    const number = parseFloat(num);

    if (Math.abs(number) >= 1000000) {
        return (number / 1000000).toFixed(1) + 'M';
    } else if (Math.abs(number) >= 1000) {
        return (number / 1000).toFixed(1) + 'K';
    }

    return number.toFixed(decimals);
}

// Générer des données de démonstration pour une action
function getDemoStockData(symbol) {
    const now = new Date();
    const data = [];

    // Prix de base aléatoire entre 10 et 100
    const basePrice = 10 + Math.random() * 90;

    // Générer 90 jours de données (environ 3 mois)
    let currentPrice = basePrice;
    for (let i = 90; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);

        // Variation quotidienne entre -3% et +3%
        const dailyChange = currentPrice * (Math.random() * 0.06 - 0.03);
        currentPrice += dailyChange;

        // S'assurer que le prix reste positif
        if (currentPrice <= 0) {
            currentPrice = 0.01;
        }

        data.push({
            x: date,
            y: currentPrice
        });
    }

    return data;
}

// Fonction pour convertir la période en paramètre API
function getPeriodParam() {
    switch (currentPeriod) {
        case '1D': return 'day';
        case '1W': return 'week';
        case '1M': return 'month';
        case '3M': return '3months';
        case '6M': return '6months';
        case '1Y': return 'year';
        case 'YTD': return 'ytd';
        case 'MAX': return 'max';
        default: return '3months';
    }
}

// Fonctions pour afficher/masquer l'animation de chargement
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Connexion WebSocket pour la mise à jour en temps réel
(function setupWebSocket() {
    // Utilise le protocole approprié selon http/https
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = protocol + '://localhost:8000/socket.io/?EIO=4&transport=websocket';
    let socket;
    try {
        socket = new WebSocket(wsUrl);
    } catch (e) {
        console.warn('WebSocket non supporté ou erreur de connexion:', e);
        return;
    }
    socket.onopen = function() {
        console.log('WebSocket connecté pour la mise à jour des graphiques.');
    };
    socket.onmessage = function(event) {
        // Les messages Socket.IO commencent par un code, il faut parser le message
        if (event.data && event.data.includes('update_chart')) {
            console.log('Événement de mise à jour reçu, rafraîchissement du graphique.');
            loadChartData();
        }
    };
    socket.onerror = function(error) {
        console.warn('Erreur WebSocket:', error);
    };
    socket.onclose = function() {
        console.log('WebSocket fermé.');
    };
})();

// --- Mode pivot pour tracé de ligne ---
let isDrawingLine = false;
let drawnLines = [];
let selectedLineIndex = null;
let dragMode = null; // 'move', 'start', 'end', null
let dragOffset = {x: 0, y: 0};
let pivotPoint = null; // Point d'ancrage temporaire
let previewEnd = null; // Extrémité temporaire pour l'aperçu

function getLineSettings() {
    const color = document.getElementById('line-color')?.value || '#1976d2';
    const width = parseInt(document.getElementById('line-width')?.value) || 2;
    return { color, width };
}

function enableLineDrawingMode() {
    isDrawingLine = true;
    selectedLineIndex = null;
    dragMode = null;
    pivotPoint = null;
    previewEnd = null;
    const btn = document.getElementById('draw-line-btn');
    if (btn) btn.classList.add('active');
    const canvas = document.getElementById('mainChart');
    if (canvas) canvas.style.cursor = 'crosshair';
}

function disableLineDrawingMode() {
    isDrawingLine = false;
    dragMode = null;
    pivotPoint = null;
    previewEnd = null;
    const btn = document.getElementById('draw-line-btn');
    if (btn) btn.classList.remove('active');
    const canvas = document.getElementById('mainChart');
    if (canvas) canvas.style.cursor = 'default';
}

document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...
    const drawLineBtn = document.getElementById('draw-line-btn');
    if (drawLineBtn) {
        drawLineBtn.addEventListener('click', function() {
            if (!isDrawingLine) enableLineDrawingMode();
            else disableLineDrawingMode();
        });
    }
    const canvas = document.getElementById('mainChart');
    if (canvas) {
        canvas.addEventListener('mousedown', onCanvasMouseDown);
        canvas.addEventListener('mousemove', onCanvasMouseMove);
        canvas.addEventListener('mouseup', onCanvasMouseUp);
        canvas.addEventListener('mouseleave', onCanvasMouseLeave);
    }
    document.getElementById('line-color')?.addEventListener('input', redrawChartWithLines);
    document.getElementById('line-width')?.addEventListener('input', redrawChartWithLines);
});

// Gestion du mini-toolbar contextuel (rectangle) pour la ligne sélectionnée
function setupLineToolbarEvents() {
    const colorInput = document.getElementById('toolbar-line-color');
    colorInput.addEventListener('input', function() {
        if (selectedLineIndex !== null && drawnLines[selectedLineIndex]) {
            drawnLines[selectedLineIndex].color = colorInput.value;
            redrawChartWithLines();
            showLineToolbar();
        }
    });
    // Gestion des boutons SVG pour l'épaisseur
    const widthBtns = document.querySelectorAll('.toolbar-line-width-btn');
    widthBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const width = parseInt(btn.getAttribute('data-width'));
            if (selectedLineIndex !== null && drawnLines[selectedLineIndex]) {
                drawnLines[selectedLineIndex].width = width;
                redrawChartWithLines();
                showLineToolbar();
            }
        });
    });
    document.getElementById('toolbar-delete').addEventListener('click', function() {
        if (selectedLineIndex !== null && drawnLines[selectedLineIndex]) {
            drawnLines.splice(selectedLineIndex, 1);
            selectedLineIndex = null;
            redrawChartWithLines();
            hideLineToolbar();
        }
    });
}

// Affichage du mini-toolbar contextuel lors de la sélection d'une ligne
function showLineToolbar() {
    const toolbar = document.getElementById('line-toolbar');
    if (!toolbar || selectedLineIndex === null || !drawnLines[selectedLineIndex]) {
        if (toolbar) toolbar.style.display = 'none';
        return;
    }
    const line = drawnLines[selectedLineIndex];
    // Positionner le toolbar au centre de la ligne (dans le canvas)
    const canvas = document.getElementById('mainChart');
    const rect = canvas.getBoundingClientRect();
    const centerX = (line.start.x + line.end.x) / 2 + rect.left;
    const centerY = (line.start.y + line.end.y) / 2 + rect.top - 38; // au-dessus de la ligne
    toolbar.style.left = `${centerX - toolbar.offsetWidth / 2}px`;
    toolbar.style.top = `${centerY - toolbar.offsetHeight / 2}px`;
    // Synchroniser les valeurs
    document.getElementById('toolbar-line-color').value = line.color;
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

function hideLineToolbar() {
    const toolbar = document.getElementById('line-toolbar');
    if (toolbar) toolbar.style.display = 'none';
}

// Affichage/masquage du mini-toolbar selon la sélection
function redrawChartWithLines() {
    if (!mainChart) return;
    mainChart.update();
    const canvas = mainChart.canvas;
    const ctx = canvas.getContext('2d');
    ctx.save();
    drawnLines.forEach((line, i) => {
        drawLineOnCanvas(ctx, line, i === selectedLineIndex);
    });
    // Aperçu dynamique de la ligne pivotée
    if (isDrawingLine && pivotPoint && previewEnd) {
        const settings = getLineSettings();
        drawLineOnCanvas(ctx, { start: pivotPoint, end: previewEnd, color: settings.color, width: settings.width, dash: settings.dash }, true);
    }
    // Afficher le pivot si en mode tracé (cercle creux discret)
    if (isDrawingLine && pivotPoint) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pivotPoint.x, pivotPoint.y, 3, 0, 2 * Math.PI);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = document.getElementById('line-color')?.value || '#1976d2';
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 1;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
    // Toolbar
    if (selectedLineIndex !== null && drawnLines[selectedLineIndex]) showLineToolbar();
    else hideLineToolbar();
}

document.addEventListener('DOMContentLoaded', setupLineToolbarEvents);

function onCanvasMouseDown(e) {
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    const mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (isDrawingLine) {
        if (!pivotPoint) {
            // Premier clic : placer le pivot
            pivotPoint = { ...mouse };
            previewEnd = null;
        } else {
            // Second clic : fixer la ligne
            const settings = getLineSettings();
            drawnLines.push({ start: { ...pivotPoint }, end: { ...previewEnd }, color: settings.color, width: settings.width });
            selectedLineIndex = drawnLines.length - 1;
            disableLineDrawingMode();
            redrawChartWithLines();
        }
        redrawChartWithLines();
        return;
    }
    // Sélection ou drag (inchangé)
    const hit = getLineHit(mouse);
    if (hit) {
        selectedLineIndex = hit.index;
        dragMode = hit.mode;
        dragOffset = { x: mouse.x - hit.point.x, y: mouse.y - hit.point.y };
    } else {
        selectedLineIndex = null;
        dragMode = null;
    }
    redrawChartWithLines();
}

function onCanvasMouseMove(e) {
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    const mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (isDrawingLine && pivotPoint) {
        // Aperçu dynamique de la ligne pivotée
        previewEnd = { ...mouse };
        redrawChartWithLines();
        return;
    }
    if (dragMode && selectedLineIndex !== null) {
        const line = drawnLines[selectedLineIndex];
        if (dragMode === 'move') {
            const dx = mouse.x - (line.start.x + line.end.x) / 2 - dragOffset.x;
            const dy = mouse.y - (line.start.y + line.end.y) / 2 - dragOffset.y;
            line.start.x += dx; line.start.y += dy;
            line.end.x += dx; line.end.y += dy;
        } else if (dragMode === 'start') {
            line.start.x = mouse.x - dragOffset.x;
            line.start.y = mouse.y - dragOffset.y;
        } else if (dragMode === 'end') {
            line.end.x = mouse.x - dragOffset.x;
            line.end.y = mouse.y - dragOffset.y;
        }
        redrawChartWithLines();
    }
}

function onCanvasMouseUp(e) {
    dragMode = null;
}

function onCanvasMouseLeave(e) {
    dragMode = null;
    if (isDrawingLine && pivotPoint) {
        previewEnd = null;
        redrawChartWithLines();
    }
}

function getLineHit(mouse) {
    // Retourne {index, mode, point} si clic sur une ligne ou extrémité
    for (let i = drawnLines.length - 1; i >= 0; i--) {
        const line = drawnLines[i];
        // Extrémités
        if (distance(mouse, line.start) < 8) return { index: i, mode: 'start', point: line.start };
        if (distance(mouse, line.end) < 8) return { index: i, mode: 'end', point: line.end };
        // Ligne (distance point-segment)
        if (pointLineDistance(mouse, line.start, line.end) < 6) {
            return { index: i, mode: 'move', point: { x: (line.start.x + line.end.x) / 2, y: (line.start.y + line.end.y) / 2 } };
        }
    }
    return null;
}

function distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
function pointLineDistance(p, a, b) {
    // Distance du point p au segment ab
    const l2 = distance(a, b) ** 2;
    if (l2 === 0) return distance(p, a);
    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return distance(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}

function redrawChartWithLines() {
    if (!mainChart) return;
    mainChart.update();
    const canvas = mainChart.canvas;
    const ctx = canvas.getContext('2d');
    ctx.save();
    drawnLines.forEach((line, i) => {
        drawLineOnCanvas(ctx, line, i === selectedLineIndex);
    });
    // Aperçu dynamique de la ligne pivotée
    if (isDrawingLine && pivotPoint && previewEnd) {
        const settings = getLineSettings();
        drawLineOnCanvas(ctx, { start: pivotPoint, end: previewEnd, color: settings.color, width: settings.width }, true);
    }
    // Afficher le pivot si en mode tracé (cercle creux discret)
    if (isDrawingLine && pivotPoint) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pivotPoint.x, pivotPoint.y, 3, 0, 2 * Math.PI);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = document.getElementById('line-color')?.value || '#1976d2';
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 1;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
    // Toolbar
    if (selectedLineIndex !== null && drawnLines[selectedLineIndex]) showLineToolbar();
    else hideLineToolbar();
}

function drawLineOnCanvas(ctx, line, selected = false) {
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
        ctx.save();
        ctx.beginPath();
        ctx.arc(line.start.x, line.start.y, radius, 0, 2 * Math.PI);
        ctx.arc(line.end.x, line.end.y, radius, 0, 2 * Math.PI);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = line.color;
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 1;
        ctx.fill(); // Cercle creux
        ctx.stroke();
        ctx.restore();
    }
}

// Appliquer couleur/épaisseur à la ligne sélectionnée en temps réel
function updateSelectedLineStyleRealtime() {
    if (selectedLineIndex !== null && drawnLines[selectedLineIndex]) {
        const color = document.getElementById('line-color')?.value || '#1976d2';
        const width = parseFloat(document.getElementById('line-width')?.value) || 1.5;
        drawnLines[selectedLineIndex].color = color;
        drawnLines[selectedLineIndex].width = width;
        redrawChartWithLines();
    }
}
document.getElementById('line-color')?.addEventListener('input', updateSelectedLineStyleRealtime);
document.getElementById('line-width')?.addEventListener('input', updateSelectedLineStyleRealtime);

if (window.Chart) {
    Chart.register({
        id: 'customLineOverlay',
        afterDraw(chart) {
            if (chart.canvas.id === 'mainChart') redrawChartWithLines();
        }
    });
}
// --- Fin gestion avancée des lignes ---

// Export des fonctions publiques
window.graphiques = {
    showGraphiquesSection,
    initMainChart,
    applyChartSettings
};

