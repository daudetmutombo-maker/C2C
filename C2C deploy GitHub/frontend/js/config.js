(function() {
    // Ordre de priorité : 1) window._C2S_API_URL 2) localStorage 3) auto-détection 4) défaut local
    var apiUrl = window._C2S_API_URL;

    if (!apiUrl) {
        apiUrl = localStorage.getItem('c2s_api_url');
    }

    if (!apiUrl) {
        var host = window.location.hostname;
        if (host === '127.0.0.1' || host === 'localhost') {
            apiUrl = 'http://127.0.0.1:8000/api';
        } else {
            // Mode production GitHub Pages – adapter avec l'URL Render
            apiUrl = 'https://votre-backend.onrender.com/api';
        }
    }

    window.C2S_CONFIG = { API_BASE_URL: apiUrl };
})();
