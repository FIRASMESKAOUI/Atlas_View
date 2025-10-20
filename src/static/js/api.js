// Warren AI - API Client

class APIClient {
    constructor() {
        this.baseURL = '/api';
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Stocks API
    async getStocks(params = {}) {
        // Supprime toute limitation de limit, récupère tout
        params.limit = 1000000; // valeur très grande pour forcer le backend à tout renvoyer
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/stocks${queryString ? `?${queryString}` : ''}`;
        return this.request(endpoint);
    }

    async getStock(ticker, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/stocks/${ticker}${queryString ? `?${queryString}` : ''}`;
        return this.request(endpoint);
    }

    async getMarketSummary() {
        return this.request('/stocks/market-summary');
    }

    async updateStocksData() {
        return this.request('/stocks/update', { method: 'POST' });
    }

    async searchStocks(query, limit = 10) {
        return this.request(`/stocks/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    }

    async getStocksByGroup(groupId) {
        return this.request(`/stocks/groups/${groupId}`);
    }

    async getStockHistory(ticker, days = 30) {
        return this.request(`/stocks/${ticker}/history?days=${days}`);
    }

    async getDataFreshness() {
        return this.request('/stocks/data-freshness');
    }

    async getLiveStockData(ticker) {
        return this.request(`/stocks/live/${ticker}`);
    }

    async getMarketRises() {
        return this.request('/stocks/market/rises');
    }

    async getMarketFalls() {
        return this.request('/stocks/market/falls');
    }

    async getMarketVolumes() {
        return this.request('/stocks/market/volumes');
    }

    // Indices API
    async getIndices() {
        return this.request('/indices');
    }

    async getTunindex() {
        return this.request('/indices/tunindex');
    }

    async getTunindex20() {
        return this.request('/indices/tunindex20');
    }

    // News API
    async getNews(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/news${queryString ? `?${queryString}` : ''}`;
        return this.request(endpoint);
    }

    async getLatestNews(limit = 10) {
        return this.request(`/news/latest?limit=${limit}`);
    }

    async searchNews(query, limit = 10) {
        return this.request(`/news/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    }

    async getNewsByCategory(category, limit = 10) {
        return this.request(`/news/categories/${category}?limit=${limit}`);
    }

    async updateNews() {
        return this.request('/news/update', { method: 'POST' });
    }

    async getNewsCategories() {
        return this.request('/news/categories');
    }

    async getNewsSources() {
        return this.request('/news/sources');
    }

    async getTrendingNews(limit = 5) {
        return this.request(`/news/trending?limit=${limit}`);
    }

    async getNewsStats() {
        return this.request('/news/stats');
    }

    // AI Analysis API
    async analyzeText(text, type = 'full') {
        return this.request('/ai/analyze', {
            method: 'POST',
            body: JSON.stringify({ text, type })
        });
    }

    async analyzeStock(ticker) {
        return this.request(`/ai/analyze/stock/${ticker}`, { method: 'POST' });
    }

    async compareStocks(ticker1, ticker2) {
        return this.request('/ai/compare', {
            method: 'POST',
            body: JSON.stringify({ ticker1, ticker2 })
        });
    }

    async getInsights(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/ai/insights${queryString ? `?${queryString}` : ''}`;
        return this.request(endpoint);
    }

    async summarizeNews(newsIds) {
        return this.request('/ai/summarize/news', {
            method: 'POST',
            body: JSON.stringify({ news_ids: newsIds })
        });
    }

    async getMarketSentiment() {
        return this.request('/ai/sentiment/market');
    }

    async getStockRecommendations(ticker) {
        return this.request(`/ai/recommendations/${ticker}`);
    }

    async getAIStatus() {
        return this.request('/ai/status');
    }
}

// Instance globale de l'API client
const api = new APIClient();

