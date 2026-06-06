# C2S Projet App - Manuel Général

Bienvenue dans le système de Pilotage Stratégique C2S (Cellule de Coordination et de Suivi Stratégique).

## Architecture du Projet

```
C2S_Projet_App/
├── backend/                     # API Python FastAPI
│   ├── main.py                  # Routes API + middleware sécurité
│   ├── config.py                # Configuration centralisée (.env)
│   ├── auth.py                  # JWT + hachage bcrypt
│   ├── models.py                # Modèles ORM (SQLAlchemy)
│   ├── schemas.py               # Validation Pydantic
│   ├── database.py              # Connexion SQLite/PostgreSQL
│   ├── requirements.txt         # Dépendances Python
│   ├── .env                     # Configuration (secrets, DB, CORS)
│   └── c2s_database.db          # Base de données (créée au 1er lancement)
├── frontend/                    # Interface PWA (Vanilla JS)
│   ├── index.html               # Dashboard + Tableau de bord
│   ├── login.html               # Page d'authentification
│   ├── guide.html               # Manuel utilisateur
│   ├── sw.js                    # Service Worker (cache offline)
│   ├── css/style.css            # Feuille de style unique
│   ├── img/favicon.svg          # Icône
│   └── js/
│       ├── config.js            # Configuration frontend (URL API)
│       ├── app.js               # Cœur de l'application
│       └── bot.js               # Assistant virtuel
├── .gitignore
└── README.md
```

## Déploiement

### Backend (Serveur API)

1. Ouvrez un terminal dans le dossier `backend/` :
   ```
   pip install -r requirements.txt
   python -m uvicorn main:app --reload
   ```
2. Le serveur démarre sur `http://127.0.0.1:8000`

### Frontend (Interface Web)

1. Ouvrez un second terminal dans le dossier `frontend/` :
   ```
   python -m http.server 8080
   ```
2. Ouvrez `http://127.0.0.1:8080` dans votre navigateur.

## Authentification

L'API utilise une **authentification par JWT (JSON Web Token)** :

1. La page de connexion (`login.html`) envoie les identifiants à `POST /api/login`.
2. Le serveur vérifie le mot de passe (haché avec **bcrypt**) et retourne un token JWT signé.
3. Toutes les requêtes suivantes vers `/api/*` doivent inclure l'en-tête :
   ```
   Authorization: Bearer <token>
   ```
4. Un middleware backend vérifie le token avant chaque appel. En cas de token invalide, une réponse **403** est renvoyée et le frontend redirige vers la page de connexion.

### Utilisateurs par défaut

| Utilisateur   | Mot de passe      | Rôle       |
|---------------|-------------------|------------|
| `admin_it`    | `admin2026`       | IT         |
| `operateur`   | `operateur2026`   | OPÉRATEUR  |
| `decideur`    | `decideur2026`    | DÉCIDEUR   |

Ces comptes sont créés automatiquement au premier démarrage du serveur.

## Configuration

### Backend (`.env`)

| Variable                       | Description                          | Valeur par défaut                         |
|--------------------------------|--------------------------------------|-------------------------------------------|
| `DATABASE_URL`                 | URL de connexion à la base de données| `sqlite:///./backend/c2s_database.db`     |
| `SECRET_KEY`                   | Clé secrète pour signer les JWT      | `c2s-change-this-secret-key-in-production`|
| `ACCESS_TOKEN_EXPIRE_MINUTES`  | Durée de validité du token (minutes) | `480` (8h)                                |
| `CORS_ORIGINS`                 | Origines CORS autorisées             | `*`                                       |

### Frontend (`config.js`)

L'URL de l'API backend est configurable via :
1. La variable `window._C2S_API_URL` avant chargement de `config.js`
2. La clé `c2s_api_url` dans `localStorage`
3. La valeur par défaut `http://127.0.0.1:8000/api`

## Sécurité

- **Mots de passe hachés** avec bcrypt (plus de stockage en clair).
- **Tokens JWT signés** avec clé secrète configurable.
- **Middleware de protection** activé sur toutes les routes `/api/*` (sauf `/api/login`).
- **CORS configurable** via variable d'environnement.
- **Fichier `.env`** exclu du versionnement (`.gitignore`).

## Fonctionnalités

- **Tableau de bord** avec feux tricolores automatiques (vert/orange/rouge).
- **Gestion des décisions** (CRUD complet avec mode hors-ligne).
- **Messagerie réseau** interne temps réel.
- **Rapports stratégiques** (quotidien, mensuel, semestriel, annuel).
- **Thèmes visuels** personnalisables avec export/import JSON.
- **Mode Hors-Ligne** : cache PWA, file d'attente de synchronisation, backup automatique.
- **Assistant interactif** : souris virtuelle guidant l'utilisateur.

## Collaboration réseau

1. Un PC sert de **serveur central** (backend FastAPI).
2. Les **postes clients** se connectent via l'adresse IP du serveur : `http://192.168.1.X:8000` pour l'API, `http://192.168.1.X:8080` pour le frontend.
3. Les modifications sont instantanément synchronisées via l'API centrale.

---

Projet propulsé pour la Cellule de Coordination Stratégique.
