const API_BASE_URL = (typeof C2S_CONFIG !== 'undefined' && C2S_CONFIG.API_BASE_URL) || localStorage.getItem('c2s_api_url') || "http://127.0.0.1:8000/api";

function getAuthHeaders() {
    const token = localStorage.getItem('c2s_token');
    if (token) {
        return { 'Authorization': 'Bearer ' + token };
    }
    return {};
}

const originalFetch = window.fetch;
window.fetch = async function() {
    let [resource, config] = arguments;
    if (typeof resource === 'string' && resource.includes(API_BASE_URL)) {
        config = config || {};
        config.headers = config.headers || {};
        const authHeaders = getAuthHeaders();
        Object.assign(config.headers, authHeaders);
    }
    const response = await originalFetch(resource, config);
    if (response.status === 403) {
        localStorage.removeItem('c2s_token');
        localStorage.removeItem('c2s_user_role');
        localStorage.removeItem('c2s_username');
        if (window.location.pathname !== '/login.html') {
            window.location.href = 'login.html';
        }
    }
    return response;
};


document.addEventListener('DOMContentLoaded', () => {
    console.log("C2S Dashboard Loaded.");
    
    // ======== DÉLÉGATION D'ÉVÉNEMENTS (MOTEUR ROBUSTE) ========
    const tbody = document.getElementById('decisions-tbody');
    if (tbody) {
        tbody.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            
            const id = target.getAttribute('data-id');
            const action = target.getAttribute('data-action');
            
            if (!id || !action) return;
            
            e.stopPropagation();
            console.log(`Bot IT Log: Action reçue [${action}] pour ID [${id}]`);
            
            if (action === 'voir') window.openToggleDetails(id);
            if (action === 'modifier') window.openEditModal(id);
            if (action === 'supprimer') window.deleteDecision(id);
        });
    }

    // Ré-injection globale pour compatibilité transitionnelle
    window.openToggleDetails = (id) => {
        const el = document.getElementById(`details-${id}`);
        if (el) el.style.display = el.style.display === "none" ? "table-row" : "none";
    };
    let inputBuffer = "";
    window.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        inputBuffer += e.key;
        if (inputBuffer.length > 4) inputBuffer = inputBuffer.substring(inputBuffer.length - 4);
        if (inputBuffer === "2106") {
            const signature = document.getElementById("designer-signature");
            if (signature) {
                const isHidden = signature.style.display === "none";
                signature.style.display = isHidden ? "block" : "none";
                showToast(isHidden ? "🔐 Signature Concepteur débloquée" : "🔒 Signature Concepteur masquée", "success");
            }
            inputBuffer = "";
        }
    });

    // ===== GESTION DES COULEURS 2.0 (THEMES & PERSISTANCE) =====
    async function syncThemeToBackend() {
        const payload = {
            accent: localStorage.getItem('c2sThemeColor') || "#111c44",
            bg: localStorage.getItem('c2sThemeBg') || "#f5f5f7",
            bgMain: localStorage.getItem('c2sThemeBg') || "#f5f5f7",
            name: localStorage.getItem('c2sThemeName') || "Business Blue"
        };
        try {
            await fetch(`${API_BASE_URL}/config/theme`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify(payload)
            });
        } catch(e) {
            // Mode hors-ligne, pas grave
        }
    }

    async function loadThemeFromBackend() {
        try {
            const res = await fetch(`${API_BASE_URL}/config/theme`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const config = await res.json();
                if (config.accent && config.bg) {
                    localStorage.setItem('c2sThemeColor', config.accent);
                    localStorage.setItem('c2sThemeBg', config.bg);
                    localStorage.setItem('c2sThemeName', config.name || 'Custom');
                    return config;
                }
            }
        } catch(e) {}
        return null;
    }

    window.applyThemePreset = function(accent, bg, name) {
        document.documentElement.style.setProperty('--c2s-accent', accent);
        applyBackgroundColor(bg);
        
        // Update pickers
        document.getElementById('colorPicker').value = accent;
        document.getElementById('bgColorPicker').value = bg;
        
        // Save to localStorage
        localStorage.setItem('c2sThemeColor', accent);
        localStorage.setItem('c2sThemeBg', bg);
        if (name) localStorage.setItem('c2sThemeName', name);
        
        // Sync to backend (persistant dans le dossier de l'app)
        syncThemeToBackend();
        
        // Update UI (active card)
        document.querySelectorAll('.theme-card').forEach(card => {
            card.classList.remove('active');
            if (card.querySelector('.theme-name').innerText === name) {
                card.classList.add('active');
            }
        });

        console.log(`Thème appliqué : ${name || 'Manuel'}`);
    };

    window.toggleAdvancedSettings = function() {
        const adv = document.getElementById('advanced-settings');
        const btn = document.getElementById('btn-toggle-advanced');
        if (adv.style.display === 'none') {
            adv.style.display = 'block';
            btn.innerText = 'Masquer les réglages manuels';
        } else {
            adv.style.display = 'none';
            btn.innerText = 'Afficher les réglages manuels';
        }
    };

    window.exportThemeConfig = function() {
        const config = {
            accent: localStorage.getItem('c2sThemeColor') || "#111c44",
            bg: localStorage.getItem('c2sThemeBg') || "#f4f7fe",
            name: localStorage.getItem('c2sThemeName') || "Custom"
        };
        const dataStr = JSON.stringify(config, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `c2s_theme_config.json`;
        link.click();
        showToast("Configuration du thème exportée 🎨");
    };

    window.importThemeConfig = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const config = JSON.parse(e.target.result);
                if (config.accent && config.bg) {
                    applyThemePreset(config.accent, config.bg, config.name || "Importé");
                    showToast("Thème importé avec succès !");
                }
            } catch (err) {
                showToast("Erreur lors de l'importation du thème.", "error");
            }
        };
        reader.readAsText(file);
    };

    // Chargement initial
    (async function initTheme() {
        const backendConfig = await loadThemeFromBackend();
        if (backendConfig) {
            applyThemePreset(backendConfig.accent, backendConfig.bg, backendConfig.name || 'Business Blue');
        } else {
            const savedAccent = localStorage.getItem('c2sThemeColor') || "#111c44";
            const savedBg = localStorage.getItem('c2sThemeBg') || "#f5f5f7";
            const savedName = localStorage.getItem('c2sThemeName') || "Business Blue";
            applyThemePreset(savedAccent, savedBg, savedName);
        }
        updateLivePreview(
            localStorage.getItem('c2sThemeColor') || "#111c44",
            localStorage.getItem('c2sThemeBg') || "#f5f5f7"
        );
        updateHexInputs(
            localStorage.getItem('c2sThemeColor') || "#111c44",
            localStorage.getItem('c2sThemeBg') || "#f5f5f7"
        );
    })();

    refreshDashboard();

    // Setup Autosave silencieux toutes les 2 minutes (Cache local uniquement !)
    setInterval(autoBackup, 120000);

    // Empêcher la fermeture non-enregistrée
    window.addEventListener("beforeunload", function (e) {
        var confirmationMessage = "Avez-vous bien exporté un fichier de sauvegarde avant de quitter ?";
        (e || window.event).returnValue = confirmationMessage;
        return confirmationMessage;
    });

    // ===== GESTION HORS LIGNE ======
    function updateNetworkStatus(isOnline) {
        const indicator = document.getElementById('network-status');
        if(!indicator) return;
        if(isOnline) {
            indicator.classList.remove('offline');
            indicator.classList.add('online');
            indicator.setAttribute('title', 'Système En Ligne');
        } else {
            indicator.classList.remove('online');
            indicator.classList.add('offline');
            indicator.setAttribute('title', 'Système Hors Ligne');
        }
    }

    // Vérification initiale
    if(!navigator.onLine) {
        updateNetworkStatus(false);
    }

    window.addEventListener('offline', () => {
        updateNetworkStatus(false);
        showToast("⚠️ Connexion perdue. L'application bascule en mode HORS LIGNE.", "warning");
        const local = localStorage.getItem("c2s_EmergencyBackup");
        if(local) {
             currentDecisions = JSON.parse(local);
             renderTable(currentDecisions);
        }
    });

    window.addEventListener('online', () => {
        updateNetworkStatus(true);
        showToast("✅ Connexion rétablie. Synchronisation des données...", "success");
        refreshDashboard();
    });

    // Event listener pour le formulaire
    document.getElementById('decisionForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveDecision();
    });

    // ===== RÉGLAGES COULEUR AVANCÉS =====
    const colorPicker = document.getElementById('colorPicker');
    const bgPicker = document.getElementById('bgColorPicker');
    const hexAccent = document.getElementById('colorHexAccent');
    const hexBg = document.getElementById('colorHexBg');
    const brightnessSlider = document.getElementById('brightnessSlider');
    const brightnessValue = document.getElementById('brightnessValue');
    const chipBg = document.getElementById('chipBg');
    const chipText = document.getElementById('chipText');
    const chipAccent = document.getElementById('chipAccent');
    const previewSidebar = document.getElementById('previewSidebar');
    const previewBar = document.getElementById('previewBar');
    const previewCards = document.querySelectorAll('.preview-card');

    function updateColorChips(accent, bg) {
        if (chipBg) chipBg.style.background = bg;
        if (chipAccent) chipAccent.style.background = accent;
        if (chipText) {
            var c = accent.substring(1);
            var rgb = parseInt(c, 16);
            var r = (rgb >> 16) & 0xff;
            var g = (rgb >> 8) & 0xff;
            var b = (rgb >> 0) & 0xff;
            var luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            chipText.style.background = luma < 128 ? '#f8fafc' : '#2b3674';
        }
    }

    function updateLivePreview(accent, bg) {
        if (previewSidebar) previewSidebar.style.background = bg;
        if (previewBar) previewBar.style.background = bg;
        previewCards.forEach(card => {
            card.style.background = bg === '#ffffff' || !bg ? '#ffffff' : lightenDarkenColor(bg, 20);
            card.style.borderColor = 'rgba(0,0,0,0.04)';
        });
        if (previewSidebar) {
            const logo = previewSidebar.querySelector('.preview-logo');
            if (logo) logo.style.background = accent;
            const lines = previewSidebar.querySelectorAll('.preview-nav-line');
            lines.forEach(l => l.style.background = accent);
        }
        if (chipBg) chipBg.style.background = bg;
        if (chipAccent) chipAccent.style.background = accent;
        if (chipText) {
            var c = accent.substring(1);
            var rgb = parseInt(c, 16);
            var luma = 0.2126 * ((rgb >> 16) & 0xff) + 0.7152 * ((rgb >> 8) & 0xff) + 0.0722 * (rgb & 0xff);
            chipText.style.background = luma < 128 ? '#f8fafc' : '#2b3674';
        }
    }

    function lightenDarkenColor(col, amt) {
        var usePound = false;
        if (col[0] === "#") {
            col = col.slice(1);
            usePound = true;
        }
        var num = parseInt(col, 16);
        var r = Math.min(255, Math.max(0, (num >> 16) + amt));
        var g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
        var b = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
        return (usePound ? "#" : "") + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function updateHexInputs(accent, bg) {
        if (hexAccent) hexAccent.value = accent;
        if (hexBg) hexBg.value = bg;
    }

    // Override applyThemePreset to also update our custom UI
    const originalApplyThemePreset = window.applyThemePreset;
    window.applyThemePreset = function(accent, bg, name) {
        originalApplyThemePreset(accent, bg, name);
        updateHexInputs(accent, bg);
        updateLivePreview(accent, bg);
    };

    if (colorPicker) {
        colorPicker.addEventListener('input', function(e) {
            applyThemePreset(e.target.value, localStorage.getItem('c2sThemeBg') || bgPicker.value, 'Custom');
        });
    }

    if (bgPicker) {
        bgPicker.addEventListener('input', function(e) {
            applyThemePreset(localStorage.getItem('c2sThemeColor') || colorPicker.value, e.target.value, 'Custom');
        });
    }

    if (hexAccent) {
        hexAccent.addEventListener('change', function(e) {
            var val = e.target.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                applyThemePreset(val, localStorage.getItem('c2sThemeBg') || bgPicker.value, 'Custom');
            }
        });
        hexAccent.addEventListener('input', function(e) {
            var val = e.target.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                colorPicker.value = val;
            }
        });
    }

    if (hexBg) {
        hexBg.addEventListener('change', function(e) {
            var val = e.target.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                applyThemePreset(localStorage.getItem('c2sThemeColor') || colorPicker.value, val, 'Custom');
            }
        });
        hexBg.addEventListener('input', function(e) {
            var val = e.target.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                bgPicker.value = val;
            }
        });
    }

    if (brightnessSlider) {
        brightnessSlider.addEventListener('input', function(e) {
            var val = e.target.value;
            brightnessValue.textContent = val + '%';
            var accent = localStorage.getItem('c2sThemeColor') || colorPicker.value;
            var bg = localStorage.getItem('c2sThemeBg') || bgPicker.value;
            var factor = (val - 50) / 100;
            var newAccent = factor >= 0
                ? lightenDarkenColor(accent, Math.round(factor * 60))
                : lightenDarkenColor(accent, Math.round(factor * 60));
            applyThemePreset(newAccent, bg, 'Custom');
        });
    }

    // Clic sur l'onglet Administration pour les Logs IT
    document.getElementById('nav-admin').addEventListener('click', (e) => {
        e.preventDefault();
        openLogsModal();
    });

    // Event listener Menu Mobile
    const btnMobile = document.getElementById('btn-mobile-menu');
    if (btnMobile) {
        btnMobile.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('open');
        });
    }

    // Fermer le menu si clique à l'extérieur (Mobile UX)
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !btnMobile.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    // CHARGEMENT INITIAL DES DONNÉES
    refreshDashboard();
});

let currentDecisions = []; 
let currentEditingId = null;

async function refreshDashboard() {
    await fetchDashboardData();
    await fetchDecisions();
}

// ========= APPEL API: Feux Tricolores =========
async function fetchDashboardData() {
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/feux-tricolores`);
        const result = await response.json();
        
        if (result.status === "success") {
            updateDashboardCounters(result.data.vert, result.data.orange, result.data.rouge);
        }
    } catch (error) {
        console.warn("Mode Hors-Ligne : Calcul des compteurs en local.");
        
        const today = new Date().toISOString().split('T')[0];
        let vert = 0, orange = 0, rouge = 0;

        currentDecisions.forEach(d => {
            // Logique auto-pilotée identique au backend
            if (d.statut === 'rouge' || (d.avancement < 100 && d.echeance && d.echeance < today)) {
                rouge++;
            } else if (d.statut === 'orange' || (d.difficultes && d.difficultes.trim().length > 0)) {
                orange++;
            } else {
                vert++;
            }
        });
        updateDashboardCounters(vert, orange, rouge);
    }

}

function updateDashboardCounters(vert, orange, rouge) {
    const currentVert = parseInt(document.getElementById("val-vert").innerText) || 0;
    const currentOrange = parseInt(document.getElementById("val-orange").innerText) || 0;
    const currentRouge = parseInt(document.getElementById("val-rouge").innerText) || 0;

    animateValue("val-vert", currentVert, vert, 1000);
    animateValue("val-orange", currentOrange, orange, 1000);
    animateValue("val-rouge", currentRouge, rouge, 1000);

    // Scintillement si retard majeur/blocage > 0
    const redCard = document.querySelector('.card-rouge');
    if(redCard) {
        if(rouge > 0) {
            redCard.classList.add('critical-scintillation');
        } else {
            redCard.classList.remove('critical-scintillation');
        }
    }
}


function animateValue(id, start, end, duration) {
    let current = start;
    const range = end - start;
    if (range === 0) {
        document.getElementById(id).innerHTML = end;
        return;
    }
    
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / Math.max(Math.abs(range), 1)));
    const obj = document.getElementById(id);
    
    if(!obj) return;
    
    const timer = setInterval(function() {
        current += increment;
        obj.innerHTML = current;
        if (current == end) {
            clearInterval(timer);
        }
    }, stepTime);
}

// ========= APPEL API: Matrice des Décisions =========
window.triggerManualSave = function() {
    autoBackup();
    syncPendingDecisions();
    showToast("💾 Sauvegarde locale effectuée et synchronisation lancée.", "success");
};

async function fetchDecisions() {
    // 1. Chargement immédiat depuis le cache local pour éviter la perte de données au rafraîchissement
    const backup = localStorage.getItem("c2s_EmergencyBackup");
    if(backup) {
        currentDecisions = JSON.parse(backup);
        renderTable(currentDecisions);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/decisions`);
        const serverDecisions = await response.json();
        
        // 2. Fusion intelligente avec les modifications locales en attente
        const pending = JSON.parse(localStorage.getItem('c2s_pending_sync') || '[]');
        
        // On commence par les données du serveur
        let finalDecisions = [...serverDecisions];
        
        // On applique les modifications locales par-dessus
        pending.forEach(task => {
            if (task.type === 'DELETE') {
                finalDecisions = finalDecisions.filter(d => d.id !== task.id);
            } else if (task.type === 'UPDATE') {
                const idx = finalDecisions.findIndex(d => d.id === task.id);
                if (idx !== -1) finalDecisions[idx] = { ...task.payload, id: task.id };
            } else if (task.type === 'CREATE') {
                finalDecisions.unshift({ ...task.payload, id: task.localId });
            }
        });

        currentDecisions = finalDecisions;
        renderTable(currentDecisions);
        
        // 3. Mettre à jour le backup d'urgence
        localStorage.setItem("c2s_EmergencyBackup", JSON.stringify(currentDecisions));
        
    } catch (error) {
        console.error("Erreur Backend (Mode Offline):", error);
        showToast("Mode Hors-Ligne : Données chargées depuis le cache local.", "warning");
    }
}

function renderTable(decisions) {
    const tbody = document.getElementById('decisions-tbody');
    tbody.innerHTML = '';

    window.toggleDetails = function(id) {
        const el = document.getElementById(`details-${id}`);
        if (el) {
            el.style.display = el.style.display === "none" ? "table-row" : "none";
        }
    };

    if (decisions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;">Aucune décision enregistrée</td></tr>`;
        return;
    }

    decisions.forEach(dec => {
        let badgeClass = `badge-${dec.statut}`;
        let statusText = dec.statut === 'vert' ? 'Dans les temps' : (dec.statut === 'orange' ? 'Retard mineur' : 'Bloqué');

        const tr = document.createElement('tr');
        tr.style.backgroundColor = "var(--c2s-white)";
        tr.innerHTML = `
            <td><strong>${dec.ref}</strong></td>
            <td>${dec.intitule}</td>
            <td>${dec.responsable}</td>
            <td>${dec.echeance}</td>
            <td><span class="badge ${badgeClass}">${statusText}</span></td>
            <td style="text-align: center; white-space: nowrap; gap: 8px; display: flex; justify-content: center; align-items: center; min-height: 50px;">
                <button type="button" data-id="${dec.id}" data-action="voir" style="background:#f1f5f9; border:1px solid #e2e8f0; color:#475569; cursor:pointer; padding:6px 12px; border-radius:6px; font-size: 0.75rem; font-weight: 600;">
                    Voir
                </button>
                <button type="button" data-id="${dec.id}" data-action="modifier" style="background:#fff7ed; border:1px solid #fbbf24; color:#92400e; cursor:pointer; padding:6px 12px; border-radius:6px; font-size: 0.75rem; font-weight: 600;">
                    Modifier
                </button>
                <button type="button" data-id="${dec.id}" data-action="supprimer" style="background:#fef2f2; border:1px solid #fecaca; color:#dc2626; cursor:pointer; padding:6px 12px; border-radius:6px; font-size: 0.75rem; font-weight: 600;">
                    Supprimer
                </button>
            </td>


        `;

        tbody.appendChild(tr);

        const trDetails = document.createElement('tr');
        trDetails.id = `details-${dec.id}`;
        trDetails.style.display = "none";
        trDetails.style.backgroundColor = "var(--c2s-bg-main)";
        trDetails.innerHTML = `
            <td colspan="7" style="padding: 0;">
                <div style="padding: 15px; margin: 5px 10px; border: 1px dashed var(--c2s-borders); border-left: 4px solid var(--c2s-accent); border-radius: 5px; font-size: 0.85rem; color: var(--c2s-text-dark); text-align: left; background: var(--c2s-white);">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <p style="margin-bottom: 8px;"><strong>👔 Autorité émettrice :</strong> ${dec.autorite || 'Non spécifié'}</p>
                            <p style="margin-bottom: 8px;"><strong>⏱ Échéances Intermédiaires :</strong> ${dec.echeances_inter || 'Non spécifié'}</p>
                        </div>
                        <div>
                            <p style="margin-bottom: 8px;"><strong>⚠️ Difficultés / Blocages :</strong> ${dec.difficultes || 'Aucune anomalie signalée'}</p>
                            <p style="margin-bottom: 8px;"><strong>🛠️ Mesures correctrices :</strong> ${dec.mesures || 'Non spécifié'}</p>
                        </div>
                    </div>
                    <div style="margin-top: 15px; border-top: 1px solid var(--c2s-borders); padding-top: 10px; display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" class="btn btn-outline" style="padding: 5px 15px; font-size: 0.75rem; border-color: var(--c2s-red); color: var(--c2s-red); display: flex; align-items: center; gap: 5px; cursor: pointer; position: relative; z-index: 10;" onclick="event.stopPropagation(); window.deleteDecision(${dec.id})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            Supprimer
                        </button>
                        <button type="button" class="btn btn-outline" style="padding: 5px 15px; font-size: 0.75rem; display: flex; align-items: center; gap: 5px; cursor: pointer; position: relative; z-index: 10;" onclick="event.stopPropagation(); window.openEditModal(${dec.id})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            Modifier
                        </button>
                    </div>

                </div>



            </td>
        `;
        tbody.appendChild(trDetails);
    });
}

// ========= MODAL ET SAUVEGARDE =========
function openDecisionModal() {
    currentEditingId = null; // Réinitialise si on vient du bouton "+"
    document.getElementById('modalTitle').innerText = "Enregistrer une Nouvelle Décision";
    document.getElementById('decisionForm').reset();
    document.getElementById('decisionModal').classList.add('show');
}

function closeDecisionModal() {
    document.getElementById('decisionModal').classList.remove('show');
    document.getElementById('decisionForm').reset();
    currentEditingId = null;
}

window.openEditModal = function(id) {
    console.log("Tentative de modification de la décision ID:", id);
    const dec = currentDecisions.find(d => d.id == id);
    if(!dec) {
        console.error("Décision non trouvée pour l'ID:", id);
        return;
    }

    
    currentEditingId = id;
    document.getElementById('modalTitle').innerText = "Modifier la Décision (Correction)";
    
    // Remplir le formulaire avec les données existantes
    document.getElementById('ref').value = dec.ref || '';
    document.getElementById('echeance').value = dec.echeance || '';
    document.getElementById('intitule').value = dec.intitule || '';
    document.getElementById('responsable').value = dec.responsable || '';
    document.getElementById('avancement').value = dec.avancement || 0;
    document.getElementById('statut').value = dec.statut || 'vert';
    document.getElementById('autorite').value = dec.autorite || '';
    document.getElementById('echeances_inter').value = dec.echeances_inter || '';
    document.getElementById('difficultes').value = dec.difficultes || '';
    document.getElementById('mesures').value = dec.mesures || '';
    
    document.getElementById('decisionModal').classList.add('show');
}

window.deleteDecision = async function(id) {
    if (!confirm("⚠️ Êtes-vous sûr de vouloir supprimer définitivement cette décision ?")) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/decisions/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast("🗑️ Décision supprimée de la matrice.");
            await refreshDashboard();
        } else {
            showToast("Erreur lors de la suppression.", "error");
        }
    } catch (error) {
        console.error("Erreur suppression:", error);
        
        // Mode Hors-ligne : Suppression locale
        let pending = JSON.parse(localStorage.getItem('c2s_pending_sync') || '[]');
        pending.push({ type: 'DELETE', id: id });
        localStorage.setItem('c2s_pending_sync', JSON.stringify(pending));
        
        currentDecisions = currentDecisions.filter(d => d.id !== id);
        renderTable(currentDecisions);
        
        showToast("🗑️ Suppression mise en attente (Hors-ligne).", "warning");
    }
}

async function saveDecision() {
    const submitBtn = document.querySelector('.modal-footer .btn-primary');
    submitBtn.innerText = "Enregistrement...";
    submitBtn.disabled = true;

    const payload = {
        ref: document.getElementById('ref').value,
        echeance: document.getElementById('echeance').value,
        intitule: document.getElementById('intitule').value,
        responsable: document.getElementById('responsable').value,
        avancement: parseInt(document.getElementById('avancement').value) || 0,
        statut: document.getElementById('statut').value,
        autorite: document.getElementById('autorite').value,
        echeances_inter: document.getElementById('echeances_inter').value,
        difficultes: document.getElementById('difficultes').value,
        mesures: document.getElementById('mesures').value
    };

    try {
        const url = currentEditingId ? `${API_BASE_URL}/decisions/${currentEditingId}` : `${API_BASE_URL}/decisions`;
        const method = currentEditingId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            closeDecisionModal();
            showToast(currentEditingId ? "✏️ Mise à jour réussie !" : "💾 Enregistré avec succès !");
            await refreshDashboard();
        } else {
            showToast("Erreur lors de l'enregistrement.", "error");
        }
    } catch (error) {
        console.error("Erreur Hors Ligne:", error);
        
        let pending = JSON.parse(localStorage.getItem('c2s_pending_sync') || '[]');
        
        if (currentEditingId) {
            pending.push({ type: 'UPDATE', id: currentEditingId, payload: payload });
            const idx = currentDecisions.findIndex(d => d.id === currentEditingId);
            if (idx !== -1) currentDecisions[idx] = { ...payload, id: currentEditingId };
        } else {
            const localId = "LOCAL_" + Date.now();
            pending.push({ type: 'CREATE', payload: payload, localId: localId });
            currentDecisions.unshift({ ...payload, id: localId });
        }
        
        localStorage.setItem('c2s_pending_sync', JSON.stringify(pending));
        renderTable(currentDecisions);
        
        showToast("⚠️ Connexion perdue : Action sécurisée localement.", "warning");
        closeDecisionModal();
    } finally {
        submitBtn.innerText = "Enregistrer";
        submitBtn.disabled = false;
    }
}

// ========= SYNCHRONISATION AUTOMATIQUE HORS-LIGNE =========
async function syncPendingDecisions() {
    if (!navigator.onLine) return; // Si l'OS signale "pas d'internet", ne pas tenter
    
    let pendingStr = localStorage.getItem('c2s_pending_sync');
    if (!pendingStr) return;
    
    let pending = JSON.parse(pendingStr);
    if (pending.length === 0) return;
    
    let successfulSyncs = false;
    let remaining = [];
    
    for (let task of pending) {
        try {
            let response;
            if (task.type === 'DELETE') {
                response = await fetch(`${API_BASE_URL}/decisions/${task.id}`, { method: 'DELETE' });
            } else if (task.type === 'UPDATE') {
                response = await fetch(`${API_BASE_URL}/decisions/${task.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(task.payload)
                });
            } else if (task.type === 'CREATE' || !task.type) {
                // Fallback pour les anciens formats ou CREATE
                const payload = task.payload || task;
                response = await fetch(`${API_BASE_URL}/decisions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (response && response.ok) {
                successfulSyncs = true;
            } else {
                remaining.push(task);
            }
        } catch (error) {
            remaining.push(task);
        }
    }
    
    if (successfulSyncs) {
        showToast("✓ Données hors-ligne expédiées au Serveur Central !");
        refreshDashboard();
    }
    
    // MAJ de la file d'attente locale
    if(remaining.length > 0) {
        localStorage.setItem('c2s_pending_sync', JSON.stringify(remaining));
    } else {
        localStorage.removeItem('c2s_pending_sync');
    }
}

// Vérification réseau périodique
setInterval(syncPendingDecisions, 10000); // Check toutes les 10 secondes
window.addEventListener('online', syncPendingDecisions); // Déclenchement au retour réseau instantané

// ========= EXPORT SAUVEGARDE =========
// ==== SAUVEGARDE ET EXPORT ======
function exportData() {
    if (currentDecisions.length === 0) {
        showToast("Opération annulée : Tableau vide.", "warning");
        return;
    }
    
    showToast("Génération du fichier d'Export en cours...");
    
    const dataStr = JSON.stringify(currentDecisions, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    
    let d = new Date();
    const ts = d.toISOString().split('T')[0] + "_" + d.getHours() + "h" + d.getMinutes();
    link.download = `c2s_sauvegarde_${ts}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==== SAUVEGARDE AUTOMATIQUE SILENCIEUSE (CACHE LOCAL) ======
function autoBackup() {
    // Ne SURTOUT PAS forcer un téléchargement (exportData) en boucle, 
    // ça bug et freeze le navigateur de l'utilisateur !
    localStorage.setItem("c2s_EmergencyBackup", JSON.stringify(currentDecisions));
    console.log("Auto-Sauvegarde Locale Invisible : OK");
    if(typeof showToast === 'function') {
        showToast("Sauvegarde automatique locale effectuée", "success");
    }
}

// ========= RESTAURATION / INTEGRATION =========
async function processIntegration() {
    const fileInput = document.getElementById('importFileVisual');
    if (!fileInput.files || fileInput.files.length === 0) {
        showToast("Veuillez sélectionner un fichier JSON.", "warning");
        return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (!Array.isArray(importedData)) throw new Error("Format JSON non-matrice");

            showToast("Intégration de la donnée en cours...");
            
            const response = await fetch(`${API_BASE_URL}/decisions/restore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(importedData)
            });

            if(response.ok) {
                showToast("Succès ! Données correctement ingérées par l'API.");
                document.getElementById('integrationModal').classList.remove('show');
                await refreshDashboard();
            } else {
                showToast("Échec: Données corrompues ou refusées par la base.", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Crash d'intégration: Fichier JSON illisible.", "error");
        }
        fileInput.value = "";
    };
    reader.readAsText(file);
}

// ========== FONCTIONS UTILITAIRES (Toast, Contraste) ===========
function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    if(!container) return;
    
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerText = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if (container.contains(toast)) container.removeChild(toast);
    }, 4000);
}
function applyBackgroundColor(hexColor) {
    document.documentElement.style.setProperty('--c2s-bg-main', hexColor);
    
    // Convertir hex en rgb rapide pour deviner la luminance
    var c = hexColor.substring(1);
    var rgb = parseInt(c, 16);
    var r = (rgb >> 16) & 0xff;
    var g = (rgb >>  8) & 0xff;
    var b = (rgb >>  0) & 0xff;
    var luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // Luminance

    if (luma < 128) {
        // Fond sombre = Texte clair et cartes sombres
        document.documentElement.style.setProperty('--c2s-white', '#1e293b');
        document.documentElement.style.setProperty('--c2s-text-dark', '#f8fafc');
        document.documentElement.style.setProperty('--c2s-borders', '#334155');
    } else {
        // Fond clair = Textes foncés, cartes blanches
        document.documentElement.style.setProperty('--c2s-white', '#ffffff');
        document.documentElement.style.setProperty('--c2s-text-dark', '#2b3674');
        document.documentElement.style.setProperty('--c2s-borders', '#e9edf7');
    }
}

// ============ LOGS IT TERMINAL =============
function openLogsModal() {
    document.getElementById('logsModal').classList.add('show');
    fetchLogs();
}

function closeLogsModal() {
    document.getElementById('logsModal').classList.remove('show');
}

async function fetchLogs() {
    const logsDiv = document.getElementById('it-logs-content');
    logsDiv.innerHTML = "Récupération côté serveur...";
    try {
        const res = await fetch(`${API_BASE_URL}/logs`);
        const json = await res.json();
        logsDiv.innerHTML = json.logs;
        // Scroll to bottom
        logsDiv.scrollTop = logsDiv.scrollHeight;
    } catch(e) {
        logsDiv.innerHTML = "Erreur de connexion au serveur !";
    }
}

// ============ MESSAGERIE RÉSEAU =============
function openMessagingModal() {
    document.getElementById('messagingModal').classList.add('show');
    fetchMessages();
    // Auto-refresh messages every 10 seconds while modal is open
    window.messagingInterval = setInterval(fetchMessages, 10000);
}

function closeMessagingModal() {
    document.getElementById('messagingModal').classList.remove('show');
    clearInterval(window.messagingInterval);
}

async function fetchMessages() {
    const display = document.getElementById('messages-display');
    try {
        const res = await fetch(`${API_BASE_URL}/messages`);
        const messages = await res.json();
        
        display.innerHTML = messages.length === 0 ? '<p style="text-align: center; color: var(--c2s-text-muted);">Aucun message sur le réseau.</p>' : '';
        
        messages.reverse().forEach(msg => {
            const div = document.createElement('div');
            div.style.padding = '8px 12px';
            div.style.borderRadius = '8px';
            div.style.backgroundColor = 'var(--c2s-white)';
            div.style.border = '1px solid var(--c2s-borders)';
            div.innerHTML = `
                <div style="font-size: 0.7rem; color: var(--c2s-accent); font-weight: bold; margin-bottom: 3px;">
                    ${msg.expediteur} <span style="font-weight: normal; color: var(--c2s-text-muted); float: right;">${msg.timestamp}</span>
                </div>
                <div style="font-size: 0.9rem;">${msg.contenu}</div>
            `;
            display.appendChild(div);
        });
        display.scrollTop = display.scrollHeight;
    } catch (e) {
        display.innerHTML = '<p style="color: var(--c2s-red);">Erreur de connexion messagerie.</p>';
    }
}

document.getElementById('messageForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const sender = document.getElementById('msg-sender').value;
    const content = document.getElementById('msg-content').value;
    
    const payload = {
        expediteur: sender,
        contenu: content,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2h', minute: '2h' })
    };

    try {
        const res = await fetch(`${API_BASE_URL}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if(res.ok) {
            document.getElementById('msg-content').value = '';
            await fetchMessages();
        }
    } catch (e) {
        showToast("Échec de l'envoi du message.", "error");
    }
});

// ============ GÉNÉRATION DE RAPPORTS =============
function generateReport(type) {
    const resultDiv = document.getElementById('report-result');
    const title = document.getElementById('report-title');
    const text = document.getElementById('report-text');
    
    resultDiv.style.display = 'block';
    title.innerText = `RAPPORT STRATÉGIQUE ${type}`;
    
    let content = `Date de génération : ${new Date().toLocaleString('fr-FR')}\n`;
    content += `Type : ${type}\n`;
    content += `-------------------------------------------\n\n`;
    
    const decisionsVal = currentDecisions || [];
    const vert = decisionsVal.filter(d => d.statut === 'vert').length;
    const orange = decisionsVal.filter(d => d.statut === 'orange').length;
    const rouge = decisionsVal.filter(d => d.statut === 'rouge').length;
    
    content += `RÉSUMÉ DES FEUX :\n`;
    content += `- Vert (Dans les temps) : ${vert}\n`;
    content += `- Orange (Retard mineur) : ${orange}\n`;
    content += `- Rouge (BLOCAGE) : ${rouge}\n\n`;
    
    if (rouge > 0) {
        content += `🚨 ALERTE : ${rouge} PROJET(S) EN BLOCAGE CRITIQUE !\n`;
        const redList = decisionsVal.filter(d => d.statut === 'rouge');
        redList.forEach(d => {
            content += `  - [${d.ref}] ${d.intitule} (Resp: ${d.responsable})\n`;
        });
        content += `\n`;
    }
    
    content += `DÉTAILS DES ACTIVITÉS (Extraits) :\n`;
    decisionsVal.slice(0, 15).forEach(d => {
        content += `[${d.statut.toUpperCase()}] ${d.ref} : ${d.intitule} - Avancement: ${d.avancement}%\n`;
    });

    text.value = content;
}

function downloadReport() {
    const content = document.getElementById('report-text').value;
    const titleText = document.getElementById('report-title').innerText.replace(/ /g, '_');
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${titleText}_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
}

window.printReport = function() {
    const title = document.getElementById('report-title').innerText || 'RAPPORT STRATÉGIQUE';
    const content = document.getElementById('report-text').value;
    
    // Détection logique pour l'impression (Interface)
    if(typeof showToast === 'function') {
        showToast("Recherche d'imprimantes réseau ou locales branchées...", "success");
    }
    
    setTimeout(() => {
        const printWindow = window.open('', '_blank');
        if(!printWindow) {
            if(typeof showToast === 'function') showToast("Veuillez autoriser les pop-ups pour imprimer.", "error");
            return;
        }
        printWindow.document.write(`
            <html>
                <head>
                    <title>Impression - ${title}</title>
                    <style>
                        body { font-family: 'Helvetica', 'Arial', sans-serif; white-space: pre-wrap; color: #000; padding: 2rem; }
                        h2 { color: #333; border-bottom: 2px solid #000; padding-bottom: 10px; }
                        .footer { margin-top: 50px; font-size: 0.8rem; color: #666; border-top: 1px solid #ccc; padding-top: 10px; text-align: center; }
                    </style>
                </head>
                <body>
                    <h2>${title}</h2>
                    <div>${content}</div>
                    <div class="footer">Document généré automatiquement par C2S App - Strictement Confidentiel</div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    }, 1500);
};

window.openSettingsModal = function() {
    document.getElementById('settingsModal').classList.add('show');
};

window.openBlocagesModal = async function() {
    await refreshDashboard();
    document.getElementById('blocagesModal').classList.add('show');
    renderBlocagesTable();
};

function renderBlocagesTable() {
    const tbody = document.getElementById('blocages-tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    const blocagesList = currentDecisions.filter(d => 
        d.statut === 'rouge' || 
        d.statut === 'orange' || 
        (d.difficultes && d.difficultes.trim().length > 0)
    );
    
    if (blocagesList.length === 0) {
         tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--c2s-green);">✨ Aucun retard ou blocage majeur détecté sur les projets en cours.</td></tr>`;
         return;
    }
    
    blocagesList.forEach(dec => {
        let isRouge = dec.statut === 'rouge';
        let statusText = isRouge ? 'Bloqué' : 'Retard mineur';
        let badgeClass = isRouge ? 'badge-rouge' : 'badge-orange';
        
        // Escape special characters to avoid breaking the inline javascript alert
        let difficultText = dec.difficultes ? dec.difficultes.replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\n/g, " ") : 'Aucune description';
        let mesureText = dec.mesures ? dec.mesures.replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\n/g, " ") : 'Aucune mesure suggérée';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${dec.ref}</strong></td>
            <td>${dec.intitule}</td>
            <td>${dec.responsable}</td>
            <td><span class="badge ${badgeClass}">${statusText}</span></td>
            <td><button class="btn btn-outline" style="padding: 0.3rem 0.6rem; font-size: 0.7rem;" onclick="alert('DIFFICULTÉ : \\n${difficultText}\\n\\nMESURE CORRECTRICE : \\n${mesureText}')">Voir Solutions</button></td>
        `;
        tbody.appendChild(tr);
    });
}
