// Système WebSocket pour la communication temps réel
// Ce fichier est optionnel et peut être utilisé quand un serveur WebSocket est disponible

class WebSocketManager {
    constructor(url) {
        this.url = url;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.eventHandlers = new Map();
        this.isConnected = false;
    }

    // Connexion au serveur WebSocket
    connect() {
        try {
            this.socket = new WebSocket(this.url);
            this.setupEventListeners();
        } catch (error) {
            console.error('Erreur de connexion WebSocket:', error);
            this.handleConnectionError();
        }
    }

    // Configure les écouteurs d'événements WebSocket
    setupEventListeners() {
        if (!this.socket) return;

        this.socket.onopen = (event) => {
            console.log('Connexion WebSocket établie');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.emit('connected', event);
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Erreur parsing message WebSocket:', error);
            }
        };

        this.socket.onclose = (event) => {
            console.log('Connexion WebSocket fermée:', event.code, event.reason);
            this.isConnected = false;
            this.emit('disconnected', event);
            
            // Tentative de reconnexion automatique
            if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.attemptReconnect();
            }
        };

        this.socket.onerror = (error) => {
            console.error('Erreur WebSocket:', error);
            this.emit('error', error);
            this.handleConnectionError();
        };
    }

    // Gère les messages reçus
    handleMessage(data) {
        const { type, payload } = data;
        this.emit(type, payload);
    }

    // Envoie un message
    send(type, payload) {
        if (!this.isConnected || !this.socket) {
            console.warn('WebSocket non connecté, impossible d\'envoyer:', type);
            return false;
        }

        try {
            const message = JSON.stringify({ type, payload });
            this.socket.send(message);
            return true;
        } catch (error) {
            console.error('Erreur envoi message WebSocket:', error);
            return false;
        }
    }

    // Tentative de reconnexion
    attemptReconnect() {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${delay}ms`);
        
        setTimeout(() => {
            this.connect();
        }, delay);
    }

    // Gère les erreurs de connexion
    handleConnectionError() {
        // Basculer vers le mode simulation si WebSocket échoue
        console.log('Basculement vers le mode simulation');
        this.emit('fallback-to-simulation');
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
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Erreur dans le handler ${event}:`, error);
                }
            });
        }
    }

    // Ferme la connexion
    disconnect() {
        if (this.socket) {
            this.socket.close(1000, 'Déconnexion volontaire');
            this.socket = null;
        }
        this.isConnected = false;
    }
}

// Classe spécialisée pour le jeu de quiz
class QuizWebSocketClient extends WebSocketManager {
    constructor(url) {
        super(url);
        this.gameCode = null;
        this.playerId = null;
        this.playerType = null; // 'host' ou 'player'
    }

    // Méthodes spécifiques au jeu

    // Crée une partie (hôte)
    createGame(gameCode, settings) {
        this.gameCode = gameCode;
        this.playerType = 'host';
        return this.send('create-game', {
            gameCode,
            settings,
            hostId: this.playerId
        });
    }

    // Rejoint une partie (joueur)
    joinGame(gameCode, playerName) {
        this.gameCode = gameCode;
        this.playerType = 'player';
        return this.send('join-game', {
            gameCode,
            playerName,
            playerId: this.playerId
        });
    }

    // Démarre la partie (hôte)
    startGame() {
        if (this.playerType !== 'host') return false;
        return this.send('start-game', {
            gameCode: this.gameCode
        });
    }

    // Envoie une réponse (joueur)
    submitAnswer(answer, timeRemaining) {
        if (this.playerType !== 'player') return false;
        return this.send('submit-answer', {
            gameCode: this.gameCode,
            playerId: this.playerId,
            answer,
            timeRemaining
        });
    }

    // Passe à la question suivante (hôte)
    nextQuestion() {
        if (this.playerType !== 'host') return false;
        return this.send('next-question', {
            gameCode: this.gameCode
        });
    }

    // Quitte la partie
    leaveGame() {
        const success = this.send('leave-game', {
            gameCode: this.gameCode,
            playerId: this.playerId
        });
        
        this.gameCode = null;
        this.playerType = null;
        
        return success;
    }
}

// Factory pour créer le bon type de client
class WebSocketFactory {
    static createClient() {
        // Vérifie si WebSocket est disponible
        if (typeof WebSocket === 'undefined') {
            console.warn('WebSocket non supporté, utilisation du mode simulation');
            return null;
        }

        // Vérifie si une URL WebSocket est configurée
        if (!GameConfig.WEBSOCKET_URL || GameConfig.WEBSOCKET_URL.includes('your-websocket-server')) {
            console.log('Aucun serveur WebSocket configuré, utilisation du mode simulation');
            return null;
        }

        try {
            return new QuizWebSocketClient(GameConfig.WEBSOCKET_URL);
        } catch (error) {
            console.error('Erreur création client WebSocket:', error);
            return null;
        }
    }
}

// Adapter pour basculer entre WebSocket et simulation
class GameCommunicationAdapter {
    constructor() {
        this.wsClient = WebSocketFactory.createClient();
        this.simulationMode = !this.wsClient;
        this.fallbackComm = new SimpleGameCommunication();
        
        if (this.wsClient) {
            this.setupWebSocketFallback();
        }
    }

    // Configure le fallback vers la simulation
    setupWebSocketFallback() {
        this.wsClient.on('fallback-to-simulation', () => {
            console.log('Basculement vers le mode simulation');
            this.simulationMode = true;
            Utils.showMessage('Mode hors ligne activé', 'warning');
        });

        this.wsClient.on('error', () => {
            this.simulationMode = true;
        });

        // Tentative de connexion
        this.wsClient.connect();
    }

    // Interface unifiée - crée une partie
    createGame(gameCode, hostId) {
        if (this.simulationMode) {
            return this.fallbackComm.createGame(gameCode, hostId);
        } else if (this.wsClient) {
            this.wsClient.playerId = hostId;
            this.wsClient.createGame(gameCode, {});
            // Retourne un objet game simulé pour compatibilité
            return this.fallbackComm.createGame(gameCode, hostId);
        }
    }

    // Interface unifiée - rejoint une partie
    joinGame(gameCode, playerId, playerName) {
        if (this.simulationMode) {
            return this.fallbackComm.joinGame(gameCode, playerId, playerName);
        } else if (this.wsClient) {
            this.wsClient.playerId = playerId;
            this.wsClient.joinGame(gameCode, playerName);
            // Retourne un objet player simulé pour compatibilité
            return this.fallbackComm.joinGame(gameCode, playerId, playerName);
        }
    }

    // Interface unifiée - obtient une partie
    getGame(gameCode) {
        return this.fallbackComm.getGame(gameCode);
    }

    // Interface unifiée - système d'événements
    on(event, handler) {
        // Écoute sur les deux systèmes
        this.fallbackComm.on(event, handler);
        if (this.wsClient) {
            this.wsClient.on(event, handler);
        }
    }

    emit(event, data) {
        this.fallbackComm.emit(event, data);
        if (this.wsClient && !this.simulationMode) {
            // Mapper les événements vers WebSocket si nécessaire
            this.mapEventToWebSocket(event, data);
        }
    }

    // Mappe les événements locaux vers WebSocket
    mapEventToWebSocket(event, data) {
        switch (event) {
            case 'playerJoined':
                // Déjà géré par WebSocket
                break;
            case 'gameStarted':
                if (this.wsClient.playerType === 'host') {
                    this.wsClient.startGame();
                }
                break;
            // Ajouter d'autres mappings si nécessaire
        }
    }

    // Nettoyage
    disconnect() {
        if (this.wsClient) {
            this.wsClient.disconnect();
        }
    }
}

// Remplace l'instance globale par l'adapter
if (typeof gameComm !== 'undefined') {
    // Sauvegarde l'ancienne instance si elle existe
    window.gameCommBackup = gameComm;
}

// Crée la nouvelle instance adaptée
window.gameComm = new GameCommunicationAdapter();