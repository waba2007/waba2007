# WABA – Agent IA personnel local avec interface Telegram

WABA est un agent d'intelligence artificielle personnel, sécurisé et modulaire conçu pour s'exécuter localement sur votre machine tout en communiquant via Telegram.

## 🧠 Fonctionnalités

- **Interface Telegram** : Communication unique via un bot Telegram (Long Polling).
- **Mémoire Persistante** : Historique des conversations et souvenirs stockés localement dans SQLite.
- **Boucle de Raisonnement** : L'agent peut réfléchir, agir (exécuter des outils) et se souvenir.
- **Sécurité** : Système de liste blanche (whitelist) pour restreindre l'accès à vos propres IDs Telegram.
- **Multi-Modèles** : Utilise OpenRouter comme fournisseur principal avec un mécanisme de secours (fallback) vers Gemini.

## 🛠️ Stack Technique

- **Runtime** : Node.js (TypeScript + ESM)
- **Framework Bot** : `grammy`
- **Base de données** : `better-sqlite3`
- **Exécution** : `tsx`
- **API LLM** : OpenRouter

## 🚀 Installation et Lancement

### 1. Prérequis
- Node.js (v18+)
- NPM
- Un Token de Bot Telegram (obtenu via @BotFather)
- Une clé API OpenRouter

### 2. Configuration
1. Clonez ou copiez le projet dans un dossier.
2. Renommez le fichier `.env.example` en `.env`.
3. Remplissez les variables obligatoires :
    - `TELEGRAM_BOT_TOKEN`
    - `TELEGRAM_ALLOWED_IDS` (votre ID Telegram pour la sécurité)
    - `OPENROUTER_API_KEY`

### 3. Installation des dépendances
```bash
npm install
```

### 4. Lancement
En mode développement (avec auto-reload) :
```bash
npm run dev
```

En mode production :
```bash
npm run start
```

## 📂 Structure du projet

- `src/index.ts` : Point d'entrée.
- `src/config/` : Validation des variables d'environnement.
- `src/bot/` : Logique du bot Telegram et sécurité.
- `src/agent/` : Boucle de raisonnement et appels LLM.
- `src/tools/` : Registre et implémentation des outils (ex: `get_current_time`).
- `src/memory/` : Gestion de la base de données SQLite.
- `database/` : Dossier contenant le fichier `.sqlite`.

## 🔒 Sécurité
WABA ignore silencieusement tout message provenant d'un ID Telegram non présent dans la variable `TELEGRAM_ALLOWED_IDS` de votre fichier `.env`.

---
© 2026 WABA Project - Créé avec passion pour une IA sous votre contrôle.
