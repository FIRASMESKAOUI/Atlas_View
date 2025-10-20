// Carthago Market - Indices Module

/**
 * Met à jour les indices boursiers sur le dashboard
 * Cette fonction utilise les API pour récupérer les vraies données des indices
 * stockées dans MongoDB et/ou directement depuis l'API BVMT
 */
async function updateMarketIndices() {
    try {
        console.log('Mise à jour des indices boursiers...');

        // 1. Essayer d'abord notre API interne
        let indicesData = null;
        let dataSource = 'api';

        try {
            const response = await api.getIndices();
            if (response.success && response.data && response.data.indices) {
                console.log('Données des indices récupérées avec succès depuis l\'API interne');
                indicesData = response.data;
            }
        } catch (error) {
            console.warn('Erreur API lors de la récupération des indices:', error);
            dataSource = 'bvmt_direct';
        }

        // 2. Si l'API interne échoue, essayer directement l'API BVMT
        if (!indicesData) {
            try {
                console.log('Tentative de récupération des indices directement depuis l\'API BVMT...');

                // Utilisation de l'endpoint intraday pour TUNINDEX comme recommandé par l'utilisateur
                const [tunindexResponse, tunindex20Response] = await Promise.allSettled([
                    fetch('https://www.bvmt.com.tn/rest_api/rest/intraday/TN0009050014'),
                    fetch('https://www.bvmt.com.tn/rest_api/rest/market/TN0009050287')
                ]);

                // Traiter TUNINDEX (depuis l'API intraday)
                let tunindexData = null;
                if (tunindexResponse.status === 'fulfilled' && tunindexResponse.value.ok) {
                    const data = await tunindexResponse.value.json();
                    console.log('Données TUNINDEX brutes de BVMT (intraday):', data);

                    if (data && data.intradayDatas && data.intradayDatas.length > 0) {
                        // Prendre la dernière valeur intraday (la plus récente)
                        const lastData = data.intradayDatas[data.intradayDatas.length - 1];

                        // L'API intraday a un format différent, adaptation des données
                        const value = parseFloat(lastData.lAST);
                        const prevValue = parseFloat(lastData.pREV_CLOSE);
                        const change = value - prevValue;
                        // Correction du calcul du pourcentage de variation
                        const percent_change = prevValue ? (change / prevValue) * 100 : 0;

                        console.log('TUNINDEX - Données calculées avec précision:', {
                            value,
                            prevValue,
                            change,
                            percent_change
                        });

                        tunindexData = {
                            name: 'TUNINDEX',
                            isin: 'TN0009050014',
                            value: value,
                            prev_value: prevValue,
                            change: change,
                            percent_change: percent_change, // Utiliser la valeur calculée correctement
                            seance: lastData.sEANCE || new Date().toLocaleDateString('fr-FR'),
                            time: lastData.tIME || new Date().toLocaleTimeString('fr-FR'),
                            last_updated: new Date().toISOString()
                        };
                    }
                }

                // Traiter TUNINDEX20 (depuis l'API market)
                let tunindex20Data = null;
                if (tunindex20Response.status === 'fulfilled' && tunindex20Response.value.ok) {
                    const data = await tunindex20Response.value.json();
                    console.log('Données TUNINDEX20 brutes de BVMT:', data);

                    if (data && data.market) {
                        // L'API market utilise un format différent
                        const marketData = data.market;

                        // Récupération directe des valeurs depuis l'API
                        const value = parseFloat(marketData.last) || 0;
                        const close = parseFloat(marketData.close) || 0;
                        const prevClose = parseFloat(marketData.prev_close) || close || value; // Fallback si prev_close n'existe pas

                        // Calcul de la variation si nécessaire
                        let change = parseFloat(marketData.change);
                        if (isNaN(change) && value && prevClose) {
                            change = value - prevClose;
                        }

                        // Calcul du pourcentage de variation si nécessaire
                        let percentChange = parseFloat(marketData.ychange);
                        if (isNaN(percentChange) && change && prevClose) {
                            percentChange = (change / prevClose) * 100;
                        }

                        console.log('TUNINDEX20 - Données calculées:', {
                            value,
                            prevClose,
                            change,
                            percentChange
                        });

                        tunindex20Data = {
                            name: 'TUNINDEX20',
                            isin: 'TN0009050287',
                            value: value,
                            prev_value: prevClose,
                            change: change || 0,
                            percent_change: percentChange || 0,
                            seance: marketData.seance,
                            time: marketData.time,
                            last_updated: new Date().toISOString()
                        };
                    }
                }

                // Si au moins un indice a été récupéré, créer un objet de données
                if (tunindexData || tunindex20Data) {
                    indicesData = {
                        indices: [],
                        timestamp: new Date().toISOString()
                    };

                    // Ajouter explicitement les données et afficher un log détaillé
                    if (tunindexData) {
                        console.log('Ajout des données TUNINDEX à l\'objet indicesData:', tunindexData);
                        indicesData.indices.push(tunindexData);
                    }

                    if (tunindex20Data) {
                        console.log('Ajout des données TUNINDEX20 à l\'objet indicesData:', tunindex20Data);
                        indicesData.indices.push(tunindex20Data);
                    }

                    // Vérifier que les données ont bien été ajoutées
                    console.log('Nombre d\'indices dans indicesData:', indicesData.indices.length);
                    console.log('Données complètes indicesData:', indicesData);

                    console.log('Données des indices récupérées avec succès directement depuis l\'API BVMT');
                    dataSource = 'bvmt_direct';
                }
            } catch (bvmtError) {
                console.warn('Erreur lors de l\'accès direct à l\'API BVMT:', bvmtError);
                dataSource = 'proxy';
            }
        }

        // 3. Si l'API BVMT directe échoue, essayer via un proxy CORS
        if (!indicesData) {
            try {
                console.log('Tentative de récupération des indices via proxy CORS...');

                const [tunindexResponse, tunindex20Response] = await Promise.allSettled([
                    fetch('https://corsproxy.io/?https://www.bvmt.com.tn/rest_api/rest/market/TN0009050014'),
                    fetch('https://corsproxy.io/?https://www.bvmt.com.tn/rest_api/rest/market/TN0009050287')
                ]);

                // Traiter TUNINDEX via proxy
                let tunindexData = null;
                if (tunindexResponse.status === 'fulfilled' && tunindexResponse.value.ok) {
                    const data = await tunindexResponse.value.json();
                    console.log('Données TUNINDEX brutes via proxy:', data);

                    if (data && data.market) {
                        // Extraction et nettoyage des données de variation
                        const rawChange = data.market.change;
                        const rawPercentChange = data.market.ychange;

                        // Conversion en nombres avec traitement des cas spéciaux
                        const change = parseFloat(rawChange) || 0;
                        // S'assurer que percent_change est un nombre, même si c'est 0
                        let percent_change = parseFloat(rawPercentChange);
                        if (isNaN(percent_change)) {
                            // Si la valeur est NaN, utiliser le calcul à partir de la variation absolue
                            // et de la dernière valeur si possible
                            const lastValue = parseFloat(data.market.last);
                            if (!isNaN(lastValue) && lastValue > 0 && !isNaN(change)) {
                                percent_change = (change / (lastValue - change)) * 100;
                            } else {
                                percent_change = 0;
                            }
                        }

                        console.log('TUNINDEX via proxy - Variation calculée:', { change, percent_change });

                        tunindexData = {
                            name: 'TUNINDEX',
                            isin: 'TN0009050014',
                            value: parseFloat(data.market.last) || 0,
                            change: change,
                            percent_change: percent_change,
                            seance: data.market.seance,
                            time: data.market.time,
                            last_updated: new Date().toISOString()
                        };
                    }
                }

                // Traiter TUNINDEX20 via proxy
                let tunindex20Data = null;
                if (tunindex20Response.status === 'fulfilled' && tunindex20Response.value.ok) {
                    const data = await tunindex20Response.value.json();
                    console.log('Données TUNINDEX20 brutes via proxy:', data);

                    if (data && data.market) {
                        // Extraction et nettoyage des données de variation
                        const rawChange = data.market.change;
                        const rawPercentChange = data.market.ychange;

                        // Conversion en nombres avec traitement des cas spéciaux
                        const change = parseFloat(rawChange) || 0;
                        // S'assurer que percent_change est un nombre, même si c'est 0
                        let percent_change = parseFloat(rawPercentChange);
                        if (isNaN(percent_change)) {
                            // Si la valeur est NaN, utiliser le calcul à partir de la variation absolue
                            // et de la dernière valeur si possible
                            const lastValue = parseFloat(data.market.last);
                            if (!isNaN(lastValue) && lastValue > 0 && !isNaN(change)) {
                                percent_change = (change / (lastValue - change)) * 100;
                            } else {
                                percent_change = 0;
                            }
                        }

                        console.log('TUNINDEX20 via proxy - Variation calculée:', { change, percent_change });

                        tunindex20Data = {
                            name: 'TUNINDEX20',
                            isin: 'TN0009050287',
                            value: parseFloat(data.market.last) || 0,
                            change: change,
                            percent_change: percent_change,
                            seance: data.market.seance,
                            time: data.market.time,
                            last_updated: new Date().toISOString()
                        };
                    }
                }

                // Si au moins un indice a été récupéré, créer un objet de données
                if (tunindexData || tunindex20Data) {
                    indicesData = {
                        indices: [],
                        timestamp: new Date().toISOString()
                    };

                    // Ajouter explicitement les données et afficher un log détaillé
                    if (tunindexData) {
                        console.log('Ajout des données TUNINDEX à l\'objet indicesData:', tunindexData);
                        indicesData.indices.push(tunindexData);
                    }

                    if (tunindex20Data) {
                        console.log('Ajout des données TUNINDEX20 à l\'objet indicesData:', tunindex20Data);
                        indicesData.indices.push(tunindex20Data);
                    }

                    // Vérifier que les données ont bien été ajoutées
                    console.log('Nombre d\'indices dans indicesData:', indicesData.indices.length);
                    console.log('Données complètes indicesData:', indicesData);

                    console.log('Données des indices récupérées avec succès via proxy CORS');
                    dataSource = 'proxy';
                }
            } catch (proxyError) {
                console.warn('Erreur lors de l\'accès via proxy CORS:', proxyError);
                dataSource = 'fallback';
            }
        }

        // 4. En dernier recours, informer l'utilisateur qu'aucune donnée n'est disponible
        if (!indicesData) {
            console.warn('Toutes les tentatives de récupération ont échoué, aucune donnée disponible');
            // Créer un objet de données vides au lieu d'utiliser des données statiques de secours
            indicesData = {
                indices: [],
                timestamp: new Date().toISOString()
            };
            dataSource = 'no_data';
        }

        // Affichage de la source des données pour le débogage
        console.log(`Source des données des indices: ${dataSource}`);

        // Chercher TUNINDEX et TUNINDEX20 dans les données
        const tunindex = indicesData.indices.find(idx => idx.name === 'TUNINDEX');
        const tunindex20 = indicesData.indices.find(idx => idx.name === 'TUNINDEX20');

        // Mettre à jour TUNINDEX si disponible, sinon afficher "Données non disponibles"
        if (tunindex) {
            console.log('Données TUNINDEX récupérées:', tunindex);
            updateIndexDisplay('tunindex', tunindex);
        } else {
            console.warn('TUNINDEX non trouvé dans les données');
            displayNoData('tunindex');
        }

        // Mettre à jour TUNINDEX20 si disponible, sinon afficher "Données non disponibles"
        if (tunindex20) {
            console.log('Données TUNINDEX20 récupérées:', tunindex20);
            updateIndexDisplay('tunindex20', tunindex20);
        } else {
            console.warn('TUNINDEX20 non trouvé dans les données');
            displayNoData('tunindex20');
        }

    } catch (error) {
        console.error('Erreur lors de la mise à jour des indices:', error);
        // Afficher un message d'erreur plutôt que d'utiliser des données de secours
        displayNoData('tunindex');
        displayNoData('tunindex20');
    }
}

/**
 * Affiche un message indiquant que les données ne sont pas disponibles
 * @param {string} indexId - Identifiant de base pour les éléments HTML (tunindex ou tunindex20)
 */
function displayNoData(indexId) {
    // Récupérer les éléments du DOM
    const valueElement = document.getElementById(`${indexId}Value`);
    const changeElement = document.getElementById(`${indexId}Change`);
    const timeElement = document.getElementById(`${indexId}Time`);

    if (!valueElement || !changeElement || !timeElement) {
        console.warn(`Éléments DOM pour ${indexId} non trouvés`);
        return;
    }

    // Afficher un message indiquant que les données ne sont pas disponibles
    valueElement.textContent = 'N/A';
    changeElement.innerHTML = '---';
    changeElement.className = 'change';
    timeElement.textContent = 'Données non disponibles';

    // Ajouter une animation pour montrer que les éléments ont été mis à jour
    const card = valueElement.closest('.index-card');
    if (card) {
        card.classList.add('updated');
        setTimeout(() => card.classList.remove('updated'), 1000);
    }
}

/**
 * Met à jour l'affichage d'un indice dans le dashboard
 * @param {string} indexId - Identifiant de base pour les éléments HTML (tunindex ou tunindex20)
 * @param {Object} indexData - Données de l'indice à afficher
 */
function updateIndexDisplay(indexId, indexData) {
    // Récupérer les éléments du DOM
    const valueElement = document.getElementById(`${indexId}Value`);
    const changeElement = document.getElementById(`${indexId}Change`);
    const timeElement = document.getElementById(`${indexId}Time`);

    console.log(`Mise à jour de l'affichage pour ${indexId} avec les données:`, indexData);

    if (!valueElement || !changeElement || !timeElement) {
        console.warn(`Éléments DOM pour ${indexId} non trouvés`);
        return;
    }

    // Mettre à jour la valeur de l'indice
    if (indexData.value) {
        // Affichage du nombre complet avec 2 décimales, sans abréviation (pas de K, M, etc.)
        valueElement.textContent = indexData.value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        console.log(`Valeur de ${indexId} mise à jour:`, valueElement.textContent);
    } else {
        valueElement.textContent = '-';
        console.warn(`Valeur manquante pour ${indexId}`);
    }

    // Mettre à jour la variation avec formattage et couleurs
    if (indexData.change !== undefined) {
        const change = indexData.change;
        const changeClass = change > 0 ? 'positive' : (change < 0 ? 'negative' : 'neutral');
        const changeIcon = change > 0 ? '▲' : (change < 0 ? '▼' : '•');

        // Formatage direct de la variation
        const formattedChange = formatPercentage ? formatPercentage(change) :
            ((change >= 0 ? '+' : '') + change.toFixed(2) + '%');

        console.log(`Variation de ${indexId} calculée:`, {
            change,
            class: changeClass,
            formatted: formattedChange
        });

        // Affichage de la variation
        changeElement.innerHTML = `${changeIcon} ${formattedChange}`;
        changeElement.className = `change ${changeClass}`;
    } else {
        changeElement.textContent = '-';
        changeElement.className = 'change';
        console.warn(`Variation manquante pour ${indexId}`);
    }

    // Mettre à jour l'horodatage
    if (indexData.seance && indexData.time) {
        timeElement.textContent = `${indexData.seance} ${indexData.time}`;
        console.log(`Horodatage de ${indexId} mis à jour:`, timeElement.textContent);
    } else if (indexData.last_updated) {
        const date = new Date(indexData.last_updated);
        timeElement.textContent = date.toLocaleString('fr-FR');
        console.log(`Horodatage de ${indexId} mis à jour avec last_updated:`, timeElement.textContent);
    } else {
        timeElement.textContent = '-';
        console.warn(`Horodatage manquant pour ${indexId}`);
    }

    // Ajouter une animation pour montrer que les données ont été mises à jour
    const card = valueElement.closest('.index-card');
    if (card) {
        card.classList.add('updated');
        setTimeout(() => card.classList.remove('updated'), 1000);
    }
}

// Exporter la fonction pour qu'elle soit accessible depuis d'autres modules
window.updateMarketIndices = updateMarketIndices;

