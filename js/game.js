// Configuration du jeu
const GameConfig = {
    POINTS_CORRECT: 100,
    POINTS_SPEED_BONUS: 50,
    DEFAULT_QUESTION_TIME: 15,
    CONNECTION_TIMEOUT: 30000,
    WEBSOCKET_URL: 'wss://your-websocket-server.com' // À remplacer par votre serveur WebSocket
};

// États du jeu
const GameState = {
    WAITING: 'waiting',
    PLAYING: 'playing',
    SHOWING_RESULTS: 'showing_results',
    FINISHED: 'finished'
};

// Classe principale du jeu
class Game {
    constructor() {
        this.gameCode = null;
        this.players = new Map();
        this.currentQuestion = null;
        this.questionIndex = 0;
        this.questions = [];
        this.state = GameState.WAITING;
        this.settings = {
            questionCount: 15,
            timePerQuestion: 15
        };
        this.timer = null;
        this.timeLeft = 0;
    }

    // Génère un code de partie unique
    generateGameCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Charge les questions depuis le fichier JSON
    async loadQuestions() {
        try {
            const response = await fetch('data/questions.json');
            const data = await response.json();
            this.questions = this.shuffleArray(data.questions).slice(0, this.settings.questionCount);
            return true;
        } catch (error) {
            console.error('Erreur lors du chargement des questions:', error);
            return false;
        }
    }

    // Mélange un tableau (Fisher-Yates)
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Ajoute un joueur
    addPlayer(playerId, playerName) {
        const player = {
            id: playerId,
            name: playerName,
            score: 0,
            answers: [],
            connected: true,
            joinTime: Date.now()
        };
        this.players.set(playerId, player);
        return player;
    }

    // Supprime un joueur
    removePlayer(playerId) {
        return this.players.delete(playerId);
    }

    // Obtient la question courante
    getCurrentQuestion() {
        if (this.questionIndex < this.questions.length) {
            return this.questions[this.questionIndex];
        }
        return null;
    }

    // Passe à la question suivante
    nextQuestion() {
        this.questionIndex++;
        this.currentQuestion = this.getCurrentQuestion();
        return this.currentQuestion;
    }

    // Enregistre une réponse de joueur
    submitAnswer(playerId, answer, timeRemaining) {
        const player = this.players.get(playerId);
        if (!player || !this.currentQuestion) return false;

        const answerData = {
            questionId: this.currentQuestion.id,
            answer: answer,
            timeRemaining: timeRemaining,
            timestamp: Date.now()
        };

        player.answers.push(answerData);

        // Calcul des points
        if (answer === this.currentQuestion.correct) {
            let points = GameConfig.POINTS_CORRECT;
            
            // Bonus de rapidité
            const speedRatio = timeRemaining / this.settings.timePerQuestion;
            if (speedRatio > 0.7) {
                points += GameConfig.POINTS_SPEED_BONUS;
            }
            
            player.score += points;
            return { correct: true, points: points };
        }
        
        return { correct: false, points: 0 };
    }

    // Obtient le classement des joueurs
    getLeaderboard() {
        return Array.from(this.players.values())
            .sort((a, b) => b.score - a.score)
            .map((player, index) => ({
                ...player,
                rank: index + 1
            }));
    }

    // Vérifie si tous les joueurs ont répondu
    allPlayersAnswered() {
        if (this.players.size === 0) return false;
        
        for (let player of this.players.values()) {
            if (!player.connected) continue;
            
            const hasAnswered = player.answers.some(
                answer => answer.questionId === this.currentQuestion.id
            );
            
            if (!hasAnswered) return false;
        }
        
        return true;
    }

    // Démarre le timer
    startTimer(duration, onTick, onComplete) {
        this.timeLeft = duration;
        
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        // Sauvegarde la référence dans l'instance
        this.timer = setInterval(() => {
            this.timeLeft--;
            
            if (onTick) {
                onTick(this.timeLeft);
            }
            
            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                this.timer = null;
                if (onComplete) {
                    onComplete();
                }
            }
        }, 1000);
        
        // Appelle onTick immédiatement pour l'affichage initial
        if (onTick) {
            onTick(this.timeLeft);
        }
    }

    // Arrête le timer
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    // Réinitialise le jeu
    reset() {
        this.stopTimer();
        this.questionIndex = 0;
        this.currentQuestion = null;
        this.state = GameState.WAITING;
        
        // Remet à zéro les scores des joueurs
        for (let player of this.players.values()) {
            player.score = 0;
            player.answers = [];
        }
    }
}

// Système de communication simplifié (sans WebSocket pour le moment)
class SimpleGameCommunication {
    constructor() {
        this.games = new Map();
        this.eventHandlers = new Map();
    }

    // Crée une nouvelle partie
    createGame(gameCode, hostId) {
        const game = new Game();
        game.gameCode = gameCode;
        game.hostId = hostId;
        this.games.set(gameCode, game);
        return game;
    }

    // Rejoint une partie
    joinGame(gameCode, playerId, playerName) {
        console.log('Tentative de rejoindre la partie:', gameCode);
        const game = this.games.get(gameCode);
        
        if (game) {
            if (game.state === GameState.WAITING || game.state === GameState.PLAYING) {
                const player = game.addPlayer(playerId, playerName);
                console.log('Joueur ajouté:', playerName, 'Total joueurs:', game.players.size);
                return player;
            } else {
                console.log('Partie dans un état non valide:', game.state);
                return null;
            }
        } else {
            console.log('Partie non trouvée pour le code:', gameCode);
            return null;
        }
    }

    // Obtient une partie
    getGame(gameCode) {
        return this.games.get(gameCode);
    }

    // Supprime une partie
    removeGame(gameCode) {
        const game = this.games.get(gameCode);
        if (game) {
            game.stopTimer();
        }
        return this.games.delete(gameCode);
    }

    // Système d'événements
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    emit(event, data) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => handler(data));
        }
    }
}

// Instance globale pour la communication
const gameComm = new SimpleGameCommunication();

// Utilitaires
const Utils = {
    // Génère un ID unique
    generateId() {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    },

    // Formatage du temps
    formatTime(seconds) {
        if (seconds < 10) {
            return `0${seconds}`;
        }
        return seconds.toString();
    },

    // Sauvegarde dans le localStorage
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Erreur sauvegarde localStorage:', error);
        }
    },

    // Lecture depuis le localStorage
    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Erreur lecture localStorage:', error);
            return null;
        }
    },

    // Supprime du localStorage
    removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Erreur suppression localStorage:', error);
        }
    },

    // Affichage des messages
    showMessage(message, type = 'info') {
        // Création d'un système de notification simple
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#4CAF50';
                break;
            case 'error':
                notification.style.backgroundColor = '#f44336';
                break;
            case 'warning':
                notification.style.backgroundColor = '#FF9800';
                break;
            default:
                notification.style.backgroundColor = '#2196F3';
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    },

    // Navigation
    goHome() {
        window.location.href = 'index.html';
    }
};

// Style pour les animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);