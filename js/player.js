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
        // Tente de rejoindre la partie
        const player = gameComm.joinGame(gameCode, playerId, playerName);
        
        if (player) {
            currentGame = gameComm.getGame(gameCode);
            setupPlayerEvents();
            showWaitingScreen();
            Utils.showMessage('Connexion réussie !', 'success');
        } else {
            showError('Impossible de rejoindre la partie. Vérifiez le code.');
        }
    } catch (error) {
        console.error('Erreur de connexion:', error);
        showError('Erreur de connexion');
    }
}

// Configure les événements du joueur
function setupPlayerEvents() {
    // Écoute les événements du jeu
    gameComm.on('gameStarted', () => {
        showGameScreen();
    });
    
    gameComm.on('newQuestion', (questionData) => {
        showQuestion(questionData);
    });
    
    gameComm.on('questionEnded', (results) => {
        showQuestionResults(results);
    });
    
    gameComm.on('gameEnded', (finalResults) => {
        showFinalResults(finalResults);
    });
    
    // Simulation d'événements pour les tests
    setTimeout(() => {
        if (currentGame && currentGame.state === GameState.WAITING) {
            simulateGameFlow();
        }
    }, 5000);
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
    if (!questionData) return;
    
    // Réinitialise la sélection
    selectedAnswer = null;
    
    // Met à jour l'affichage
    document.getElementById('questionNumber').textContent = questionData.index + 1;
    document.getElementById('questionDisplay').textContent = questionData.question;
    
    // Affiche les réponses
    const answerButtons = document.querySelectorAll('.answer-btn');
    const answers = Object.entries(questionData.answers);
    
    answerButtons.forEach((btn, index) => {
        if (index < answers.length) {
            const [letter, text] = answers[index];
            btn.dataset.answer = letter;
            btn.querySelector('.answer-letter').textContent = letter;
            btn.querySelector('.answer-text').textContent = text;
            btn.disabled = false;
            btn.className = 'answer-btn'; // Réinitialise les classes
        }
    });
    
    // Cache le feedback
    document.getElementById('answerFeedback').style.display = 'none';
    
    // Démarre le timer
    startPlayerTimer(questionData.timeLimit || 15);
}

// Sélectionne une réponse
function selectAnswer(answer) {
    if (selectedAnswer) return; // Déjà répondu
    
    selectedAnswer = answer;
    
    // Met à jour l'affichage
    const answerButtons = document.querySelectorAll('.answer-btn');
    answerButtons.forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.answer === answer) {
            btn.classList.add('selected');
        }
    });
    
    // Soumet la réponse
    const timeRemaining = currentGame ? currentGame.timeLeft : 0;
    const result = currentGame.submitAnswer(playerId, answer, timeRemaining);
    
    // Met à jour le score
    if (result) {
        const currentPlayer = currentGame.players.get(playerId);
        if (currentPlayer) {
            document.getElementById('playerScore').textContent = currentPlayer.score;
        }
    }
    
    // Affiche un feedback immédiat
    showAnswerFeedback(result);
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
    
    let timeLeft = duration;
    timerFill.style.width = '100%';
    
    const timer = setInterval(() => {
        timeLeft--;
        timeDisplay.textContent = `${timeLeft}s`;
        
        // Met à jour la barre de progression
        const percentage = (timeLeft / duration) * 100;
        timerFill.style.width = `${percentage}%`;
        
        // Change la couleur selon le temps restant
        if (timeLeft <= 5) {
            timerFill.style.background = '#f44336';
        } else if (timeLeft <= 10) {
            timerFill.style.background = '#FF9800';
        }
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            // Temps écoulé
            if (!selectedAnswer) {
                showTimeUp();
            }
        }
    }, 1000);
}

// Affiche "temps écoulé"
function showTimeUp() {
    const answerButtons = document.querySelectorAll('.answer-btn');
    answerButtons.forEach(btn => {
        btn.disabled = true;
    });
    
    const feedback = document.getElementById('answerFeedback');
    const message = document.getElementById('feedbackMessage');
    
    message.textContent = '⏰ Temps écoulé !';
    feedback.style.background = '#FF9800';
    feedback.style.color = 'white';
    feedback.style.padding = '15px';
    feedback.style.borderRadius = '8px';
    feedback.style.textAlign = 'center';
    feedback.style.marginTop = '20px';
    feedback.style.display = 'block';
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

// Simulation du flux de jeu pour les tests
function simulateGameFlow() {
    // Simule le démarrage du jeu
    setTimeout(() => {
        if (currentGame) {
            currentGame.state = GameState.PLAYING;
            showGameScreen();
            simulateQuestions();
        }
    }, 3000);
}

// Simule les questions pour les tests
function simulateQuestions() {
    if (!currentGame || !currentGame.questions.length) return;
    
    let questionIndex = 0;
    
    function showNextSimulatedQuestion() {
        if (questionIndex >= currentGame.questions.length) {
            // Fin du jeu
            setTimeout(() => {
                showFinalResults();
            }, 2000);
            return;
        }
        
        const question = currentGame.questions[questionIndex];
        currentGame.questionIndex = questionIndex;
        currentGame.currentQuestion = question;
        
        showQuestion({
            index: questionIndex,
            question: question.question,
            answers: question.answers,
            timeLimit: currentGame.settings.timePerQuestion
        });
        
        // Passe à la question suivante après le temps imparti + délai
        setTimeout(() => {
            questionIndex++;
            showNextSimulatedQuestion();
        }, (currentGame.settings.timePerQuestion + 3) * 1000);
    }
    
    showNextSimulatedQuestion();
}

// Gestion de la déconnexion
window.addEventListener('beforeunload', function() {
    if (currentGame && playerId) {
        currentGame.removePlayer(playerId);
    }
});