// Variables globales pour l'hôte
let currentGame = null;
let hostId = null;

// Initialisation de l'interface hôte
document.addEventListener('DOMContentLoaded', function() {
    hostId = Utils.generateId();
    initializeHost();
});

// Initialise l'hôte
async function initializeHost() {
    try {
        // Génère un code de partie unique
        const gameCode = generateUniqueGameCode();
        
        // Crée la partie
        currentGame = gameComm.createGame(gameCode, hostId);
        
        // Charge les questions
        const questionsLoaded = await currentGame.loadQuestions();
        if (!questionsLoaded) {
            Utils.showMessage('Erreur lors du chargement des questions', 'error');
            return;
        }
        
        // Affiche le code de la partie
        document.getElementById('gameCode').textContent = gameCode;
        
        // Configure les événements
        setupHostEvents();
        
        // Lance la simulation de connexions (pour les tests)
        startPlayerConnectionSimulation();
        
        Utils.showMessage('Partie créée avec succès !', 'success');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        Utils.showMessage('Erreur lors de la création de la partie', 'error');
    }
}

// Génère un code de partie unique
function generateUniqueGameCode() {
    let code;
    do {
        code = currentGame ? currentGame.generateGameCode() : new Game().generateGameCode();
    } while (gameComm.getGame(code));
    return code;
}

// Configure les événements de l'hôte
function setupHostEvents() {
    // Événements des paramètres
    document.getElementById('questionCount').addEventListener('change', function() {
        if (currentGame) {
            currentGame.settings.questionCount = parseInt(this.value);
        }
    });
    
    document.getElementById('timePerQuestion').addEventListener('change', function() {
        if (currentGame) {
            currentGame.settings.timePerQuestion = parseInt(this.value);
        }
    });
    
    // Simulation de connexion de joueurs
    gameComm.on('playerJoined', (data) => {
        updatePlayersList();
        Utils.showMessage(`${data.playerName} a rejoint la partie`, 'success');
    });
    
    gameComm.on('playerLeft', (data) => {
        updatePlayersList();
        Utils.showMessage(`${data.playerName} a quitté la partie`, 'warning');
    });
}

// Met à jour la liste des joueurs
function updatePlayersList() {
    if (!currentGame) return;
    
    const playersList = document.getElementById('playersList');
    const playerCount = document.getElementById('playerCount');
    const startBtn = document.getElementById('startGameBtn');
    
    // Vide la liste
    playersList.innerHTML = '';
    
    // Ajoute chaque joueur
    currentGame.players.forEach(player => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="player-avatar">👤</span>
            <span class="player-name">${player.name}</span>
            <span class="player-status ${player.connected ? 'connected' : 'disconnected'}">
                ${player.connected ? '🟢' : '🔴'}
            </span>
        `;
        playersList.appendChild(li);
    });
    
    // Met à jour le compteur
    const connectedPlayers = Array.from(currentGame.players.values()).filter(p => p.connected).length;
    playerCount.textContent = connectedPlayers;
    
    // Active/désactive le bouton de démarrage
    startBtn.disabled = connectedPlayers < 1;
}

// Démarre la partie
async function startGame() {
    if (!currentGame || currentGame.players.size === 0) {
        Utils.showMessage('Aucun joueur connecté', 'warning');
        return;
    }
    
    try {
        // Recharge les questions avec les nouveaux paramètres
        await currentGame.loadQuestions();
        
        // Change l'état du jeu
        currentGame.state = GameState.PLAYING;
        currentGame.questionIndex = 0;
        
        // Affiche l'écran de jeu
        document.getElementById('gameSetup').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'block';
        
        // Met à jour l'affichage
        document.getElementById('totalQuestions').textContent = currentGame.questions.length;
        
        // Lance la première question
        showNextQuestion();
        
        Utils.showMessage('Partie démarrée !', 'success');
    } catch (error) {
        console.error('Erreur lors du démarrage:', error);
        Utils.showMessage('Erreur lors du démarrage de la partie', 'error');
    }
}

// Affiche la question suivante
function showNextQuestion() {
    if (!currentGame) return;
    
    const question = currentGame.getCurrentQuestion();
    if (!question) {
        showFinalResults();
        return;
    }
    
    // Met à jour l'affichage
    document.getElementById('currentQuestion').textContent = currentGame.questionIndex + 1;
    document.getElementById('questionText').textContent = question.question;
    
    // Affiche les réponses
    const answersGrid = document.getElementById('answersGrid');
    answersGrid.innerHTML = '';
    
    Object.entries(question.answers).forEach(([letter, answer]) => {
        const div = document.createElement('div');
        div.className = 'answer-option';
        div.dataset.answer = letter;
        div.textContent = `${letter}. ${answer}`;
        answersGrid.appendChild(div);
    });
    
    // Réinitialise l'affichage des réponses des joueurs
    document.getElementById('playersAnswers').innerHTML = '';
    document.getElementById('nextQuestionBtn').style.display = 'none';
    
    // Démarre le timer
    startQuestionTimer();
    
    // Simule les réponses des joueurs
    simulatePlayerAnswers();
}

// Démarre le timer de question
function startQuestionTimer() {
    if (!currentGame) return;
    
    const timeDisplay = document.getElementById('timeLeft');
    
    currentGame.startTimer(
        currentGame.settings.timePerQuestion,
        (timeLeft) => {
            timeDisplay.textContent = timeLeft;
            
            // Change la couleur selon le temps restant
            const circle = timeDisplay.parentElement;
            if (timeLeft <= 5) {
                circle.style.borderColor = '#f44336';
                circle.style.color = '#f44336';
            } else if (timeLeft <= 10) {
                circle.style.borderColor = '#FF9800';
                circle.style.color = '#FF9800';
            }
        },
        () => {
            endQuestion();
        }
    );
}

// Termine la question
function endQuestion() {
    if (!currentGame) return;
    
    currentGame.stopTimer();
    
    // Affiche la bonne réponse
    const correctAnswer = currentGame.currentQuestion.correct;
    const answerOptions = document.querySelectorAll('.answer-option');
    
    answerOptions.forEach(option => {
        if (option.dataset.answer === correctAnswer) {
            option.classList.add('correct');
        }
    });
    
    // Affiche les réponses des joueurs
    showPlayersAnswers();
    
    // Affiche le bouton suivant
    document.getElementById('nextQuestionBtn').style.display = 'block';
}

// Affiche les réponses des joueurs
function showPlayersAnswers() {
    if (!currentGame) return;
    
    const container = document.getElementById('playersAnswers');
    container.innerHTML = '<h3>Réponses des joueurs</h3>';
    
    const currentQuestion = currentGame.currentQuestion;
    if (!currentQuestion) return;
    
    currentGame.players.forEach(player => {
        const playerAnswer = player.answers.find(a => a.questionId === currentQuestion.id);
        
        const div = document.createElement('div');
        div.className = 'player-answer';
        div.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            margin: 5px 0;
            background: #f9f9f9;
            border-radius: 8px;
            border-left: 4px solid ${playerAnswer && playerAnswer.answer === currentQuestion.correct ? '#4CAF50' : '#f44336'};
        `;
        
        div.innerHTML = `
            <span>${player.name}</span>
            <span>
                ${playerAnswer ? `Réponse: ${playerAnswer.answer}` : 'Pas de réponse'}
                ${playerAnswer && playerAnswer.answer === currentQuestion.correct ? ' ✅' : ' ❌'}
            </span>
            <span>Score: ${player.score}</span>
        `;
        
        container.appendChild(div);
    });
}

// Passe à la question suivante
function nextQuestion() {
    if (!currentGame) return;
    
    currentGame.nextQuestion();
    
    if (currentGame.getCurrentQuestion()) {
        showNextQuestion();
    } else {
        showFinalResults();
    }
}

// Affiche les résultats finaux
function showFinalResults() {
    if (!currentGame) return;
    
    currentGame.state = GameState.FINISHED;
    
    // Affiche l'écran des résultats
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('resultsScreen').style.display = 'block';
    
    // Obtient le classement
    const leaderboard = currentGame.getLeaderboard();
    
    // Affiche le podium
    showPodium(leaderboard);
    
    // Affiche les scores finaux
    showFinalScores(leaderboard);
    
    Utils.showMessage('Partie terminée !', 'success');
}

// Affiche le podium
function showPodium(leaderboard) {
    const podium = document.getElementById('podium');
    podium.innerHTML = '';
    
    // Prend les 3 premiers
    const topThree = leaderboard.slice(0, 3);
    
    topThree.forEach((player, index) => {
        const div = document.createElement('div');
        div.className = `podium-place ${['first', 'second', 'third'][index]}`;
        
        const medals = ['🥇', '🥈', '🥉'];
        
        div.innerHTML = `
            <div class="medal">${medals[index]}</div>
            <div class="player-name">${player.name}</div>
            <div class="player-score">${player.score} pts</div>
        `;
        
        podium.appendChild(div);
    });
}

// Affiche les scores finaux
function showFinalScores(leaderboard) {
    const container = document.getElementById('finalScores');
    container.innerHTML = '<h3>Classement final</h3>';
    
    leaderboard.forEach((player, index) => {
        const div = document.createElement('div');
        div.className = 'score-item';
        div.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            margin: 5px 0;
            background: ${index < 3 ? '#f0f8f0' : '#f9f9f9'};
            border-radius: 8px;
            border-left: 4px solid ${index < 3 ? '#4CAF50' : '#ddd'};
        `;
        
        const correctAnswers = player.answers.filter(answer => {
            const question = currentGame.questions.find(q => q.id === answer.questionId);
            return question && answer.answer === question.correct;
        }).length;
        
        div.innerHTML = `
            <span class="rank">#${player.rank}</span>
            <span class="name">${player.name}</span>
            <span class="stats">${correctAnswers}/${currentGame.questions.length}</span>
            <span class="score">${player.score} pts</span>
        `;
        
        container.appendChild(div);
    });
}

// Nouvelle partie
function newGame() {
    if (currentGame) {
        currentGame.reset();
        
        // Retourne à l'écran de configuration
        document.getElementById('resultsScreen').style.display = 'none';
        document.getElementById('gameSetup').style.display = 'block';
        
        // Réinitialise l'affichage
        updatePlayersList();
        
        Utils.showMessage('Prêt pour une nouvelle partie !', 'info');
    }
}

// Retour à l'accueil
function goHome() {
    Utils.goHome();
}

// Simulation de connexions de joueurs (pour les tests)
function startPlayerConnectionSimulation() {
    // Simule l'arrivée de joueurs de test
    setTimeout(() => {
        if (currentGame) {
            const testPlayers = [
                'Alice', 'Bob', 'Charlie', 'Diana'
            ];
            
            testPlayers.forEach((name, index) => {
                setTimeout(() => {
                    const playerId = Utils.generateId();
                    const player = currentGame.addPlayer(playerId, name);
                    if (player) {
                        gameComm.emit('playerJoined', { playerId, playerName: name });
                    }
                }, index * 2000); // Espace les connexions de 2 secondes
            });
        }
    }, 3000); // Commence après 3 secondes
}

// Simulation des réponses des joueurs
function simulatePlayerAnswers() {
    if (!currentGame || !currentGame.currentQuestion) return;
    
    const question = currentGame.currentQuestion;
    const answers = ['A', 'B', 'C', 'D'];
    
    currentGame.players.forEach((player, playerId) => {
        if (!player.connected) return;
        
        // Délai aléatoire pour simuler le temps de réponse
        const responseTime = Math.random() * (currentGame.settings.timePerQuestion - 2) + 1;
        
        setTimeout(() => {
            // Probabilité de donner la bonne réponse (70% pour simuler un jeu réaliste)
            let selectedAnswer;
            if (Math.random() < 0.7) {
                selectedAnswer = question.correct;
            } else {
                // Mauvaise réponse aléatoire
                const wrongAnswers = answers.filter(a => a !== question.correct);
                selectedAnswer = wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)];
            }
            
            const timeRemaining = Math.max(0, currentGame.timeLeft || 0);
            currentGame.submitAnswer(playerId, selectedAnswer, timeRemaining);
            
            // Met à jour l'affichage en temps réel
            updateRealTimeAnswers();
            
        }, responseTime * 1000);
    });
}

// Met à jour l'affichage des réponses en temps réel
function updateRealTimeAnswers() {
    if (!currentGame || !currentGame.currentQuestion) return;
    
    const container = document.getElementById('playersAnswers');
    if (!container) return;
    
    container.innerHTML = '<h3>Réponses en cours...</h3>';
    
    const currentQuestion = currentGame.currentQuestion;
    const answeredCount = Array.from(currentGame.players.values()).filter(player => {
        return player.answers.some(answer => answer.questionId === currentQuestion.id);
    }).length;
    
    const totalPlayers = Array.from(currentGame.players.values()).filter(p => p.connected).length;
    
    const progressDiv = document.createElement('div');
    progressDiv.style.cssText = `
        background: #f0f0f0;
        border-radius: 20px;
        height: 20px;
        margin: 10px 0;
        overflow: hidden;
    `;
    
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        background: #4CAF50;
        height: 100%;
        width: ${(answeredCount / totalPlayers) * 100}%;
        transition: width 0.3s ease;
        border-radius: 20px;
    `;
    
    progressDiv.appendChild(progressBar);
    container.appendChild(progressDiv);
    
    const statusP = document.createElement('p');
    statusP.textContent = `${answeredCount}/${totalPlayers} joueurs ont répondu`;
    statusP.style.textAlign = 'center';
    container.appendChild(statusP);
    
    // Si tous les joueurs ont répondu, termine la question plus tôt
    if (answeredCount === totalPlayers && totalPlayers > 0) {
        setTimeout(() => {
            if (currentGame.timer) {
                endQuestion();
            }
        }, 1000);
    }
}

// Gestion de la déconnexion
window.addEventListener('beforeunload', function() {
    if (currentGame && currentGame.gameCode) {
        gameComm.removeGame(currentGame.gameCode);
    }
});