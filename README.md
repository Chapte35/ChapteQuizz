# Quiz des Capitales ??

Un jeu de quiz multi-joueurs sur les capitales du monde, où un PC fait office d'hôte et les joueurs participent depuis leur téléphone.

## ?? Fonctionnalités

- **Mode hôte (PC)** : Créer et gérer une partie
- **Mode joueur (Mobile)** : Rejoindre une partie avec un code
- **Questions aléatoires** sur les capitales du monde
- **Système de points** avec bonus de rapidité
- **Classement en temps réel**
- **Interface responsive** adaptée mobile et desktop

## ?? Installation et déploiement

### Déploiement sur GitHub Pages

1. **Forkez ce repository** ou créez un nouveau repository
2. **Uploadez tous les fichiers** dans votre repository
3. **Activez GitHub Pages** :
   - Allez dans Settings > Pages
   - Sélectionnez "Deploy from a branch"
   - Choisissez "main" comme branche source
   - Cliquez sur Save

4. **Créez le fichier `_config.yml`** (si pas déjà présent) :
```yaml
# Configuration GitHub Pages
title: Quiz des Capitales
description: Jeu de quiz multi-joueurs sur les capitales
```

5. **Votre site sera accessible** à : `https://chapte35.github.io/ChapteQuizz/`

### Installation locale

```bash
# Clonez le repository
git clone https://github.com/votre-username/quiz-capitales.git

# Naviguez dans le dossier
cd quiz-capitales

# Servez le site localement (Python)
python -m http.server 8000

# Ou avec Node.js
npx serve .

# Accédez à http://localhost:8000
```

## ?? Structure du projet

```
quiz-capitales/
+-- index.html              # Page d'accueil
+-- host.html              # Interface hôte (PC)
+-- player.html            # Interface joueur (mobile)
+-- css/
¦   +-- style.css          # Styles CSS
+-- js/
¦   +-- game.js            # Logique de jeu partagée
¦   +-- host.js            # Logique côté hôte
¦   +-- player.js          # Logique côté joueur
+-- data/
¦   +-- questions.json     # Base de données des questions
+-- README.md              # Cette documentation
+-- _config.yml            # Configuration GitHub Pages
```

## ?? Comment jouer

### Pour l'hôte (PC)
1. Ouvrez le site et cliquez sur "Hôte de la partie"
2. Configurez les paramètres (nombre de questions, temps par question)
3. Partagez le code de la partie affiché aux joueurs
4. Attendez que les joueurs se connectent
5. Cliquez sur "Commencer la partie"

### Pour les joueurs (Mobile)
1. Ouvrez le site sur votre téléphone
2. Cliquez sur "Rejoindre en tant que joueur"
3. Entrez le code de la partie et votre nom
4. Attendez le début de la partie
5. Répondez aux questions en touchant les réponses

## ?? Configuration

### Modifier les questions

Éditez le fichier `data/questions.json` :

```json
{
  "questions": [
    {
      "id": 1,
      "question": "Quelle est la capitale de la France ?",
      "answers": {
        "A": "Paris",
        "B": "Lyon",
        "C": "Marseille",
        "D": "Toulouse"
      },
      "correct": "A",
      "difficulty": "facile"
    }
  ]
}
```

### Paramètres de jeu

Dans `js/game.js`, modifiez `GameConfig` :

```javascript
const GameConfig = {
    POINTS_CORRECT: 100,        // Points pour une bonne réponse
    POINTS_SPEED_BONUS: 50,     // Bonus de rapidité
    DEFAULT_QUESTION_TIME: 15,  // Temps par défaut (secondes)
    CONNECTION_TIMEOUT: 30000   // Timeout de connexion (ms)
};
```

## ?? Personnalisation

### Ajouter de nouvelles fonctionnalités

Le code est structuré de manière modulaire pour faciliter les ajouts :

1. **Nouvelles questions** : Ajoutez dans `questions.json`
2. **Nouveaux types de jeu** : Modifiez la classe `Game` dans `game.js`
3. **Nouvelle interface** : Ajoutez des écrans dans les fichiers HTML
4. **Nouveaux styles** : Modifiez `style.css`

### Exemples d'extensions possibles

- **Catégories de questions** (géographie, histoire, sport...)
- **Mode tournoi** avec élimination
- **Power-ups** et bonus spéciaux
- **Chat en temps réel**
- **Statistiques détaillées**
- **Sauvegarde des scores**

## ?? WebSocket (pour la version avancée)

Actuellement, le jeu fonctionne en mode simulation. Pour une vraie communication temps réel :

1. **Déployez un serveur WebSocket** (Node.js, Python, etc.)
2. **Modifiez `GameConfig.WEBSOCKET_URL`** dans `game.js`
3. **Implémentez la logique serveur** pour :
   - Gestion des salles de jeu
   - Synchronisation des questions
   - Gestion des déconnexions

### Exemple de serveur Node.js/Socket.io

```javascript
const io = require('socket.io')(3000);
const games = new Map();

io.on('connection', (socket) => {
  socket.on('createGame', (gameCode) => {
    // Logique création de partie
  });
  
  socket.on('joinGame', (gameCode, playerName) => {
    // Logique rejoindre partie
  });
});
```

## ?? Thèmes et styles

Le CSS utilise des variables pour faciliter la personnalisation :

```css
:root {
    --primary-color: #4CAF50;
    --secondary-color: #2196F3;
    --accent-color: #FF9800;
    /* Modifiez ces valeurs pour changer le thème */
}
```

## ?? Responsive Design

L'interface s'adapte automatiquement :
- **Desktop** : Interface hôte complète
- **Mobile** : Interface joueur optimisée
- **Tablette** : Interface hybride

## ?? Dépannage

### Problèmes courants

1. **Les questions ne se chargent pas**
   - Vérifiez que `questions.json` est valide
   - Assurez-vous que le serveur web fonctionne

2. **Les joueurs ne peuvent pas se connecter**
   - Vérifiez que tous les appareils sont sur le même réseau
   - Utilisez l'IP locale de l'hôte

3. **L'interface ne s'affiche pas correctement**
   - Vérifiez la console du navigateur
   - Assurez-vous que tous les fichiers CSS/JS sont chargés

## ?? Contribution

Pour contribuer au projet :

1. Forkez le repository
2. Créez une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Committez vos changes (`git commit -am 'Ajoute nouvelle fonctionnalité'`)
4. Poussez vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Créez une Pull Request

## ?? Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## ?? Amusez-vous bien !