# QuizFeedback 🎯🧠

Application pédagogique **100% autonome et sans identifiant** pour enrichir les quiz issus de **Quiz Wizard** avec des rétroactions formatives élaborées selon les travaux scientifiques de **Pascal Pansu**, et les exporter directement pour **LogiQuiz** et **Digiquiz** ([La Digitale](https://ladigitale.dev)).

---

## 🌟 La Démarche en 4 Étapes

```
[ Quiz Wizard ]  ➡️  [ QuizFeedback ]  ➡️  [ Moteur Pascal Pansu ]  ➡️  [ LogiQuiz / Digiquiz ]
(Génération IA)      (Import .h5p/json)     (Rétroactions formatives)    (Diffusion élèves)
```

1. **Quiz Wizard** : Connectez-vous sur [Quiz Wizard](https://app.getquizwizard.com/create-content/source) pour générer votre série de questions à partir d'un cours ou d'un document, puis exportez au format **H5P** (`.h5p`).
2. **QuizFeedback** : Glissez-déposez le fichier `.h5p` ou `.json` dans QuizFeedback. L'application extrait instantanément les questions, bonnes réponses et distracteurs.
3. **Rétroactions Pascal Pansu** :
   - Générez en 1 clic le prompt structuré intégrant les directives pédagogiques de Pascal Pansu.
   - Soumettez-le à votre IA préférée (ChatGPT, Claude, Mistral, Gemini).
   - Collez la réponse pour injecter automatiquement un retour étayé sur chaque mauvaise réponse (identification du piège, relance réflexive, attribution causale contrôlable sans sanction binaire).
4. **LogiQuiz & Digiquiz (La Digitale)** :
   - Testez votre quiz directement dans le simulateur interactif.
   - Téléchargez le package `.h5p` prêt à l'emploi.
   - Ouvrez-le dans **LogiQuiz** (bureau hors ligne) ou déposez-le sur **Digiquiz** (`digiquiz.ladigitale.dev`) pour générer un lien direct ou un QR code pour vos élèves, sans création de compte.

---

## 🔬 Fondements Pédagogiques : La Logique de Pascal Pansu

L'évaluation formative selon Pascal Pansu (notamment Georges & Pansu, 2011 ; Pansu & Sarrazin) repose sur des principes fondamentaux :
- **Proscription des verdicts binaires punitifs** : bannir les mentions "Faux", "Perdu" ou "Mauvaise réponse" qui nuisent au sentiment d'efficacité personnelle (SEP).
- **Feed-up, Feed-back, Feed-forward** : expliciter l'objectif d'apprentissage, situer la méconception qui a rendu le distracteur tentant, et proposer une piste concrète d'action.
- **Attribution causale interne et contrôlable** : valoriser les facteurs modifiables (méthode de lecture, vérification des calculs, attention aux indices) plutôt que des jugements sur les capacités de l'élève.

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
- **Frontend** : React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Backend & Moteur H5P** : Node.js natif (`node:zlib`, `node:sqlite`, `node:crypto`)
- **Desktop** : Electron, electron-builder (cibles DMG macOS, EXE Windows, AppImage Linux)
- **Conteneur** : Docker multi-stage (Node 22 alpine)
- **Interopérabilité** : Standard H5P QuestionSet 1.20 / MultiChoice 1.16 conforme à La Digitale (LogiQuiz & Digiquiz).
