// Module pour les graphiques d'indices boursiers

// Constantes pour les indices
const TUNINDEX_ISIN = "TN0009050014";
const TUNINDEX20_ISIN = "TN0009050287";

/**
 * Initialise les graphiques pour TUNINDEX et TUNINDEX20
 * Cette fonction est appelée depuis le fichier dashboard.js
 */
async function initIndexCharts() {
    try {
        console.log('Initialisation des graphiques des indices...');

        // Vérifier que les éléments canvas existent
        const tunindexCanvas = document.getElementById('tunindexChart');
        const tunindex20Canvas = document.getElementById('tunindex20Chart');

        if (!tunindexCanvas || !tunindex20Canvas) {
            console.error('Les éléments canvas des graphiques sont introuvables');
            console.debug('Canvas TUNINDEX:', tunindexCanvas);
            console.debug('Canvas TUNINDEX20:', tunindex20Canvas);
            return;
        }

        // Récupérer les données historiques pour les indices
        const tunindexHistory = await fetchIndexHistory(TUNINDEX_ISIN);
        const tunindex20History = await fetchIndexHistory(TUNINDEX20_ISIN);

        // Créer les graphiques
        createIndexChart('tunindexChart', tunindexHistory, 'TUNINDEX', '#3182ce');
        createIndexChart('tunindex20Chart', tunindex20History, 'TUNINDEX20', '#38a169');

        console.log('Graphiques des indices initialisés avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation des graphiques des indices:', error);
    }
}

/**
 * Récupère l'historique d'un indice depuis l'API
 * @param {string} isin - Code ISIN de l'indice
 * @returns {Array} Données historiques formatées pour Chart.js
 */
async function fetchIndexHistory(isin) {
    try {
        console.log(`Récupération de l'historique pour l'indice ${isin}...`);

        // Essayer d'abord notre API interne
        try {
            const internalApiResponse = await fetch(`/api/indices/history/${isin}`);
            if (internalApiResponse.ok) {
                const data = await internalApiResponse.json();
                if (data.success && data.data && data.data.history) {
                    console.log(`Données historiques reçues de l'API interne pour ${isin}`);
                    return formatIndexHistoryData(data.data.history);
                }
            }
        } catch (internalErr) {
            console.warn(`Échec de l'API interne, tentative via API BVMT directe: ${internalErr}`);
        }

        let historyData;

        // Pour TUNINDEX, essayer l'API intraday qui a des données plus riches
        if (isin === TUNINDEX_ISIN) {
            try {
                console.log(`Tentative via l'API intraday pour TUNINDEX...`);
                const intradayResponse = await fetch(`https://www.bvmt.com.tn/rest_api/rest/intraday/${isin}`);

                if (intradayResponse.ok) {
                    const data = await intradayResponse.json();
                    console.log('Données intraday reçues:', data);

                    if (data && data.intradayDatas && data.intradayDatas.length > 0) {
                        // Extraire les données historiques de l'API intraday
                        // et les formater pour être compatibles avec le format attendu
                        historyData = {
                            indexHistorys: data.intradayDatas.map(item => ({
                                sEANCE: item.sEANCE,
                                lAST: item.lAST,
                                oPEN: item.oPEN,
                                hIGH: item.hIGH,
                                lOW: item.lOW,
                                pREV_CLOSE: item.pREV_CLOSE,
                                // Calcul explicite de la variation
                                cHANGE: parseFloat(item.lAST) - parseFloat(item.pREV_CLOSE),
                                // Calcul explicite du pourcentage de variation
                                yChange: parseFloat(item.pREV_CLOSE) > 0 ?
                                    ((parseFloat(item.lAST) - parseFloat(item.pREV_CLOSE)) / parseFloat(item.pREV_CLOSE)) * 100 : 0
                            }))
                        };
                        console.log(`Données intraday formatées pour ${isin}:`, historyData);
                        return formatIndexHistoryData(historyData.indexHistorys);
                    }
                }
            } catch (intradayError) {
                console.error(`Erreur lors de l'accès à l'API intraday:`, intradayError);
            }
        }

        // Si l'API intraday a échoué ou pour TUNINDEX20, utiliser l'API history standard
        console.log(`Tentative via l'API history standard...`);
        const response = await fetch(`https://www.bvmt.com.tn/rest_api/rest/history/${isin}`);

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Données historiques reçues directement de BVMT pour ${isin}:`, data);

        // Vérifier que les données sont bien formatées
        if (!data || !data.indexHistorys || !Array.isArray(data.indexHistorys)) {
            throw new Error('Format de données invalide');
        }

        // Enrichir les données avec des pourcentages de variation calculés
        const enrichedData = {
            ...data,
            indexHistorys: data.indexHistorys.map((item, index, array) => {
                // Récupérer les valeurs numériques
                const currentValue = parseFloat(item.lAST);

                // Trouver la valeur précédente si possible
                let prevValue = null;
                if (index > 0) {
                    prevValue = parseFloat(array[index - 1].lAST);
                } else if (item.pREV_CLOSE) {
                    prevValue = parseFloat(item.pREV_CLOSE);
                }

                // Calculer la variation et le pourcentage si possible
                let change = 0;
                let percentChange = 0;

                if (prevValue && !isNaN(prevValue) && !isNaN(currentValue)) {
                    change = currentValue - prevValue;
                    percentChange = (change / prevValue) * 100;
                }

                return {
                    ...item,
                    calculatedChange: change,
                    calculatedPercentChange: percentChange
                };
            })
        };

        console.log(`Données enrichies pour ${isin}:`, enrichedData);
        return formatIndexHistoryData(enrichedData.indexHistorys);
    } catch (error) {
        console.error(`Erreur lors de la récupération de l'historique de l'indice ${isin}:`, error);

        // Deuxième tentative avec un proxy CORS si nécessaire
        try {
            const corsProxyUrl = `https://corsproxy.io/?https://www.bvmt.com.tn/rest_api/rest/history/${isin}`;
            console.log(`Tentative via proxy CORS: ${corsProxyUrl}`);

            const proxyResponse = await fetch(corsProxyUrl);
            if (proxyResponse.ok) {
                const data = await proxyResponse.json();
                if (data && data.indexHistorys && Array.isArray(data.indexHistorys)) {
                    console.log(`Données historiques reçues via proxy pour ${isin}`);

                    // Enrichir les données avec des calculs
                    const enrichedData = {
                        ...data,
                        indexHistorys: data.indexHistorys.map((item, index, array) => {
                            // Récupérer les valeurs numériques
                            const currentValue = parseFloat(item.lAST);

                            // Trouver la valeur précédente si possible
                            let prevValue = null;
                            if (index > 0) {
                                prevValue = parseFloat(array[index - 1].lAST);
                            } else if (item.pREV_CLOSE) {
                                prevValue = parseFloat(item.pREV_CLOSE);
                            }

                            // Calculer la variation et le pourcentage si possible
                            let change = 0;
                            let percentChange = 0;

                            if (prevValue && !isNaN(prevValue) && !isNaN(currentValue)) {
                                change = currentValue - prevValue;
                                percentChange = (change / prevValue) * 100;
                            }

                            return {
                                ...item,
                                calculatedChange: change,
                                calculatedPercentChange: percentChange
                            };
                        })
                    };

                    return formatIndexHistoryData(enrichedData.indexHistorys);
                }
            }
        } catch (proxyError) {
            console.error(`Échec de la tentative via proxy CORS:`, proxyError);
        }

        // En dernier recours, utiliser les données de démonstration
        console.warn(`Utilisation des données de démonstration pour ${isin} après échec des tentatives`);
        return getDemoIndexData(isin);
    }
}

/**
 * Formate les données historiques d'un indice pour Chart.js
 * @param {Array} historyData - Données brutes de l'API
 * @returns {Array} Données formatées pour Chart.js
 */
function formatIndexHistoryData(historyData) {
    return historyData
        .sort((a, b) => {
            // Convertir les dates (format: "jour mois année") en objets Date
            const dateA = parseSeanceDate(a.sEANCE);
            const dateB = parseSeanceDate(b.sEANCE);
            return dateA - dateB;
        })
        .map(item => ({
            x: parseSeanceDate(item.sEANCE),
            y: item.lAST
        }));
}

/**
 * Parse une date au format "jour mois année" en objet Date
 * @param {string} dateStr - Date au format "jour mois année"
 * @returns {Date} Date parsée
 */
function parseSeanceDate(dateStr) {
    // Convertir les mois abrégés français en indices numériques
    const monthsMapping = {
        'janv.': 0, 'févr.': 1, 'mars': 2, 'avr.': 3, 'mai': 4, 'juin': 5,
        'juil.': 6, 'août': 7, 'sept.': 8, 'oct.': 9, 'nov.': 10, 'déc.': 11
    };

    // Traiter les formats avec l'année à 4 chiffres ou à 2 chiffres
    const parts = dateStr.split(' ');

    if (parts.length !== 3) {
        // Format invalide, retourner la date actuelle
        console.warn(`Format de date invalide: ${dateStr}`);
        return new Date();
    }

    const day = parseInt(parts[0], 10);
    const monthStr = parts[1].toLowerCase();
    let year = parseInt(parts[2], 10);

    // Si l'année est sur 2 chiffres, convertir en 4 chiffres
    if (year < 100) {
        year += 2000;
    }

    // Trouver le mois correspondant
    let month = -1;
    for (const [key, value] of Object.entries(monthsMapping)) {
        if (monthStr.startsWith(key.toLowerCase())) {
            month = value;
            break;
        }
    }

    if (month === -1) {
        console.warn(`Mois non reconnu: ${monthStr}`);
        month = 0; // Défaut à janvier
    }

    return new Date(year, month, day);
}

/**
 * Crée un graphique pour un indice donné
 * @param {string} canvasId - ID du canvas où afficher le graphique
 * @param {Array} data - Données formatées pour Chart.js
 * @param {string} label - Nom de l'indice
 * @param {string} color - Couleur de la courbe
 */
function createIndexChart(canvasId, data, label, color) {
    // Vérifier si le canvas existe
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas avec ID ${canvasId} non trouvé`);
        return;
    }

    console.log(`Création du graphique pour ${label} avec ${data.length} points de données`);

    // Nettoyer tout graphique existant
    if (canvas._chart) {
        canvas._chart.destroy();
    }

    // Créer le graphique
    const ctx = canvas.getContext('2d');
    canvas._chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: label,
                data: data,
                backgroundColor: color + '30', // Couleur avec transparence pour le remplissage
                borderColor: color,
                borderWidth: 2,
                pointRadius: 0, // Pas de points pour une courbe plus fluide
                pointHitRadius: 10, // Zone de détection des points pour l'interactivité
                fill: true,
                tension: 0.2 // Légère courbe pour une meilleure lisibilité
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Masquer la légende car l'indice est déjà identifié
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
                            // Formater la valeur de l'indice
                            return `${label}: ${formatNumberFallback(context.parsed.y, 2)}`;
                        }
                    }
                }
            },
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
                    beginAtZero: false, // Important pour les indices boursiers
                    ticks: {
                        callback: function(value) {
                            return formatNumberFallback(value, 0);
                        }
                    },
                    title: {
                        display: false
                    }
                }
            }
        }
    });

    console.log(`Graphique ${label} créé avec succès`);
}

/**
 * Fonction de secours pour formater les nombres si la fonction globale n'existe pas
 */
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

/**
 * Génère des données de démonstration pour un indice
 * @param {string} isin - Code ISIN de l'indice
 * @returns {Array} Données de démonstration
 */
function getDemoIndexData(isin) {
    console.log(`Génération de données de démonstration pour ${isin}`);

    const today = new Date();
    const data = [];
    const baseValue = (isin === TUNINDEX_ISIN) ? 12000 : 5500;

    // Générer des données pour les 12 derniers mois
    for (let i = 365; i >= 0; i -= 5) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);

        // Fluctuation semi-aléatoire basée sur le jour
        const fluctuation = Math.sin(i * 0.1) * 500 + Math.random() * 200 - 100;

        data.push({
            x: date,
            y: baseValue + fluctuation
        });
    }

    console.log(`${data.length} points de données de démonstration générés`);
    return data;
}

// Exporter la fonction pour qu'elle soit accessible depuis d'autres modules
window.initIndexCharts = initIndexCharts;

// Initialiser les graphiques au chargement du DOM si la fonction n'est pas appelée ailleurs
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM chargé, vérification si les graphiques doivent être initialisés');

    // Attendre un peu pour s'assurer que les templates sont chargés
    setTimeout(function() {
        const dashboard = document.getElementById('dashboard');
        const indicesContainer = document.getElementById('indices-container');

        // Vérifier si on est sur le tableau de bord et si les indices sont chargés
        if (dashboard && dashboard.classList.contains('active') &&
            indicesContainer && indicesContainer.children.length > 0) {

            // Vérifier si les canvas existent déjà
            const tunindexCanvas = document.getElementById('tunindexChart');
            const tunindex20Canvas = document.getElementById('tunindex20Chart');

            if (tunindexCanvas && tunindex20Canvas) {
                console.log('Graphiques des indices trouvés, initialisation...');
                initIndexCharts();
            } else {
                console.log('Canvas des graphiques non trouvés, l\'initialisation sera gérée par dashboard.js');
            }
        }
    }, 1000); // Attendre 1 seconde pour s'assurer que tout est chargé
});
