// bot.js
document.addEventListener('DOMContentLoaded', () => {
    const botToggle = document.getElementById('botToggle');
    const botPanel = document.getElementById('botPanel');
    
    if (botToggle && botPanel) {
        botToggle.addEventListener('click', () => {
            botPanel.classList.toggle('active');
        });
    }
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function moveCursorTo(elementOrSelector) {
    const cursor = document.getElementById('virtual-cursor');
    let target;
    if (typeof elementOrSelector === 'string') {
        target = document.getElementById(elementOrSelector) || document.querySelector(elementOrSelector);
    } else {
        target = elementOrSelector;
    }
    
    if (!cursor || !target) return false;

    
    // Ensure cursor is visible
    cursor.style.display = 'block';
    
    const rect = target.getBoundingClientRect();
    const targetX = rect.left + (rect.width / 2);
    const targetY = rect.top + (rect.height / 2);
    
    // Animate to position
    cursor.style.left = targetX + 'px';
    cursor.style.top = targetY + 'px';
    
    // Wait for animation (1s transition declared in CSS)
    await sleep(1000);
    return { x: targetX, y: targetY };
}


// ============================================
// SURVEILLANCE RÉSEAU ACTIVE (MOTEUR BOT C2S)
// ============================================

window.triggerBotNetworkAlert = function() {
    const botBtn = document.getElementById('botToggle');
    if(botBtn) {
        botBtn.style.animation = 'none'; 
        botBtn.style.backgroundColor = '#ee5d50'; // Rouge Alerte
        botBtn.style.transform = 'scale(1.2) rotate(-15deg)';
        botBtn.innerText = '🚨';
        
        // Remise à zéro après 8 secondes
        setTimeout(() => {
            botBtn.style.backgroundColor = 'var(--c2s-accent)';
            botBtn.style.transform = 'scale(1)';
            botBtn.style.animation = 'waveFlag 3s infinite ease-in-out';
            botBtn.innerText = '🤖';
        }, 8000);
    }
    
    if(typeof showToast === 'function') {
        showToast("ALERTE BOT : Connexion réseau entrante NON RECONNUE interceptée !", "error");
        setTimeout(() => {
            showToast("Bot C2S: Pare-feu actif. Accédez à la 'Console IT' pour tracer la source (IP).", "warning");
        }, 4000);
    }
};

// Initialisation de la surveillance automatique
document.addEventListener('DOMContentLoaded', () => {
    // Première démonstration d'alerte intrusion après 20 sec d'utilisation
    setTimeout(() => {
        triggerBotNetworkAlert();
        
        // Lancement de la boucle de fond : scan permanent
        // Vérification du trafic toutes les 2 minutes (120000ms)
        setInterval(() => {
            // Logique simulée de détection de paquets suspects
            const threatDetected = Math.random() < 0.3; // 30% de déclenchement lors des cycles pour démonstration
            if (threatDetected) { 
                triggerBotNetworkAlert();
            }
        }, 120000); 
    }, 20000);
});

async function simulateClick(x, y, elementOrSelector) {
    // Show ripple
    const ripple = document.createElement('div');
    ripple.className = 'click-ripple';
    ripple.style.left = (x - 20) + 'px';
    ripple.style.top = (y - 20) + 'px';
    document.body.appendChild(ripple);
    
    await sleep(500); // ripple duration
    ripple.remove();
    
    // Actual click logic
    let element;
    if (typeof elementOrSelector === 'string') {
        element = document.getElementById(elementOrSelector) || document.querySelector(elementOrSelector);
    } else {
        element = elementOrSelector;
    }

    if (element) {
        // Create and dispatch a real click event that bubbles
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y
        });
        element.dispatchEvent(clickEvent);
        
        // Fallback for elements that only respond to .click()
        if (typeof element.click === 'function' && !element.tagName.toLowerCase().includes('tr')) {
            element.click();
        }
    }
}

async function startTutorial(action) {
    // Close the bot panel first
    const botPanel = document.getElementById('botPanel');
    botPanel.classList.remove('active');
    
    const cursor = document.getElementById('virtual-cursor');
    // Start cursor at the bot's position roughly
    const botRect = document.getElementById('botToggle').getBoundingClientRect();
    cursor.style.transition = 'none'; // remove transition to snap
    cursor.style.left = botRect.left + 'px';
    cursor.style.top = botRect.top + 'px';
    cursor.style.display = 'block';
    
    // Force reflow
    void cursor.offsetWidth;
    cursor.style.transition = 'top 1s cubic-bezier(0.25, 1, 0.5, 1), left 1s cubic-bezier(0.25, 1, 0.5, 1)';
    
    if(typeof showToast === 'function') {
        showToast("🤖 Laissez-moi vous guider avec mon curseur...", 'success');
    }
    
    await sleep(500);
    
    if (action === 'nouvelleDecision') {
        const targetClass = '.section-header .btn-primary'; 
        const coords = await moveCursorTo(targetClass);
        if(coords) await simulateClick(coords.x, coords.y, targetClass);
        
        await sleep(1000);
        // Move to the logic field inside modal
        const inputCoords = await moveCursorTo('#ref');
        if(inputCoords) {
            await simulateClick(inputCoords.x, inputCoords.y, '#ref');
            document.getElementById('ref').focus();
        }
        
    } else if (action === 'messagerie') {
        const coords = await moveCursorTo('#nav-messages');
        if(coords) {
            await simulateClick(coords.x, coords.y, '#nav-messages');
            await sleep(1000);
            const inputCoords = await moveCursorTo('#msg-sender');
            if(inputCoords) {
                await simulateClick(inputCoords.x, inputCoords.y, '#msg-sender');
                document.getElementById('msg-sender').focus();
            }
        }
    } else if (action === 'adminConsole') {
        const coords = await moveCursorTo('#nav-admin');
        if(coords) await simulateClick(coords.x, coords.y, '#nav-admin');
    } else if (action === 'blocages') {
        const coords = await moveCursorTo('#nav-blocages');
        if(coords) await simulateClick(coords.x, coords.y, '#nav-blocages');
    } else if (action === 'rapports') {
        const coords = await moveCursorTo('#nav-rapports');
        if(coords) {
            await simulateClick(coords.x, coords.y, '#nav-rapports');
            await sleep(1000);
            const reportBtnCoords = await moveCursorTo('#reportsModal .btn-outline'); 
            if(reportBtnCoords) await simulateClick(reportBtnCoords.x, reportBtnCoords.y, '#reportsModal .btn-outline');
        }
    } else if (action === 'modifierDecision') {
        // 1. Aller à la table
        const tableContainer = document.querySelector('.table-container');
        if(tableContainer) tableContainer.scrollIntoView({behavior: 'smooth'});
        await sleep(800);
        
        // 2. Cibler le bouton 'Modifier' (recherche robuste)
        let editBtn = document.querySelector('#decisions-tbody button[data-action="modifier"]');
        
        // Fallback si le sélecteur précis échoue (ex: pas encore rendu ou attribut différent)
        if (!editBtn) {
            const allButtons = Array.from(document.querySelectorAll('button'));
            editBtn = allButtons.find(b => b.innerText.includes('Modifier') && b.offsetParent !== null);
        }
        
        if (editBtn) {
            console.log("Bot: Bouton Modifier trouvé", editBtn);
            const coords = await moveCursorTo(editBtn);
            if(coords) {
                await simulateClick(coords.x, coords.y, editBtn);
                await sleep(1500); // Laisser le temps au modal de s'ouvrir
                
                // 3. Montrer un champ dans le modal pour confirmer l'ouverture
                const modalField = document.getElementById('intitule');
                if (modalField && modalField.offsetParent !== null) {
                    const fieldCoords = await moveCursorTo(modalField);
                    if(fieldCoords) {
                        await simulateClick(fieldCoords.x, fieldCoords.y, modalField);
                        modalField.focus();
                    }
                }
            }
        } else {
            console.warn("Bot: Bouton Modifier NON trouvé");
            if(typeof showToast === 'function') showToast("🤖 Je ne trouve pas de décision à modifier. Assurez-vous qu'il y en a dans la liste.", "warning");
        }
    }

    
    await sleep(1500);
    // Move cursor back to bot and hide
    const backRect = document.getElementById('botToggle').getBoundingClientRect();
    cursor.style.left = backRect.left + 'px';
    cursor.style.top = backRect.top + 'px';
    await sleep(1000);
    cursor.style.display = 'none';
}
