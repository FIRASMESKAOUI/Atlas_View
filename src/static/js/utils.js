// Warren AI - Utility Functions

// Formatage des nombres
function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '-';
    
    const number = parseFloat(num);
    
    if (Math.abs(number) >= 1000000) {
        return (number / 1000000).toFixed(1) + 'M';
    } else if (Math.abs(number) >= 1000) {
        return (number / 1000).toFixed(1) + 'K';
    }
    
    return number.toFixed(decimals);
}

// Formatage des pourcentages
function formatPercentage(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '-';
    
    const number = parseFloat(num);
    const sign = number >= 0 ? '+' : '';
    return `${sign}${number.toFixed(decimals)}%`;
}

// Formatage des prix
function formatPrice(price, currency = 'DT') {
    if (price === null || price === undefined || isNaN(price)) return '-';
    
    const number = parseFloat(price);
    return `${number.toFixed(3)} ${currency}`;
}

// Formatage des dates
function formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

// Formatage des dates relatives
function formatRelativeDate(dateString) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'À l\'instant';
        if (diffMins < 60) return `Il y a ${diffMins} min`;
        if (diffHours < 24) return `Il y a ${diffHours}h`;
        if (diffDays < 7) return `Il y a ${diffDays}j`;
        
        return formatDate(dateString);
    } catch (error) {
        return dateString;
    }
}

// Obtenir la classe CSS pour les variations
function getChangeClass(change) {
    if (change === null || change === undefined || isNaN(change)) return '';
    
    const number = parseFloat(change);
    if (number > 0) return 'text-green';
    if (number < 0) return 'text-red';
    return '';
}

// Obtenir l'icône pour les variations
function getChangeIcon(change) {
    if (change === null || change === undefined || isNaN(change)) return '';
    
    const number = parseFloat(change);
    if (number > 0) return '<i class="fas fa-arrow-up"></i>';
    if (number < 0) return '<i class="fas fa-arrow-down"></i>';
    return '<i class="fas fa-minus"></i>';
}

// Afficher/masquer le loading
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

// Notifications toast
function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove after duration
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, duration);
    
    // Click to remove
    toast.addEventListener('click', () => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    });
}

function getToastIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Gestion des erreurs API
function handleAPIError(error, context = '') {
    console.error(`API Error ${context}:`, error);
    
    let message = 'Une erreur est survenue';
    if (error.message) {
        message = error.message;
    }
    
    showToast(message, 'error');
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Truncate text
function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Generate random color
function generateRandomColor() {
    const colors = [
        '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
        '#8b5cf6', '#06b6d4', '#84cc16', '#f97316',
        '#ec4899', '#6366f1', '#14b8a6', '#eab308'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Local storage helpers
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
    }
}

function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        return defaultValue;
    }
}

function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error removing from localStorage:', error);
        return false;
    }
}

// Animation helpers
function animateValue(element, start, end, duration = 1000) {
    const startTime = performance.now();
    const change = end - start;
    
    function updateValue(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        const currentValue = start + (change * easedProgress);
        element.textContent = Math.round(currentValue);
        
        if (progress < 1) {
            requestAnimationFrame(updateValue);
        }
    }
    
    requestAnimationFrame(updateValue);
}

// Chart helpers
function createGradient(ctx, color1, color2) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
}

// URL helpers
function updateURLHash(hash) {
    if (window.history && window.history.pushState) {
        window.history.pushState(null, null, `#${hash}`);
    } else {
        window.location.hash = hash;
    }
}

function getCurrentHash() {
    return window.location.hash.substring(1) || 'dashboard';
}

// Validation helpers
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function isValidTicker(ticker) {
    return ticker && ticker.length >= 2 && ticker.length <= 10 && /^[A-Z0-9]+$/.test(ticker.toUpperCase());
}

// Copy to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copié dans le presse-papiers', 'success');
        return true;
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        showToast('Erreur lors de la copie', 'error');
        return false;
    }
}

// Download data as JSON
function downloadJSON(data, filename = 'data.json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
}

// Download data as CSV
function downloadCSV(data, filename = 'data.csv') {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
}

