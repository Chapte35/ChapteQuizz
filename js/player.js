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
        
        // Pour la version de test, on crée automatiquement une partie si elle n'existe pas
        let game = gameComm.getGame(gameCode);
        
        if (!game) {
            console.log('Partie non trouvée, création d\'une partie de test');
            // Crée une partie de test
            game = gameComm.createGame(gameCode, 'host-test');
            
            // Charge les questions pour la partie de test
            loadQuestionsForGame(game);
        }
        
        if (game) {
            // Tente de rejoindre la partie
            const player = game.addPlayer(playerId, playerName);
            
            if (player) {
                currentGame = game;
                setupPlayerEvents();
                showWaitingScreen();
                Utils.showMessage('Connexion réussie !', 'success');
                
                console.log('Connexion réussie, joueurs dans la partie:', game.players.size);
            } else {
                showError('Impossible de rejoindre la partie.');
            }
        } else {
            showError('Partie introuvable. Vérifiez le code.');
        }
    } catch (error) {
        console.error('Erreur de connexion:', error);
        showError('Erreur de connexion: ' + error.message);
    }
}

// Charge les questions pour une partie
async function loadQuestionsForGame(game) {
    try {
        const questionsLoaded = await game.loadQuestions();
        if (questionsLoaded) {
            console.log('Questions chargées:', game.questions.length);
        } else {
            console.error('Erreur lors du chargement des questions');
        }
    } catch (error) {
        console.error('Erreur chargement questions:', error);
    }
}

// Configure les événements du joueur
function setupPlayerEvents() {
    console.log('Configuration des événements joueur');
    
    // Écoute les événements du jeu
    gameComm.on('gameStarted', () => {
        console.log('Événement: jeu démarré');
        showGameScreen();
    });
    
    gameComm.on('newQuestion', (questionData) => {
        console.log('Événement: nouvelle question', questionData);
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
    
    // Démarre automatiquement le jeu après 5 secondes pour les tests
    setTimeout(() => {
        if (currentGame && currentGame.state === GameState.WAITING) {
            console.log('Démarrage automatique du jeu de test');
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

// Simulation du flux de jeu pour les tests
function simulateGameFlow() {
    console.log('Démarrage simulation du jeu');
    
    // Simule le démarrage du jeu
    setTimeout(() => {
        if (currentGame) {
            currentGame.state = GameState.PLAYING;
            showGameScreen();
            
            // Démarre les questions après un court délai
            setTimeout(() => {
                simulateQuestions();
            }, 1000);
        }
    }, 3000);
}

// Simule les questions pour les tests
function simulateQuestions() {
    if (!currentGame || !currentGame.questions.length) {
        console.error('Pas de jeu ou de questions disponibles');
        return;
    }
    
    console.log('Début des questions simulées');
    
    // Démarre la première question
    currentGame.questionIndex = 0;
    const firstQuestion = currentGame.questions[0];
    currentGame.currentQuestion = firstQuestion;
    
    showQuestion({
        index: 0,
        question: firstQuestion.question,
        answers: firstQuestion.answers,
        timeLimit: currentGame.settings.timePerQuestion
    });
}

// Gestion de la déconnexion
window.addEventListener('beforeunload', function() {
    if (currentGame && playerId) {
        currentGame.removePlayer(playerId);
    }
});