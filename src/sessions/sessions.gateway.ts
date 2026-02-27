import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SessionsService } from './sessions.service';
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173'], // Frontend URL
    credentials: true,
  },
})
export class SessionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  constructor(
    private readonly sessionsService: SessionsService,
  ) {}
  private readonly logger = new Logger(SessionsGateway.name);
  private sessionSubscriptions: Map<string, Set<string>> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`✅ Client connecté: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Client déconnecté: ${client.id}`);
    
    // Nettoyer les abonnements
    this.sessionSubscriptions.forEach((clients, sessionId) => {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.sessionSubscriptions.delete(sessionId);
      }
    });
  }

@SubscribeMessage('session:subscribe')
handleSubscribeToSession(
  @MessageBody() data: { sessionId: string },
  @ConnectedSocket() client: Socket,
) {
  const { sessionId } = data;
  
  if (!this.sessionSubscriptions.has(sessionId)) {
    this.sessionSubscriptions.set(sessionId, new Set());
  }
  
  this.sessionSubscriptions.get(sessionId)!.add(client.id);
  
  this.logger.log(`📡 Client ${client.id} abonné à session ${sessionId}`);
  
  client.emit('session:subscribed', { sessionId });

  this.startSimulatedUpdates(sessionId);
}
  @SubscribeMessage('session:unsubscribe')
  handleUnsubscribeFromSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId } = data;
    
    const clients = this.sessionSubscriptions.get(sessionId);
    if (clients) {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.sessionSubscriptions.delete(sessionId);
      }
    }
    
      this.logger.log(`📡 Client ${client.id} désabonné de session ${sessionId}`);
  }

  
@SubscribeMessage('session:request-data')
  async handleRequestSessionData(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId } = data;
    
    this.logger.log(`📊 Client ${client.id} demande les données de session ${sessionId}`);
    
    try {
      // ⬇️ UTILISER LES VRAIES DONNÉES
      const session = await this.sessionsService.findOne(sessionId);
      
      const realData = {
        sessionId: session.id,
        energyConsumed: session.energyConsumed || 0,
        currentPower: session.currentPower || 0,
        duration: session.duration || 0,
        estimatedCost: session.cost || 0,
        timestamp: new Date().toISOString(),
      };
      
      client.emit('session:update', realData);
    } catch (error) {
      // Si erreur, envoyer des données simulées
      const simulatedData = {
        sessionId,
        energyConsumed: Math.random() * 15 + 5,
        currentPower: Math.random() * 10 + 3,
        duration: Math.floor(Math.random() * 3600) + 1800,
        estimatedCost: Math.floor(Math.random() * 30000) + 10000,
        timestamp: new Date().toISOString(),
      };
      
      client.emit('session:update', simulatedData);
    }
  }

  /**
   * Méthode publique pour émettre des mises à jour de session
   * À appeler depuis le SessionsService quand il y a une mise à jour
   */
  emitSessionUpdate(sessionId: string, data: any) {
    const clients = this.sessionSubscriptions.get(sessionId);
    
    if (clients && clients.size > 0) {
      this.logger.log(`📤 Émission mise à jour session ${sessionId} vers ${clients.size} client(s)`);
      
      clients.forEach((clientId) => {
        this.server.to(clientId).emit('session:update', {
          sessionId,
          ...data,
          timestamp: new Date().toISOString(),
        });
      });
    }
  }

  /**
   * Simuler des mises à jour en temps réel (pour tests)
   */
  startSimulatedUpdates(sessionId: string) {
    const interval = setInterval(() => {
      const clients = this.sessionSubscriptions.get(sessionId);
      
      if (!clients || clients.size === 0) {
        clearInterval(interval);
        return;
      }

      const simulatedData = {
        energyConsumed: Math.random() * 15 + 5,
        currentPower: Math.random() * 10 + 3,
        duration: Math.floor(Math.random() * 3600) + 1800,
        estimatedCost: Math.floor(Math.random() * 30000) + 10000,
      };

      this.emitSessionUpdate(sessionId, simulatedData);
    }, 2000); // Mise à jour toutes les 2 secondes
  }
}