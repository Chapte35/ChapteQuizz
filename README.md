# Quiz des Capitales ??

Un jeu de quiz multi-joueurs sur les capitales du monde, o� un PC fait office d'h�te et les joueurs participent depuis leur t�l�phone.

## ?? Fonctionnalit�s

- **Mode h�te (PC)** : Cr�er et g�rer une partie
- **Mode joueur (Mobile)** : Rejoindre une partie avec un code
- **Questions al�atoires** sur les capitales du monde
- **Syst�me de points** avec bonus de rapidit�
- **Classement en temps r�el**
- **Interface responsive** adapt�e mobile et desktop

## ?? Installation et d�ploiement

### D�ploiement sur GitHub Pages

1. **Forkez ce repository** ou cr�ez un nouveau repository
2. **Uploadez tous les fichiers** dans votre repository
3. **Activez GitHub Pages** :
   - Allez dans Settings > Pages
   - S�lectionnez "Deploy from a branch"
   - Choisissez "main" comme branche source
   - Cliquez sur Save

4. **Cr�ez le fichier `_config.yml`** (si pas d�j� pr�sent) :
```yaml
# Configuration GitHub Pages
title: Quiz des Capitales
description: Jeu de quiz multi-joueurs sur les capitales
```

5. **Votre site sera accessible** � : `https://chapte35.github.io/ChapteQuizz/`

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

# Acc�dez � http://localhost:8000
```

## ?? Structure du projet

```
quiz-capitales/
+-- index.html              # Page d'accueil
+-- host.html              # Interface h�te (PC)
+-- player.html            # Interface joueur (mobile)
+-- css/
�   +-- style.css          # Styles CSS
+-- js/
�   +-- game.js            # Logique de jeu partag�e
�   +-- host.js            # Logique c�t� h�te
�   +-- player.js          # Logique c�t� joueur
+-- data/
�   +-- questions.json     # Base de donn�es des questions
+-- README.md              # Cette documentation
+-- _config.yml            # Configuration GitHub Pages
```

## ?? Comment jouer

### Pour l'h�te (PC)
1. Ouvrez le site et cliquez sur "H�te de la partie"
2. Configurez les param�tres (nombre de questions, temps par question)
3. Partagez le code de la partie affich� aux joueurs
4. Attendez que les joueurs se connectent
5. Cliquez sur "Commencer la partie"

### Pour les joueurs (Mobile)
1. Ouvrez le site sur votre t�l�phone
2. Cliquez sur "Rejoindre en tant que joueur"
3. Entrez le code de la partie et votre nom
4. Attendez le d�but de la partie
5. R�pondez aux questions en touchant les r�ponses

## ?? Configuration

### Modifier les questions

�ditez le fichier `data/questions.json` :

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

### Param�tres de jeu

Dans `js/game.js`, modifiez `GameConfig` :

```javascript
const GameConfig = {
    POINTS_CORRECT: 100,        // Points pour une bonne r�ponse
    POINTS_SPEED_BONUS: 50,     // Bonus de rapidit�
    DEFAULT_QUESTION_TIME: 15,  // Temps par d�faut (secondes)
    CONNECTION_TIMEOUT: 30000   // Timeout de connexion (ms)
};
```

## ?? Personnalisation

### Ajouter de nouvelles fonctionnalit�s

Le code est structur� de mani�re modulaire pour faciliter les ajouts :

1. **Nouvelles questions** : Ajoutez dans `questions.json`
2. **Nouveaux types de jeu** : Modifiez la classe `Game` dans `game.js`
3. **Nouvelle interface** : Ajoutez des �crans dans les fichiers HTML
4. **Nouveaux styles** : Modifiez `style.css`

### Exemples d'extensions possibles

- **Cat�gories de questions** (g�ographie, histoire, sport...)
- **Mode tournoi** avec �limination
- **Power-ups** et bonus sp�ciaux
- **Chat en temps r�el**
- **Statistiques d�taill�es**
- **Sauvegarde des scores**

## ?? WebSocket (pour la version avanc�e)

Actuellement, le jeu fonctionne en mode simulation. Pour une vraie communication temps r�el :

1. **D�ployez un serveur WebSocket** (Node.js, Python, etc.)
2. **Modifiez `GameConfig.WEBSOCKET_URL`** dans `game.js`
3. **Impl�mentez la logique serveur** pour :
   - Gestion des salles de jeu
   - Synchronisation des questions
   - Gestion des d�connexions

### Exemple de serveur Node.js/Socket.io

```javascript
const io = require('socket.io')(3000);
const games = new Map();

io.on('connection', (socket) => {
  socket.on('createGame', (gameCode) => {
    // Logique cr�ation de partie
  });
  
  socket.on('joinGame', (gameCode, playerName) => {
    // Logique rejoindre partie
  });
});
```

## ?? Th�mes et styles

Le CSS utilise des variables pour faciliter la personnalisation :

```css
:root {
    --primary-color: #4CAF50;
    --secondary-color: #2196F3;
    --accent-color: #FF9800;
    /* Modifiez ces valeurs pour changer le th�me */
}
```

## ?? Responsive Design

L'interface s'adapte automatiquement :
- **Desktop** : Interface h�te compl�te
- **Mobile** : Interface joueur optimis�e
- **Tablette** : Interface hybride

## ?? D�pannage

### Probl�mes courants

1. **Les questions ne se chargent pas**
   - V�rifiez que `questions.json` est valide
   - Assurez-vous que le serveur web fonctionne

2. **Les joueurs ne peuvent pas se connecter**
   - V�rifiez que tous les appareils sont sur le m�me r�seau
   - Utilisez l'IP locale de l'h�te

3. **L'interface ne s'affiche pas correctement**
   - V�rifiez la console du navigateur
   - Assurez-vous que tous les fichiers CSS/JS sont charg�s

## ?? Contribution

Pour contribuer au projet :

1. Forkez le repository
2. Cr�ez une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Committez vos changes (`git commit -am 'Ajoute nouvelle fonctionnalit�'`)
4. Poussez vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Cr�ez une Pull Request

## ?? Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de d�tails.

## ?? Amusez-vous bien !