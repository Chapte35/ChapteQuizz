// Variables globales pour le joueur
let playerId = null;
let playerName = null;
let gameCode = null;
let currentGame = null;
let selectedAnswer = null;

// Initialisation de l'interface joueur
document.addEventListener('DOMContentLoaded', function() {
    playerId = Utils.generateId();
    initializePlayer();
});

// Initialise le joueur
function initializePlayer() {
    // Récupère les informations de connexion
    playerName = localStorage.getItem('playerName');
    gameCode = localStorage.getItem('gameCode');
    
    if (!playerName || !gameCode) {
        showError('Informations de connexion manquantes');
        return;
    }
    
    // Affiche les informations
    document.getElementById('playerNameDisplay').textContent = playerName;
    document.getElementById('gameCodeDisplay').textContent = gameCode;
    
    // Tente de rejoindre la partie
    connectToGame();
}

// Se connecte à la partie
function connectToGame() {
    try {
        console.log('Tentative de connexion avec code:', gameCode, 'nom:', playerName);
        
        // Cherche d'abord une partie existante créée par un hôte
        let game = gameComm.getGame(gameCode);
        
        if (!game) {
            // Aucune partie trouvée avec ce code
            showError(`Aucune partie trouvée avec le code "${gameCode}". Vérifiez que l'hôte a bien créé la partie.`);
            return;
        }
        
        // Vérifie que la partie accepte encore des joueurs
        if (game.state !== GameState.WAITING) {
            showError('Cette partie a déjà commencé ou est terminée.');
            return;
        }
        
        // Tente de rejoindre la partie existante
        const player = gameComm.joinGame(gameCode, playerId, playerName);
        
        if (player) {
            currentGame = game;
            setupPlayerEvents();
            showWaitingScreen();
            Utils.showMessage('Connexion réussie ! En attente du début de la partie...', 'success');
            
            console.log('Connexion réussie, joueurs dans la partie:', game.players.size);
            
            // Notifie les autres joueurs qu'un nouveau joueur a rejoint
            gameComm.emit('playerJoined', { playerId, playerName });
        } else {
            showError('Impossible de rejoindre la partie. Elle pourrait être pleine ou fermée.');
        }
        
    } catch (error) {
        console.error('Erreur de connexion:', error);
        showError('Erreur de connexion: ' + error.message);
    }
}

// NE charge PAS les questions - seul l'hôte le fait
// Cette fonction est supprimée car les joueurs ne créent pas de partie

// Configure les événements du joueur
function setupPlayerEvents() {
    console.log('Configuration des événements joueur');
    
    // Écoute les événements du jeu envoyés par l'hôte
    gameComm.on('gameStarted', () => {
        console.log('Événement: jeu démarré par l\'hôte');
        showGameScreen();
    });
    
    gameComm.on('newQuestion', (questionData) => {
        console.log('Événement: nouvelle question envoyée par l\'hôte', questionData);
        showQuestion(questionData);
    });
    
    gameComm.on('questionEnded', (results) => {
        console.log('Événement: question terminée', results);
        showQuestionResults(results);
    });
    
    gameComm.on('gameEnded', (finalResults) => {
        console.log('Événement: jeu terminé', finalResults);
        showFinalResults(finalResults);
    });
    
    gameComm.on('playerJoined', (data) => {
        console.log('Nouveau joueur rejoint:', data.playerName);
        updatePlayerCount();
    });
    
    gameComm.on('playerLeft', (data) => {
        console.log('Joueur parti:', data.playerName);
        updatePlayerCount();
    });
    
    // PAS de démarrage automatique - on attend que l'hôte démarre
    console.log('En attente que l\'hôte démarre la partie...');
}

// Affiche l'écran d'attente
function showWaitingScreen() {
    document.getElementById('connectionScreen').style.display = 'none';
    document.getElementById('waitingScreen').style.display = 'block';
    
    // Met à jour les informations
    document.getElementById('playerName').textContent = playerName;
    document.getElementById('gameCodeWaiting').textContent = gameCode;
    
    // Met à jour le compteur de joueurs
    updatePlayerCount();
}

// Met à jour le compteur de joueurs
function updatePlayerCount() {
    if (currentGame) {
        const connectedPlayers = Array.from(currentGame.players.values()).filter(p => p.connected).length;
        document.getElementById('playersCount').textContent = connectedPlayers;
    }
}

// Affiche l'écran de jeu
function showGameScreen() {
    document.getElementById('waitingScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    
    // Réinitialise le score
    document.getElementById('playerScore').textContent = '0';
}

// Affiche une question
function showQuestion(questionData) {
    if (!questionData) {
        console.error('Pas de données de question');
        return;
    }
    
    console.log('Affichage question:', questionData);
    
    // Réinitialise la sélection
    selectedAnswer = null;
    
    // Arrête le timer précédent
    if (window.playerTimer) {
        clearInterval(window.playerTimer);
        window.playerTimer = null;
    }
    
    // Met à jour l'affichage
    const questionNumber = document.getElementById('questionNumber');
    const questionDisplay = document.getElementById('questionDisplay');
    
    if (questionNumber) {
        questionNumber.textContent = (questionData.index + 1);
    }
    
    if (questionDisplay) {
        questionDisplay.textContent = questionData.question;
    }
    
    // Affiche les réponses
    const answerButtons = document.querySelectorAll('.answer-btn');
    const answers = Object.entries(questionData.answers);
    
    answerButtons.forEach((btn, index) => {
        if (index < answers.length) {
            const [letter, text] = answers[index];
            btn.dataset.answer = letter;
            
            const letterSpan = btn.querySelector('.answer-letter');
            const textSpan = btn.querySelector('.answer-text');
            
            if (letterSpan) letterSpan.textContent = letter;
            if (textSpan) textSpan.textContent = text;
            
            btn.disabled = false;
            btn.className = 'answer-btn'; // Réinitialise les classes
            btn.style.display = 'flex'; // S'assure que le bouton est visible
        } else {
            btn.style.display = 'none'; // Cache les boutons inutilisés
        }
    });
    
    // Cache le feedback
    const feedback = document.getElementById('answerFeedback');
    if (feedback) {
        feedback.style.display = 'none';
    }
    
    // Démarre le timer
    const timeLimit = questionData.timeLimit || currentGame?.settings?.timePerQuestion || 15;
    startPlayerTimer(timeLimit);
}

// Sélectionne une réponse
function selectAnswer(answer) {
    if (selectedAnswer) {
        console.log('Réponse déjà sélectionnée');
        return; // Déjà répondu
    }
    
    console.log('Réponse sélectionnée:', answer);
    selectedAnswer = answer;
    
    // Arrête le timer
    if (window.playerTimer) {
        clearInterval(window.playerTimer);
        window.playerTimer = null;
    }
    
    // Met à jour l'affichage
    const answerButtons = document.querySelectorAll('.answer-btn');
    answerButtons.forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.answer === answer) {
            btn.classList.add('selected');
        }
    });
    
    // Soumet la réponse
    const timeRemaining = currentGame ? Math.max(0, currentGame.timeLeft || 0) : 0;
    let result = null;
    
    if (currentGame) {
        result = currentGame.submitAnswer(playerId, answer, timeRemaining);
        
        // Met à jour le score
        const currentPlayer = currentGame.players.get(playerId);
        if (currentPlayer) {
            document.getElementById('playerScore').textContent = currentPlayer.score;
        }
    }
    
    // Affiche un feedback immédiat
    showAnswerFeedback(result);
    
    // Passe à la question suivante après 3 secondes
    setTimeout(() => {
        proceedToNextQuestion();
    }, 3000);
}

// Affiche le feedback de la réponse
function showAnswerFeedback(result) {
    const feedback = document.getElementById('answerFeedback');
    const message = document.getElementById('feedbackMessage');
    
    if (result && result.correct) {
        message.innerHTML = `✅ Bonne réponse !<br>+${result.points} points`;
        feedback.style.background = '#4CAF50';
    } else {
        message.innerHTML = '❌ Mauvaise réponse';
        feedback.style.background = '#f44336';
    }
    
    feedback.style.display = 'block';
    feedback.style.color = 'white';
    feedback.style.padding = '15px';
    feedback.style.borderRadius = '8px';
    feedback.style.textAlign = 'center';
    feedback.style.marginTop = '20px';
}

// Démarre le timer du joueur
function startPlayerTimer(duration) {
    const timerFill = document.getElementById('timerFill');
    const timeDisplay = document.getElementById('timeRemaining');
    
    if (!timerFill || !timeDisplay) {
        console.error('Éléments timer non trouvés');
        return;
    }
    
    let timeLeft = duration;
    timerFill.style.width = '100%';
    timerFill.style.background = '#FF9800'; // Couleur initiale
    
    // Sauvegarde la référence du timer
    if (window.playerTimer) {
        clearInterval(window.playerTimer);
    }
    
    window.playerTimer = setInterval(() => {
        timeLeft--;
        timeDisplay.textContent = `${timeLeft}s`;
        
        // Met à jour la barre de progression
        const percentage = Math.max(0, (timeLeft / duration) * 100);
        timerFill.style.width = `${percentage}%`;
        
        // Change la couleur selon le temps restant
        if (timeLeft <= 5) {
            timerFill.style.background = '#f44336';
        } else if (timeLeft <= 10) {
            timerFill.style.background = '#FF9800';
        } else {
            timerFill.style.background = '#4CAF50';
        }
        
        if (timeLeft <= 0) {
            clearInterval(window.playerTimer);
            window.playerTimer = null;
            
            // Temps écoulé
            if (!selectedAnswer) {
                showTimeUp();
            }
            
            // Passe automatiquement à la question suivante après 3 secondes
            setTimeout(() => {
                proceedToNextQuestion();
            }, 3000);
        }
    }, 1000);
}

// Passe à la question suivante ou termine le jeu
function proceedToNextQuestion() {
    if (!currentGame) return;
    
    // Réinitialise la sélection pour la prochaine question
    selectedAnswer = null;
    
    // Cache le feedback
    const feedback = document.getElementById('answerFeedback');
    if (feedback) {
        feedback.style.display = 'none';
    }
    
    // Passe à la question suivante
    const nextQuestion = currentGame.nextQuestion();
    
    if (nextQuestion) {
        // Il y a une question suivante
        setTimeout(() => {
            showQuestion({
                index: currentGame.questionIndex - 1, // -1 car nextQuestion() a déjà incrémenté
                question: nextQuestion.question,
                answers: nextQuestion.answers,
                timeLimit: currentGame.settings.timePerQuestion
            });
        }, 1000);
    } else {
        // Fin du jeu
        setTimeout(() => {
            showFinalResults();
        }, 2000);
    }
}

// Affiche "temps écoulé"
function showTimeUp() {
    const answerButtons = document.querySelectorAll('.answer-btn');
    answerButtons.forEach(btn => {
        btn.disabled = true;
    });
    
    const feedback = document.getElementById('answerFeedback');
    const message = document.getElementById('feedbackMessage');
    
    if (message && feedback) {
        message.textContent = '⏰ Temps écoulé !';
        feedback.style.background = '#FF9800';
        feedback.style.color = 'white';
        feedback.style.padding = '15px';
        feedback.style.borderRadius = '8px';
        feedback.style.textAlign = 'center';
        feedback.style.marginTop = '20px';
        feedback.style.display = 'block';
    }
}

// Affiche les résultats de la question
function showQuestionResults(results) {
    if (!results || !currentGame) return;
    
    const answerButtons = document.querySelectorAll('.answer-btn');
    const correctAnswer = results.correctAnswer;
    
    // Affiche la bonne réponse
    answerButtons.forEach(btn => {
        if (btn.dataset.answer === correctAnswer) {
            btn.classList.remove('selected');
            btn.classList.add('correct');
        } else if (btn.dataset.answer === selectedAnswer && selectedAnswer !== correctAnswer) {
            btn.classList.add('incorrect');
        }
    });
    
    // Met à jour le score
    const currentPlayer = currentGame.players.get(playerId);
    if (currentPlayer) {
        document.getElementById('playerScore').textContent = currentPlayer.score;
    }
}

// Affiche les résultats finaux
function showFinalResults(results) {
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('resultsScreen').style.display = 'block';
    
    if (!currentGame) return;
    
    const currentPlayer = currentGame.players.get(playerId);
    if (!currentPlayer) return;
    
    // Affiche les résultats personnels
    document.getElementById('finalScore').textContent = currentPlayer.score;
    
    const correctAnswers = currentPlayer.answers.filter(answer => {
        const question = currentGame.questions.find(q => q.id === answer.questionId);
        return question && answer.answer === question.correct;
    }).length;
    
    document.getElementById('correctAnswers').textContent = correctAnswers;
    
    // Calcule la position
    const leaderboard = currentGame.getLeaderboard();
    const playerRank = leaderboard.find(p => p.id === playerId);
    if (playerRank) {
        document.getElementById('playerRank').textContent = `${playerRank.rank}/${leaderboard.length}`;
    }
    
    // Affiche le classement
    showRanking(leaderboard);
}

// Affiche le classement
function showRanking(leaderboard) {
    const container = document.getElementById('rankingList');
    container.innerHTML = '';
    
    leaderboard.slice(0, 10).forEach((player, index) => {
        const div = document.createElement('div');
        div.className = 'ranking-item';
        div.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            margin: 5px 0;
            background: ${player.id === playerId ? '#e8f5e8' : '#f9f9f9'};
            border-radius: 8px;
            border-left: 4px solid ${index < 3 ? '#4CAF50' : '#ddd'};
        `;
        
        const medals = ['🥇', '🥈', '🥉'];
        const medal = index < 3 ? medals[index] : `#${index + 1}`;
        
        div.innerHTML = `
            <span class="rank">${medal}</span>
            <span class="name">${player.name}${player.id === playerId ? ' (Vous)' : ''}</span>
            <span class="score">${player.score} pts</span>
        `;
        
        container.appendChild(div);
    });
}

// Affiche une erreur
function showError(message) {
    document.getElementById('connectionScreen').style.display = 'none';
    document.getElementById('waitingScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('resultsScreen').style.display = 'none';
    document.getElementById('errorScreen').style.display = 'block';
    
    document.getElementById('errorMessage').textContent = message;
    Utils.showMessage(message, 'error');
}

// Retour à l'accueil
function goHome() {
    // Nettoie le localStorage
    Utils.removeFromStorage('playerName');
    Utils.removeFromStorage('gameCode');
    Utils.goHome();
}

// Simulation du flux de jeu pour les tests - SUPPRIMÉE
// Les joueurs n'initient pas le jeu, ils attendent l'hôte

// Cette fonction est gardée pour compatibilité mais ne fait rien
function simulateGameFlow() {
    console.log('Les joueurs ne démarrent pas le jeu - en attente de l\'hôte');
    // Ne fait rien - seul l'hôte peut démarrer
}

// Cette fonction est gardée pour compatibilité mais ne fait rien  
function simulateQuestions() {
    console.log('Les joueurs ne génèrent pas de questions - en attente de l\'hôte');
    // Ne fait rien - seul l'hôte envoie les questions
}

// Gestion de la déconnexion
window.addEventListener('beforeunload', function() {
    if (currentGame && playerId) {
        currentGame.removePlayer(playerId);
    }
});