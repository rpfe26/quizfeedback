# QuizFeedback 🎯🧠

Application pédagogique **100% autonome et sans identifiant** pour enrichir les quiz issus de **Quiz Wizard** avec des rétroactions formatives élaborées selon les travaux scientifiques de **Pascal Pansu**, et les exporter directement pour **DigiQuiz** et **LogiQuiz** ([La Digitale](https://ladigitale.dev)).

---

## 🌟 Le Cheminement en 5 Étapes

```
[ 1. Quiz Wizard ] ➡️ [ 2. Import & Prompt ] ➡️ [ 3. Réponse IA ] ➡️ [ 4. Contrôle & Export ] ➡️ [ 5. DigiQuiz ]
```

1. **Étape 1 : Je fais mon quiz et je le télécharge** : 
   - Créez votre QCM sur [Quiz Wizard](https://app.getquizwizard.com/create-content/source) et téléchargez-le au format `.h5p`.
2. **Étape 2 : J'importe et je copie le prompt** :
   - Glissez-déposez le fichier `.h5p` ou `.json` dans QuizFeedback.
   - Copiez en 1 clic le prompt pédagogique structuré selon les travaux de Pascal Pansu.
3. **Étape 3 : Je fais travailler l'IA et je copie sa réponse** :
   - Collez le prompt dans votre IA favorite (ChatGPT, Claude, Mistral, Assistant de l'État...).
   - Collez la réponse JSON dans QuizFeedback pour injecter automatiquement les rétroactions formatives.
4. **Étape 4 : Je vérifie et modifie les réponses et j'exporte le résultat** :
   - Contrôlez chaque question et ajustez si besoin les rétroactions.
   - Testez le simulateur interactif pour éprouver le vécu élève.
   - Téléchargez le package `.h5p` définitif enrichi.
5. **Étape 5 : J'ouvre DigiQuiz et j'importe mon H5P pour diffusion** :
   - Déposez votre `.h5p` sur [DigiQuiz](https://ladigitale.dev/digiquiz/) pour obtenir un lien direct ou un QR code pour vos élèves, ou ouvrez-le hors ligne dans [LogiQuiz](https://ladigitale.dev/logiquiz/).

---

## 🔬 Fondements Pédagogiques : La Logique de Pascal Pansu

L'évaluation formative selon Pascal Pansu (notamment Georges & Pansu, 2011 ; Pansu & Sarrazin) repose sur des principes fondamentaux :
- **Proscription des verdicts binaires punitifs** : bannir les mentions "Faux", "Perdu" ou "Mauvaise réponse" qui nuisent au sentiment d'efficacité personnelle (SEP).
- **Feed-up, Feed-back, Feed-forward** : expliciter l'objectif d'apprentissage, situer la méconception qui a rendu le distracteur tentant, et proposer une piste concrète d'action.
- **Attribution causale interne et contrôlable** : valoriser les facteurs modifiables (méthode de lecture, vérification des calculs, attention aux indices) plutôt que des jugements sur les capacités de l'élève.

---

## 💻 Livrable Clé en Main pour les Collègues (.dmg / .exe)

Pour mettre QuizFeedback à disposition des collègues sans leur demander d'installer Docker ou Node.js, l'application se distribue sous forme d'application de bureau autonome (.dmg sur Mac, .exe sur Windows).

Les collègues disposent ainsi d'une version d'usage épurée, sans aucune configuration technique requise.

Pour générer vous-même ces livrables pour vos collègues :
```bash
# Générer le fichier .dmg pour macOS :
npm run dist:mac

# Générer l'installateur .exe pour Windows :
npm run dist:win
```
Les fichiers d'installation sont créés automatiquement dans le dossier `release/`.

---

## 🚀 Lancement dans un Conteneur Docker Indépendant

Pour tester immédiatement l'application dans son conteneur Docker autonome :

```bash
# Construire et démarrer le conteneur
docker compose up -d

# L'application est immédiatement accessible sur votre navigateur :
# http://localhost:3050
```

Pour arrêter le conteneur :
```bash
docker compose down
```

Les données des quiz sont conservées dans le volume persistant `quizfeedback_data`.

---

## 💻 Installation Hors Ligne sur Ordinateur (.dmg / .exe)

QuizFeedback peut être compilé sous forme d'application de bureau native fonctionnant **100% hors ligne**, sans connexion internet :

### 1. Prérequis
Node.js 20+ installé sur votre machine.

```bash
npm install
```

### 2. Tester en mode bureau (Electron)
```bash
npm run electron:dev
```

### 3. Générer l'installateur macOS (.dmg)
```bash
npm run dist:mac
```
Le fichier `.dmg` est généré dans le dossier `release/`.

### 4. Générer l'installateur Windows (.exe)
```bash
npm run dist:win
```
L'installateur NSIS `.exe` autonome est généré dans le dossier `release/`.

---

## 🛠️ Développement Local

```bash
# Lancer à la fois l'API locale (port 3050) et l'interface Vite (port 5180)
npm run dev:all

# Ou lancer séparément :
npm run dev:server  # API Node.js SQLite
npm run dev         # Interface React Vite
```

---

## 📦 Technologies Utilisées
- **Frontend** : React 18, TypeScript, CSS Modules (Zero Tailwind), Lucide Icons, Vite
- **Backend & Moteur H5P** : Node.js natif (`node:zlib`, `node:sqlite`, `node:crypto`)
- **Desktop** : Electron, electron-builder (cibles DMG macOS, EXE Windows, AppImage Linux)
- **Conteneur** : Docker multi-stage (Node 22 alpine)
- **Interopérabilité** : Standard H5P QuestionSet 1.20 / MultiChoice 1.16 conforme à La Digitale (LogiQuiz & Digiquiz).
